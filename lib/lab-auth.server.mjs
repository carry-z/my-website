import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
export const SESSION_SECONDS = 8 * 60 * 60;
export const COOKIE_NAME = "carry_lab_admin";
const HASH_PREFIX = "scrypt$65536$8$1$";
const HASH_PATTERN = /^scrypt\$65536\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{64})$/;

export function getAuthConfig(env = process.env) {
  const username = String(env.LAB_ADMIN_USERNAME || "carry").trim();
  const passwordHash = String(env.LAB_ADMIN_PASSWORD_HASH || "").trim();
  const secret = String(env.LAB_SESSION_SECRET || "");
  if (!username || username.length > 80 || !HASH_PATTERN.test(passwordHash) || Buffer.byteLength(secret) < 32) return null;
  const version = createHash("sha256").update(username + "\0" + passwordHash).digest("hex");
  return { username, passwordHash, secret, version };
}

export async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  if (typeof password !== "string" || password.length < 12 || password.length > 256) throw new Error("管理员密码需要 12–256 个字符。");
  if (!/^[a-f0-9]{32}$/.test(salt)) throw new Error("Invalid password salt");
  const key = await derive(password, Buffer.from(salt, "hex"), 32, { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  return HASH_PREFIX + salt + "$" + key.toString("hex");
}

export async function verifyCredentials(username, password, config) {
  if (!config || typeof username !== "string" || typeof password !== "string" || username.length > 80 || password.length > 256 || !password.length) return false;
  const [, salt, savedKey] = config.passwordHash.match(HASH_PATTERN);
  const key = await derive(password, Buffer.from(salt, "hex"), 32, { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  const inputUser = createHash("sha256").update(username).digest();
  const savedUser = createHash("sha256").update(config.username).digest();
  return timingSafeEqual(key, Buffer.from(savedKey, "hex")) && timingSafeEqual(inputUser, savedUser);
}

function signature(body, config) { return createHmac("sha256", config.secret).update(body).digest("base64url"); }
export function createSession(config, now = Math.floor(Date.now() / 1000)) {
  if (!config) throw new Error("Administrator credentials are not configured");
  const body = Buffer.from(JSON.stringify({ v: 1, role: "admin", user: config.username, cv: config.version, iat: now, exp: now + SESSION_SECONDS, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${body}.${signature(body, config)}`;
}
export function verifySession(token, config, now = Math.floor(Date.now() / 1000)) {
  if (!config || typeof token !== "string" || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts.every(p => /^[a-zA-Z0-9_-]+$/.test(p))) return null;
  const expected = signature(parts[0], config);
  if (parts[1].length !== expected.length || !timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (data.v !== 1 || data.role !== "admin" || data.user !== config.username || data.cv !== config.version || !Number.isInteger(data.iat) || !Number.isInteger(data.exp) || data.iat > now + 60 || data.exp <= now || data.exp - data.iat !== SESSION_SECONDS) return null;
    return { username: data.user, expiresAt: data.exp };
  } catch { return null; }
}
export function safeReturnTo(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/lab";
  try { const url = new URL(value, "https://carry.invalid"); return url.origin === "https://carry.invalid" && (url.pathname === "/lab" || url.pathname.startsWith("/lab/")) ? url.pathname + url.search : "/lab"; } catch { return "/lab"; }
}
export function isProtectedPath(path) {
  let decoded = path;
  for (let i = 0; i < 4; i++) { try { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; } catch { break; } }
  decoded = decoded.replaceAll("\\", "/").replace(/\/+/g, "/");
  try { decoded = new URL(decoded, "https://carry.invalid").pathname; } catch { /* Use the decoded path when malformed. */ }
  return decoded === "/lab" || decoded.startsWith("/lab/") || decoded === "/lab-assets" || decoded.startsWith("/lab-assets/");
}
export function cookieOptions(secure = process.env.NODE_ENV === "production") {
  return { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: SESSION_SECONDS };
}
export function preventCache(response) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return origin === new URL(request.url).origin && (!fetchSite || fetchSite === "same-origin" || fetchSite === "none");
}

// Per-instance throttling; no user-submitted identifiers or passwords are logged.
const attempts = new Map();
export function loginLimit(key, now = Date.now()) {
  const entry = attempts.get(key);
  if (!entry || now >= entry.until) {
    if (attempts.size >= 1000) for (const [k, v] of attempts) { if (now >= v.until) attempts.delete(k); }
    if (attempts.size >= 1000) return { allowed: false, retryAfter: 60 };
    attempts.set(key, { count: 1, until: now + 15 * 60 * 1000 });
    return { allowed: true };
  }
  if (entry.count >= 8) return { allowed: false, retryAfter: Math.ceil((entry.until - now) / 1000) };
  entry.count++;
  return { allowed: true };
}
export function clearLoginLimit(key) { attempts.delete(key); }

export async function readLoginForm(request) {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw new Error("Unsupported form type");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing form body");
  const chunks = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 4096) { await reader.cancel(); throw new Error("Form too large"); } chunks.push(value); }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}
