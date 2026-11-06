import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile, stat, open, rename, unlink } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { getAuthConfig, hashPassword, verifyCredentials } from "./lab-auth.server.mjs";

export const AUTH_BLOB_PATH = "auth/admin-v1.json";
const MAX_RECORD_BYTES = 4096;
export class CredentialConflict extends Error { constructor() { super("Credentials changed concurrently"); } }
export class CredentialStoreUnavailable extends Error { constructor() { super("Administrator credential storage is unavailable"); } }
export class PasswordChangeError extends Error { constructor(code) { super(code); this.code = code; } }

function modeFor(env) {
  const mode = env.LAB_AUTH_STORE_MODE || "environment";
  if (mode === "environment" || mode === "blob") return mode;
  // A local durable adapter is useful for self-hosting and isolated tests, never on Vercel's ephemeral disk.
  if (mode === "file" && !env.VERCEL && isAbsolute(env.LAB_AUTH_LOCAL_FILE || "")) return mode;
  throw new CredentialStoreUnavailable();
}
function blobOptions(env) {
  const storeId = env.LAB_AUTH_BLOB_STORE_ID || env.BLOB_STORE_ID;
  return { access: "private", ...(storeId ? { storeId } : {}), abortSignal: AbortSignal.timeout(10_000) };
}
function decodeRecord(raw, env) {
  if (Buffer.byteLength(raw) > MAX_RECORD_BYTES) throw new CredentialStoreUnavailable();
  const record = JSON.parse(raw);
  if (record.schema !== 1 || typeof record.username !== "string" || !record.username.trim() || typeof record.passwordHash !== "string" || typeof record.updatedAt !== "string") throw new CredentialStoreUnavailable();
  const config = getAuthConfig({ LAB_ADMIN_USERNAME: record.username, LAB_ADMIN_PASSWORD_HASH: record.passwordHash, LAB_SESSION_SECRET: env.LAB_SESSION_SECRET });
  if (!config) throw new CredentialStoreUnavailable();
  return { record, config };
}
async function readSnapshot(env, blobClient) {
  const mode = modeFor(env);
  if (mode === "blob") {
    // Never use a cached password hash: password changes must revoke old sessions immediately.
    const response = await blobClient.get(AUTH_BLOB_PATH, { ...blobOptions(env), useCache: false });
    if (!response) return null;
    if (response.statusCode !== 200 || !response.stream || response.blob.size > MAX_RECORD_BYTES || !response.blob.etag) throw new CredentialStoreUnavailable();
    const raw = await new Response(response.stream).text();
    return { ...decodeRecord(raw, env), storageVersion: response.blob.etag };
  }
  try {
    if ((await stat(env.LAB_AUTH_LOCAL_FILE)).size > MAX_RECORD_BYTES) throw new CredentialStoreUnavailable();
    const raw = await readFile(env.LAB_AUTH_LOCAL_FILE, "utf8");
    return { ...decodeRecord(raw, env), storageVersion: createHash("sha256").update(raw).digest("hex") };
  } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
const defaultBlobClient = { get, put };

export async function loadAuthConfig(env = process.env, blobClient = defaultBlobClient) {
  const mode = modeFor(env);
  if (mode === "environment") {
    const config = getAuthConfig(env);
    return config ? { ...config, storageMode: mode } : null;
  }
  try {
    const snapshot = await readSnapshot(env, blobClient);
    // Once durable storage is enabled, a missing/corrupt/unavailable record NEVER falls back to the initial password.
    return snapshot ? { ...snapshot.config, storageMode: mode, storageVersion: snapshot.storageVersion } : null;
  } catch { throw new CredentialStoreUnavailable(); }
}

export async function initializeCredentialStore(env = process.env, blobClient = defaultBlobClient) {
  const mode = modeFor(env);
  if (mode === "environment") return;
  if (await readSnapshot(env, blobClient)) return; // Never reset a changed password during a redeploy.
  if (env.LAB_AUTH_INITIALIZE !== "1") throw new CredentialStoreUnavailable();
  const initial = getAuthConfig(env);
  if (!initial) throw new CredentialStoreUnavailable();
  const raw = JSON.stringify({ schema: 1, username: initial.username, passwordHash: initial.passwordHash, updatedAt: new Date().toISOString() });
  if (mode === "blob") {
    try { await blobClient.put(AUTH_BLOB_PATH, raw, { ...blobOptions(env), addRandomSuffix: false, allowOverwrite: false, contentType: "application/json", cacheControlMaxAge: 60 }); }
    catch (error) { if (!(await readSnapshot(env, blobClient))) throw error; }
  } else {
    try { await writeFile(env.LAB_AUTH_LOCAL_FILE, raw, { mode: 0o600, flag: "wx" }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
  }
}

export async function replaceStoredPassword(config, passwordHash, env = process.env, blobClient = defaultBlobClient) {
  const mode = modeFor(env);
  if (!config || !config.storageVersion || config.storageMode !== mode || mode === "environment") throw new CredentialStoreUnavailable();
  const raw = JSON.stringify({ schema: 1, username: config.username, passwordHash, updatedAt: new Date().toISOString() });
  decodeRecord(raw, env);
  if (mode === "blob") {
    try {
      await blobClient.put(AUTH_BLOB_PATH, raw, { ...blobOptions(env), addRandomSuffix: false, allowOverwrite: true, ifMatch: config.storageVersion, contentType: "application/json", cacheControlMaxAge: 60 });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) throw new CredentialConflict();
      throw new CredentialStoreUnavailable();
    }
    return;
  }
  const file = env.LAB_AUTH_LOCAL_FILE;
  let lock;
  try { lock = await open(file + ".lock", "wx", 0o600); }
  catch (error) { if (error.code === "EEXIST") throw new CredentialConflict(); throw new CredentialStoreUnavailable(); }
  const temporary = file + "." + randomBytes(12).toString("hex") + ".tmp";
  try {
    const snapshot = await readSnapshot(env, blobClient);
    if (!snapshot || snapshot.storageVersion !== config.storageVersion) throw new CredentialConflict();
    await writeFile(temporary, raw, { mode: 0o600, flag: "wx" });
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch(() => {});
    await lock.close();
    await unlink(file + ".lock");
  }
}

export async function changeAdminPassword(config, currentPassword, newPassword, confirmation, env = process.env, blobClient = defaultBlobClient) {
  if (!config || config.storageMode === "environment") throw new PasswordChangeError("unavailable");
  if (![currentPassword, newPassword, confirmation].every(value => typeof value === "string" && value.length <= 256)) throw new PasswordChangeError("length");
  if (!await verifyCredentials(config.username, currentPassword, config)) throw new PasswordChangeError("current");
  if (newPassword.length < 12) throw new PasswordChangeError("length");
  if (newPassword !== confirmation) throw new PasswordChangeError("mismatch");
  if (newPassword === currentPassword) throw new PasswordChangeError("same");
  await replaceStoredPassword(config, await hashPassword(newPassword), env, blobClient);
}
