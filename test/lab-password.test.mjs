import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { BlobPreconditionFailedError } from "@vercel/blob";
import { createSession, hashPassword, verifyCredentials, verifySession } from "../lib/lab-auth.server.mjs";
import { AUTH_BLOB_PATH, changeAdminPassword, CredentialConflict, initializeCredentialStore, loadAuthConfig, replaceStoredPassword } from "../lib/lab-credential-store.server.mjs";

const initialPassword = "fixture-initial-password-only";
const newPassword = "fixture-new-password-only";
const initialHash = await hashPassword(initialPassword);
const envBase = { LAB_ADMIN_USERNAME: "fixture-admin", LAB_ADMIN_PASSWORD_HASH: initialHash, LAB_SESSION_SECRET: randomBytes(32).toString("hex"), LAB_AUTH_INITIALIZE: "1" };
async function localFixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "carry-password-test-"));
  const env = { ...envBase, LAB_AUTH_STORE_MODE: "file", LAB_AUTH_LOCAL_FILE: join(dir, "auth.json") };
  try { await fn(env); } finally { await rm(dir, { recursive: true, force: true }); }
}

test("本地持久化：验证旧密码、保存哈希、新密码跨读取生效、全部旧会话失效", async () => localFixture(async env => {
  await initializeCredentialStore(env);
  const oldConfig = await loadAuthConfig(env);
  const oldSession = createSession(oldConfig);
  await changeAdminPassword(oldConfig, initialPassword, newPassword, newPassword, env);
  const latest = await loadAuthConfig(env);
  assert.equal(await verifyCredentials("fixture-admin", initialPassword, latest), false);
  assert.equal(await verifyCredentials("fixture-admin", newPassword, latest), true);
  assert.equal(verifySession(oldSession, latest), null);
  const saved = await readFile(env.LAB_AUTH_LOCAL_FILE, "utf8");
  assert.ok(!saved.includes(newPassword));assert.ok(!saved.includes(initialPassword));assert.ok(!saved.includes(env.LAB_SESSION_SECRET));
  assert.equal((await stat(env.LAB_AUTH_LOCAL_FILE)).mode & 0o777, 0o600);
  // A new build must not reset the password, even while the one-time initialization flag is still set.
  await initializeCredentialStore(env);
  assert.equal((await loadAuthConfig(env)).version, latest.version);
}));
test("错误旧密码、过短密码、超长密码、确认不一致及重复旧密码均不写入", async () => localFixture(async env => {
  await initializeCredentialStore(env);
  const config = await loadAuthConfig(env);
  for (const [current, password, confirmation, code] of [
    ["incorrect", newPassword, newPassword, "current"],
    [initialPassword, "short", "short", "length"],
    [initialPassword, "x".repeat(257), "x".repeat(257), "length"],
    [initialPassword, newPassword, newPassword + "x", "mismatch"],
    [initialPassword, initialPassword, initialPassword, "same"],
  ]) await assert.rejects(changeAdminPassword(config, current, password, confirmation, env), error => error.code === code);
  assert.equal((await loadAuthConfig(env)).version, config.version);
}));
test("并发密码变更只允许一个成功，不覆盖另一个设备刚保存的密码", async () => localFixture(async env => {
  await initializeCredentialStore(env);
  const config = await loadAuthConfig(env);
  const secondHash = await hashPassword("another-fixture-password-only");
  const results = await Promise.allSettled([
    replaceStoredPassword(config, initialHash, env),
    replaceStoredPassword(config, secondHash, env),
  ]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.ok(results.find(result => result.status === "rejected").reason instanceof CredentialConflict);
}));
test("存储丢失、损坏或未授权初始化时保持锁定，不回退初始密码", async () => localFixture(async env => {
  assert.equal(await loadAuthConfig(env), null);
  await assert.rejects(initializeCredentialStore({ ...env, LAB_AUTH_INITIALIZE: "" }));
  await initializeCredentialStore(env);
  await writeFile(env.LAB_AUTH_LOCAL_FILE, '{"schema":1,"passwordHash":"corrupt"}');
  await assert.rejects(loadAuthConfig(env));
  await unlink(env.LAB_AUTH_LOCAL_FILE);
  assert.equal(await loadAuthConfig(env), null);
  await assert.rejects(loadAuthConfig({ ...env, VERCEL: "1" }));
  await assert.rejects(loadAuthConfig({ ...env, LAB_AUTH_STORE_MODE: "typo" }));
}));

function memoryBlob() {
  let value = null, etag = 0;
  const calls = [];
  return {
    calls,
    get: async (path, options) => {
      calls.push({ method: "get", path, options });
      if (value === null) return null;
      return { statusCode: 200, stream: new Response(value).body, blob: { etag: String(etag), size: Buffer.byteLength(value) } };
    },
    put: async (path, data, options) => {
      calls.push({ method: "put", path, options });
      if (options.ifMatch && options.ifMatch !== String(etag)) throw new BlobPreconditionFailedError();
      if (value !== null && !options.allowOverwrite) throw new Error("Already exists");
      value = data;etag++;
    },
  };
}
test("生产存储：私有读写、禁用缓存、ETag 条件写入，旧快照不能覆盖新密码", async () => {
  const client = memoryBlob(), env = { ...envBase, LAB_AUTH_STORE_MODE: "blob", LAB_AUTH_BLOB_STORE_ID: "store_fixture" };
  await initializeCredentialStore(env, client);
  const old = await loadAuthConfig(env, client);
  const nextHash = await hashPassword(newPassword);
  await replaceStoredPassword(old, nextHash, env, client);
  await assert.rejects(replaceStoredPassword(old, initialHash, env, client), CredentialConflict);
  const config = await loadAuthConfig(env, client);
  assert.equal(await verifyCredentials(config.username, newPassword, config), true);
  assert.ok(client.calls.every(call => call.path === AUTH_BLOB_PATH && call.options.access === "private"));
  assert.ok(client.calls.filter(call => call.method === "get").every(call => call.options.useCache === false));
  assert.ok(client.calls.some(call => call.method === "put" && call.options.ifMatch === old.storageVersion));
});
test("生产存储不可用或缺失时不使用部署环境里的旧密码", async () => {
  const env = { ...envBase, LAB_AUTH_STORE_MODE: "blob" };
  assert.equal(await loadAuthConfig(env, { get: async () => null }), null);
  await assert.rejects(loadAuthConfig(env, { get: async () => { throw new Error("Network failed"); } }));
});
