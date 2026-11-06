import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../lib/lab-auth.server.mjs";
import { initializeCredentialStore } from "../lib/lab-credential-store.server.mjs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Explicitly fictional fixture. Never use this account on the public website.
const password = "fixture-only-not-a-real-password";
const passwordHash = await hashPassword(password);
const configured = !process.argv.includes("--unconfigured");
const testDir = await mkdtemp(join(tmpdir(), "carry-auth-http-"));
const authEnv = { NODE_ENV: "production", LAB_ADMIN_USERNAME: "fixture-admin", LAB_ADMIN_PASSWORD_HASH: configured ? passwordHash : "", LAB_SESSION_SECRET: configured ? randomBytes(32).toString("hex") : "", LAB_AUTH_STORE_MODE: configured ? "file" : "environment", LAB_AUTH_LOCAL_FILE: join(testDir, "auth.json"), LAB_AUTH_INITIALIZE: "1", VERCEL: "" };
if (configured) await initializeCredentialStore(authEnv);
const port = configured ? 3179 : 3180;
const origin = `http://localhost:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  cwd: new URL("../", import.meta.url),
  env: { ...process.env, ...authEnv },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stdout.on("data", data => { output += data; });
server.stderr.on("data", data => { output += data; });
const request = (path, options = {}) => fetch(origin + path, { redirect: "manual", ...options });
const form = (values, site = origin) => ({ method: "POST", headers: { origin: site, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(values) });
const location = response => new URL(response.headers.get("location"), origin);
try {
  for (let i = 0; ; i++) {
    try { await request("/"); break; } catch {
      if (i > 100 || server.exitCode !== null) throw new Error(`Fixture server did not start: ${output}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  assert.equal((await request("/")).status, 200);
  let response = await request("/lab");
  assert.equal(response.status, 307);
  assert.equal(location(response).pathname, "/admin/login");
  assert.equal((await request("/admin/password")).status, 307);
  assert.match(response.headers.get("cache-control"), /no-store/);
  for (const path of ["/lab-assets/index.html", "/lab-assets/app.js", "/lab-assets/model.mjs", "/lab-assets/batch.mjs", "/lab-assets/styles.css", "/lab-assets/admin-session.js", "/%6cab-assets/index.html", "/lab%2dassets/index.html", "/lab-assets%2findex.html"]) {
    assert.notEqual((await request(path)).status, 200, `Unauthenticated resource leak: ${path}`);
  }
  response = await request("/admin/login");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("管理员登录"));
  assert.ok(!html.includes(passwordHash));
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal((await request("/api/lab-auth/session")).status, 401);
  assert.equal((await request("/api/lab-auth/login", form({ username: "fixture-admin", password }, "https://evil.invalid"))).status, 403);
  if (!configured) {
    assert.ok(html.includes("工作台暂时锁定"));
    response = await request("/api/lab-auth/login", form({ username: "fixture-admin", password }));
    assert.equal(response.status, 303);
    assert.equal(location(response).searchParams.get("error"), "unavailable");
    assert.equal(response.headers.get("set-cookie"), null);
    console.log("PASS: missing configuration locks both the page and every login attempt.");
  } else {
    response = await request("/api/lab-auth/login", form({ username: "fixture-admin", password: "incorrect" }));
    assert.equal(location(response).searchParams.get("error"), "invalid");
    response = await request("/api/lab-auth/login", form({ username: "fixture-admin", password, next: "https://evil.invalid" }));
    assert.equal(response.status, 303);
    assert.equal(location(response).pathname, "/lab");
    const setCookie = response.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /Secure/i); assert.match(setCookie, /SameSite=strict/i);
    const cookie = setCookie.split(";")[0];
    for (const path of ["/lab", "/lab-assets/index.html", "/lab-assets/app.js", "/lab-assets/styles.css"]) {
      response = await request(path, { headers: { cookie } });
      assert.equal(response.status, 200, `Authorized resource blocked: ${path}`);
      assert.match(response.headers.get("cache-control"), /no-store/);
    }
    response = await request("/api/lab-auth/session", { headers: { cookie } });
    assert.equal(response.status, 200); assert.equal((await response.json()).authenticated, true);
    response = await request("/admin/password", { headers: { cookie } });
    assert.equal(response.status, 200);assert.ok((await response.text()).includes("确认新密码"));
    const nextPassword = "fixture-replacement-password-only";
    const changeForm = (currentPassword, newPassword, confirmPassword, site = origin, currentCookie = cookie) => ({ ...form({ currentPassword, newPassword, confirmPassword }, site), headers: { ...form({}, site).headers, cookie: currentCookie } });
    assert.equal((await request("/api/lab-auth/change-password", changeForm(password, nextPassword, nextPassword, origin, ""))).status, 401);
    assert.equal((await request("/api/lab-auth/change-password", changeForm(password, nextPassword, nextPassword, "https://evil.invalid"))).status, 403);
    for (const [current, next, confirm, error] of [["incorrect", nextPassword, nextPassword, "current"], [password, "short", "short", "length"], [password, nextPassword, nextPassword + "x", "mismatch"]]) {
      response = await request("/api/lab-auth/change-password", changeForm(current, next, confirm));
      assert.equal(response.status, 303);assert.equal(location(response).searchParams.get("error"), error);
    }
    response = await request("/api/lab-auth/change-password", changeForm(password, nextPassword, nextPassword));
    assert.equal(response.status, 303);assert.equal(location(response).searchParams.get("changed"), "1");
    assert.match(response.headers.get("set-cookie"), /Max-Age=0/i);
    assert.equal((await request("/lab", { headers: { cookie } })).status, 307);
    assert.equal((await request("/lab-assets/app.js", { headers: { cookie } })).status, 401);
    assert.equal((await request("/api/lab-auth/session", { headers: { cookie } })).status, 401);
    response = await request("/api/lab-auth/login", form({ username: "fixture-admin", password }));
    assert.equal(location(response).searchParams.get("error"), "invalid");
    response = await request("/api/lab-auth/login", form({ username: "fixture-admin", password: nextPassword }));
    assert.equal(location(response).pathname, "/lab");
    const newCookie = response.headers.get("set-cookie").split(";")[0];
    assert.equal((await request("/lab", { headers: { cookie: newCookie } })).status, 200);
    assert.ok(!(await readFile(authEnv.LAB_AUTH_LOCAL_FILE, "utf8")).includes(nextPassword));
    assert.equal((await request("/lab", { headers: { cookie: cookie + "tampered" } })).status, 307);
    assert.equal((await request("/api/lab-auth/logout", { method: "POST", headers: { origin: "https://evil.invalid", cookie } })).status, 403);
    response = await request("/api/lab-auth/logout", { method: "POST", headers: { origin, cookie } });
    assert.equal(response.status, 303); assert.match(response.headers.get("set-cookie"), /Max-Age=0/i);
    assert.equal((await request("/lab")).status, 307);
    console.log("PASS: login → change password → old password/session/assets rejected → new password login; CSRF, validation, private persistence, logout and cache headers.");
  }
} finally {
  server.kill("SIGTERM");
  await rm(testDir, { recursive: true, force: true });
}
