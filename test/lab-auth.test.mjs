import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { COOKIE_NAME, SESSION_SECONDS, clearLoginLimit, cookieOptions, createSession, getAuthConfig, hashPassword, isProtectedPath, isSameOrigin, loginLimit, readLoginForm, safeReturnTo, verifyCredentials, verifySession } from "../lib/lab-auth.server.mjs";

const password = "test-only-password-do-not-use-in-production";
const passwordHash = await hashPassword(password);
const config = getAuthConfig({ LAB_ADMIN_USERNAME: "carry", LAB_ADMIN_PASSWORD_HASH: passwordHash, LAB_SESSION_SECRET: randomBytes(32).toString("hex") });

test("未配置或错误配置时关闭入口，没有默认密码", () => {
  assert.equal(getAuthConfig({}), null);
  assert.equal(getAuthConfig({ LAB_ADMIN_PASSWORD_HASH: passwordHash, LAB_SESSION_SECRET: "short" }), null);
  assert.equal(getAuthConfig({ LAB_ADMIN_PASSWORD_HASH: "plain-password", LAB_SESSION_SECRET: "a".repeat(32) }), null);
  assert.equal(verifySession("", null), null);
});
test("使用加盐哈希校验管理员密码，拒绝错误账号及密码", async () => {
  assert.equal(await verifyCredentials("carry", password, config), true);
  assert.equal(await verifyCredentials("visitor", password, config), false);
  assert.equal(await verifyCredentials("carry", "incorrect-password", config), false);
  assert.equal(await verifyCredentials("carry", "", config), false);
  assert.notEqual(await hashPassword(password), passwordHash);
});
test("会话需服务器签名：篡改、过期、伪造及轮换后均无效", async () => {
  const now = 1000, token = createSession(config, now);
  assert.equal(verifySession(token, config, now + 1).username, "carry");
  assert.equal(verifySession(token + "x", config, now), null);
  assert.equal(verifySession(token, config, now + SESSION_SECONDS), null);
  assert.equal(verifySession(token, config, now - 100), null);
  assert.equal(verifySession("admin=true", config, now), null);
  assert.equal(verifySession(token, { ...config, secret: randomBytes(32).toString("hex") }, now), null);
  const rotated = getAuthConfig({ LAB_ADMIN_PASSWORD_HASH: await hashPassword("rotated-test-password-only"), LAB_SESSION_SECRET: config.secret });
  assert.equal(verifySession(token, rotated, now), null);
});
test("管理员 cookie 不暴露给前端，生产 HTTPS、安全同站策略、限定有效期", () => {
  const options = cookieOptions(true);
  assert.equal(options.httpOnly, true); assert.equal(options.secure, true);
  assert.equal(options.sameSite, "strict"); assert.equal(options.maxAge, SESSION_SECONDS);
  assert.equal(options.path, "/"); assert.ok(COOKIE_NAME);
});
test("限制登录回跳，阻止外站与路径穿越", () => {
  assert.equal(safeReturnTo("/lab?series=1"), "/lab?series=1");
  for (const value of ["https://evil.example", "//evil.example", "/lab/../", "/lab/%2e%2e/admin", "/lab-assets/app.js", "/login", null]) assert.equal(safeReturnTo(value), "/lab");
});
test("保护页面、资源及百分号编码别名，公开主页不受影响", () => {
  for (const p of ["/lab", "/lab/", "/lab-assets/app.js", "/lab%2Dassets/app.js", "/lab-assets%2Fapp.js", "/lab%252Dassets/model.mjs", "/images/../lab-assets/index.html"]) assert.equal(isProtectedPath(p), true, p);
  for (const p of ["/", "/admin/login", "/images/photo.jpg", "/_next/static/test.js", "/laboratory"]) assert.equal(isProtectedPath(p), false, p);
});
test("登录与退出均拒绝跨站请求，表单体有大小限制", async () => {
  const req = new Request("https://www.carryz.top/api/lab-auth/login", { method: "POST", headers: { origin: "https://www.carryz.top", "content-type": "application/x-www-form-urlencoded" }, body: "username=carry&password=test" });
  assert.equal(isSameOrigin(req), true);assert.equal((await readLoginForm(req)).get("username"), "carry");
  assert.equal(isSameOrigin(new Request(req.url, { headers: { origin: "https://evil.example" } })), false);
  assert.equal(isSameOrigin(new Request(req.url)), false);
  const large = new Request(req.url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "password=" + "x".repeat(5000) });
  await assert.rejects(readLoginForm(large), /large/);
});
test("失败尝试受限且成功可清除限制", () => {
  const key = "unit-test";clearLoginLimit(key);
  for (let i = 0; i < 8; i++) assert.equal(loginLimit(key, 1000).allowed, true);
  assert.equal(loginLimit(key, 1000).allowed, false);
  assert.equal(loginLimit(key, 1000 + 15 * 60 * 1000).allowed, true);clearLoginLimit(key);
});
