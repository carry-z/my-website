import { COOKIE_NAME, isSameOrigin, preventCache, verifySession } from "./lab-auth.server.mjs";
import { loadAuthConfig } from "./lab-credential-store.server.mjs";
import { DataError } from "./lab-data.server.mjs";

export const json = (value, status = 200) => preventCache(Response.json(value, { status }));
export async function requireLabAdmin(request, mutating = false) {
  if (mutating && !isSameOrigin(request)) throw new DataError("origin", "请求来源无效。", 403);
  const config = await loadAuthConfig();
  if (!verifySession(request.cookies.get(COOKIE_NAME)?.value, config)) throw new DataError("login_required", "请先登录管理员账号。", 401);
  return config;
}
export function dataFailure(error) {
  if (error instanceof DataError) return json({ error: error.code, message: error.message }, error.status);
  return json({ error: "unavailable", message: "云端暂时不可用，本次保存结果可能需要刷新确认；请保留当前表单，不要清理本地记录。" }, 503);
}
