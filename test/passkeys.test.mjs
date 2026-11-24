import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { beginPasskey, finishPasskey, listPasskeys, passkeyStore, relyingParty, revokePasskey } from "../lib/passkeys.server.mjs";
import { virtualPasskey } from "./webauthn-fixture.mjs";

const config = { username: "fixture-admin", version: "fixture-version" };
const rp = { origin: "http://localhost:3191", rpID: "localhost" };
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "carry-passkey-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = passkeyStore({ LAB_AUTH_STORE_MODE: "file", LAB_AUTH_LOCAL_FILE: join(dir, "auth.json") });
  const device = virtualPasskey();
  async function register() {
    const pending = await beginPasskey(store, config, rp, "register", { session: "test-session", name: "Test device" });
    return finishPasskey(store, config, rp, "register", pending.token, device.registration(pending.options, rp), "test-session");
  }
  return { dir, store, device, register };
}

test("真实 ES256 公钥注册、签名登录，私钥不上传；挑战不能重放", async t => {
  const { dir, store, device, register } = await fixture(t);
  assert.equal((await register()).length, 1);
  const pending = await beginPasskey(store, config, rp, "login");
  const assertion = device.authentication(pending.options, rp);
  const result = await finishPasskey(store, config, rp, "login", pending.token, assertion);
  assert.ok(result[0].lastUsedAt);
  const raw = await readFile(join(dir, "auth.json.passkeys"), "utf8");
  assert.ok(!raw.includes("PRIVATE"));
  assert.equal(JSON.parse(raw).keys[0].counter, 1);
  await assert.rejects(finishPasskey(store, config, rp, "login", pending.token, assertion));
});
test("错误网站、假签名、无设备验证、过期和未绑定密钥均不能登录", async t => {
  const { store, device, register } = await fixture(t);
  await assert.rejects(beginPasskey(store, config, rp, "login"));
  await register();
  for (const [changedRP, flags, tamper] of [[{ ...rp, origin: "https://evil.invalid" }, 5, false], [rp, 1, false], [rp, 5, true]]) {
    const pending = await beginPasskey(store, config, rp, "login");
    const response = device.authentication(pending.options, changedRP, 1, flags);
    if (tamper) response.response.signature = Buffer.alloc(64).toString("base64url");
    await assert.rejects(finishPasskey(store, config, rp, "login", pending.token, response));
    await assert.rejects(finishPasskey(store, config, rp, "login", pending.token, device.authentication(pending.options, rp)));
  }
  const expired = await beginPasskey(store, config, rp, "login", {}, 1000);
  await assert.rejects(finishPasskey(store, config, rp, "login", expired.token, device.authentication(expired.options, rp), "", 301001));
});
test("注册挑战绑定原管理员会话，缺少用户验证不能注册", async t => {
  const { store, device } = await fixture(t);
  const pending = await beginPasskey(store, config, rp, "register", { name: "Test", session: "admin-session" });
  await assert.rejects(finishPasskey(store, config, rp, "register", pending.token, device.registration(pending.options, rp), "different-session"));
  await assert.rejects(finishPasskey(store, config, rp, "register", pending.token, device.registration(pending.options, rp, 0x41), "admin-session"));
  assert.equal((await listPasskeys(store, config)).length, 0);
});
test("并发签名只允许一个登录成功，移除及改密码后旧密钥失效", async t => {
  const { store, device, register } = await fixture(t);
  await register();
  const pending = await beginPasskey(store, config, rp, "login");
  const response = device.authentication(pending.options, rp);
  const results = await Promise.allSettled([
    finishPasskey(store, config, rp, "login", pending.token, response),
    finishPasskey(store, config, rp, "login", pending.token, response),
  ]);
  assert.equal(results.filter(value => value.status === "fulfilled").length, 1);
  assert.equal((await listPasskeys(store, { ...config, version: "new-password" })).length, 0);
  await revokePasskey(store, config, device.id);
  await assert.rejects(beginPasskey(store, config, rp, "login"));
});
test("存储未配置、损坏和任意 Host 都不能绕过验证", async t => {
  const { dir, store } = await fixture(t);
  assert.throws(() => passkeyStore({}));
  assert.throws(() => passkeyStore({ VERCEL: "1", LAB_AUTH_STORE_MODE: "file", LAB_AUTH_LOCAL_FILE: "/tmp/no" }));
  assert.throws(() => relyingParty("https://evil.invalid", {}));
  assert.throws(() => relyingParty("https://www.carryz.top", { VERCEL: "1", VERCEL_ENV: "preview" }));
  assert.equal(relyingParty(rp.origin, {}).rpID, "localhost");
  await store.write("corrupt", null);
  await assert.rejects(listPasskeys(store, config));
  assert.ok((await readFile(join(dir, "auth.json.passkeys"), "utf8")) === "corrupt");
});
