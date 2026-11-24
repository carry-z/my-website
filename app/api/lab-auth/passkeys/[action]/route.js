import { NextResponse } from "next/server";
import {
  COOKIE_NAME, cookieOptions, createSession, isSameOrigin, loginLimit,
  preventCache, safeReturnTo, verifyCredentials, verifySession,
} from "../../../../../lib/lab-auth.server.mjs";
import { loadAuthConfig } from "../../../../../lib/lab-credential-store.server.mjs";
import {
  PASSKEY_COOKIE, PasskeyError, beginPasskey, finishPasskey, passkeyStore,
  relyingParty, revokePasskey,
} from "../../../../../lib/passkeys.server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const actions = new Set(["register-options", "register-verify", "login-options", "login-verify", "revoke"]);
const json = (body, status = 200) => preventCache(NextResponse.json(body, { status }));

async function bodyJSON(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new PasskeyError("请求格式无效。");
  if (Number(request.headers.get("content-length")) > 32768) throw new PasskeyError("请求过大。", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new PasskeyError("请求为空。");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) { await reader.cancel(); throw new PasskeyError("请求过大。", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new PasskeyError("请求格式无效。"); }
}

export async function POST(request, { params }) {
  const { action } = await params;
  if (!actions.has(action)) return json({ message: "请求不存在。" }, 404);
  try {
    if (!isSameOrigin(request)) throw new PasskeyError("请求来源无效。", 403);
    const rp = relyingParty(request.url);
    const config = await loadAuthConfig();
    if (!config) throw new PasskeyError("管理员账号尚未配置。", 503);
    const session = request.cookies.get(COOKIE_NAME)?.value;
    const managing = action.startsWith("register-") || action === "revoke";
    if (managing && !verifySession(session, config)) throw new PasskeyError("请先用密码登录管理员账号。", 401);
    const body = await bodyJSON(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new PasskeyError("请求格式无效。");
    if (action.endsWith("-options") || action === "revoke") {
      const ip = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      if (!loginLimit("passkey:" + ip).allowed) throw new PasskeyError("尝试次数较多，请稍后再试。", 429);
    }
    // A session alone is not enough to authorize adding or removing authentication credentials.
    if ((action === "register-options" || action === "revoke") &&
        !await verifyCredentials(config.username, body.password, config)) throw new PasskeyError("当前管理员密码不正确。", 403);
    const store = passkeyStore();
    if (action === "revoke") return json({ keys: await revokePasskey(store, config, body.id) });
    const kind = action.startsWith("register-") ? "register" : "login";
    if (action.endsWith("-options")) {
      const { options, token } = await beginPasskey(store, config, rp, kind, { session, name: body.name });
      const result = json({ options });
      result.cookies.set(PASSKEY_COOKIE, token, { ...cookieOptions(), maxAge: 300 });
      return result;
    }
    const keys = await finishPasskey(store, config, rp, kind,
      request.cookies.get(PASSKEY_COOKIE)?.value, body.response, session);
    const latestConfig = await loadAuthConfig();
    if (!latestConfig || latestConfig.version !== config.version) throw new PasskeyError("账号安全设置已变化，请重新用密码登录。", 401);
    const result = json(kind === "register" ? { keys } : { next: safeReturnTo(body.next) });
    result.cookies.set(PASSKEY_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    if (kind === "login") result.cookies.set(COOKIE_NAME, createSession(latestConfig), cookieOptions());
    return result;
  } catch (error) {
    const result = error instanceof PasskeyError ? json({ message: error.message }, error.status)
      : json({ message: "通行密钥暂不可用，请保留密码登录方式并稍后重试。" }, 503);
    if (action.endsWith("-verify")) result.cookies.set(PASSKEY_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    return result;
  }
}
