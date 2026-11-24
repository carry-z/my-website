import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile, open, rename, unlink } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const PATH = "auth/passkeys-v1.json";
const MAX_BYTES = 128 * 1024;
const TTL = 5 * 60 * 1000;
const TOKEN = /^[a-zA-Z0-9_-]{43}$/;
const ID = /^[a-zA-Z0-9_-]{1,1400}$/;
export const PASSKEY_COOKIE = "carry_passkey_challenge";
export class PasskeyError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const unavailable = () => new PasskeyError("通行密钥存储暂不可用，请使用密码登录。", 503);
const conflict = () => new PasskeyError("另一处刚更新了通行密钥，请重新操作。", 409);
const hash = value => createHash("sha256").update(value).digest("hex");
const fresh = config => ({ schema: 1, accountVersion: config.version, keys: [], challenges: [] });

export function relyingParty(url, env = process.env) {
  const origin = new URL(url).origin;
  if (!env.VERCEL && new URL(origin).hostname === "localhost" && new URL(origin).protocol === "http:") {
    return { origin, rpID: "localhost" };
  }
  // Never trust an arbitrary Host header or preview deployment as a relying party.
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") throw new PasskeyError("请在正式网站绑定和使用通行密钥。", 403);
  if (origin !== "https://www.carryz.top") throw new PasskeyError("请使用 https://www.carryz.top 登录或绑定通行密钥。", 403);
  return { origin, rpID: "www.carryz.top" };
}

export function passkeyStore(env = process.env, blob = { get, put }) {
  const opts = () => ({
    access: "private", storeId: env.LAB_AUTH_BLOB_STORE_ID || env.BLOB_STORE_ID,
    abortSignal: AbortSignal.timeout(10_000),
  });
  if (env.LAB_AUTH_STORE_MODE === "blob" && opts().storeId) return {
    async read() {
      const result = await blob.get(PATH, { ...opts(), useCache: false });
      if (!result) return null;
      if (result.statusCode !== 200 || !result.stream || !result.blob.etag || result.blob.size > MAX_BYTES) throw unavailable();
      return { raw: await new Response(result.stream).text(), version: result.blob.etag };
    },
    async write(raw, version) {
      try {
        await blob.put(PATH, raw, {
          ...opts(), contentType: "application/json", addRandomSuffix: false,
          allowOverwrite: Boolean(version), ...(version ? { ifMatch: version } : {}),
        });
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError) throw conflict();
        if (!version && await this.read().catch(() => null)) throw conflict();
        throw unavailable();
      }
    },
  };
  if (!env.VERCEL && env.LAB_AUTH_STORE_MODE === "file" && isAbsolute(env.LAB_AUTH_LOCAL_FILE || "")) {
    const path = env.LAB_AUTH_LOCAL_FILE + ".passkeys";
    return {
      async read() {
        try { const raw = await readFile(path, "utf8"); return { raw, version: hash(raw) }; }
        catch (error) { if (error.code === "ENOENT") return null; throw unavailable(); }
      },
      async write(raw, version) {
        let lock;
        try { lock = await open(path + ".lock", "wx", 0o600); }
        catch (error) { if (error.code === "EEXIST") throw conflict(); throw unavailable(); }
        const temporary = path + "." + randomBytes(12).toString("hex") + ".tmp";
        try {
          const current = await this.read();
          if ((current?.version || null) !== version) throw conflict();
          await writeFile(temporary, raw, { mode: 0o600, flag: "wx" });
          await rename(temporary, path);
        } finally {
          await unlink(temporary).catch(() => {});
          await lock.close();
          await unlink(path + ".lock");
        }
      },
    };
  }
  throw unavailable();
}

async function snapshot(store, config) {
  const found = await store.read();
  if (!found) return { state: fresh(config), version: null };
  if (Buffer.byteLength(found.raw) > MAX_BYTES) throw unavailable();
  let state;
  try {
    state = JSON.parse(found.raw);
    if (state.schema !== 1 || typeof state.accountVersion !== "string" ||
        !Array.isArray(state.keys) || state.keys.length > 8 ||
        !Array.isArray(state.challenges) || state.challenges.length > 24 ||
        state.keys.some(key => !ID.test(key.id) || !ID.test(key.publicKey) ||
          !Number.isSafeInteger(key.counter) || key.counter < 0 || typeof key.name !== "string") ||
        state.challenges.some(item => !/^[a-f0-9]{64}$/.test(item.token) ||
          !Number.isFinite(item.expiresAt) || typeof item.challenge !== "string")) throw Error();
  } catch { throw unavailable(); }
  // Password changes are also the emergency recovery path: all existing passkeys are revoked.
  if (state.accountVersion !== config.version) state = fresh(config);
  return { state, version: found.version };
}
async function persist(store, state, version) {
  const raw = JSON.stringify(state);
  if (Buffer.byteLength(raw) > MAX_BYTES) throw unavailable();
  await store.write(raw, version);
}
export async function listPasskeys(store, config) {
  const { state } = await snapshot(store, config);
  return state.keys.map(({ id, name, createdAt, lastUsedAt }) => ({ id, name, createdAt, lastUsedAt }));
}

export async function beginPasskey(store, config, rp, kind, { session = "", name = "" } = {}, now = Date.now()) {
  const { state, version } = await snapshot(store, config);
  if (!["register", "login"].includes(kind)) throw new PasskeyError("请求无效。");
  if (kind === "register" && (!session || typeof name !== "string" || !name.trim() || name.length > 60)) throw new PasskeyError("请填写不超过 60 字的设备名称。");
  if (kind === "register" && state.keys.length >= 8) throw new PasskeyError("最多绑定 8 个通行密钥，请先移除不再使用的密钥。");
  if (kind === "login" && !state.keys.length) throw new PasskeyError("尚未绑定通行密钥。请先用密码登录，在“通行密钥”页面添加。");
  state.challenges = state.challenges.filter(item => item.expiresAt > now);
  if (state.challenges.length >= 24) throw new PasskeyError("认证请求较多，请稍后重试。", 429);
  const options = kind === "register"
    ? await generateRegistrationOptions({
      rpName: "Carry 网站管理", rpID: rp.rpID,
      userName: config.username, userDisplayName: config.username,
      userID: new Uint8Array(createHash("sha256").update("carry-admin:" + config.username).digest()),
      attestationType: "none", supportedAlgorithmIDs: [-7, -257],
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      excludeCredentials: state.keys.map(key => ({ id: key.id })),
    })
    : await generateAuthenticationOptions({
      rpID: rp.rpID, userVerification: "required",
      allowCredentials: state.keys.map(key => ({ id: key.id })),
    });
  const token = randomBytes(32).toString("base64url");
  state.challenges.push({
    token: hash(token), challenge: options.challenge, kind,
    origin: rp.origin, rpID: rp.rpID, expiresAt: now + TTL,
    ...(kind === "register" ? { session: hash(session), name: name.trim() } : {}),
  });
  await persist(store, state, version);
  return { options, token };
}

export async function finishPasskey(store, config, rp, kind, token, response, session = "", now = Date.now()) {
  if (typeof token !== "string" || !TOKEN.test(token)) throw new PasskeyError("认证已失效，请重新操作。");
  const { state, version } = await snapshot(store, config);
  const pending = state.challenges.find(item => item.token === hash(token) && item.kind === kind);
  if (!pending || pending.expiresAt <= now || pending.origin !== rp.origin || pending.rpID !== rp.rpID ||
      (kind === "register" && (!session || pending.session !== hash(session)))) throw new PasskeyError("认证已过期或不属于当前浏览器，请重新操作。");
  state.challenges = state.challenges.filter(item => item !== pending && item.expiresAt > now);
  let verification;
  try {
    if (kind === "register") {
      verification = await verifyRegistrationResponse({
        response, expectedChallenge: pending.challenge,
        expectedOrigin: rp.origin, expectedRPID: rp.rpID, requireUserVerification: true,
      });
      if (!verification.verified || !verification.registrationInfo || state.keys.length >= 8) throw Error();
      const { credential } = verification.registrationInfo;
      if (state.keys.some(key => key.id === credential.id)) throw Error();
      state.keys.push({
        id: credential.id, publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter, name: pending.name, createdAt: new Date(now).toISOString(), lastUsedAt: null,
      });
    } else {
      const key = state.keys.find(item => item.id === response?.id);
      if (!key) throw Error();
      verification = await verifyAuthenticationResponse({
        response, expectedChallenge: pending.challenge, expectedOrigin: rp.origin, expectedRPID: rp.rpID,
        requireUserVerification: true,
        credential: { id: key.id, publicKey: new Uint8Array(Buffer.from(key.publicKey, "base64url")), counter: key.counter },
      });
      if (!verification.verified) throw Error();
      key.counter = verification.authenticationInfo.newCounter;
      key.lastUsedAt = new Date(now).toISOString();
    }
  } catch {
    // Consume failed attempts as well as successes; no reusable signed challenges.
    await persist(store, state, version);
    throw new PasskeyError("未通过设备验证，请重新操作，或使用密码登录。");
  }
  // CAS also makes simultaneous/replayed assertions fail before a login session is issued.
  await persist(store, state, version);
  return listPasskeys(store, config);
}

export async function revokePasskey(store, config, id) {
  const { state, version } = await snapshot(store, config);
  if (typeof id !== "string" || !state.keys.some(key => key.id === id)) throw new PasskeyError("该通行密钥不存在。", 404);
  state.keys = state.keys.filter(key => key.id !== id);
  state.challenges = [];
  await persist(store, state, version);
  return listPasskeys(store, config);
}
