import { COOKIE_NAME, isSameOrigin, preventCache, verifySession } from "./lab-auth.server.mjs";
import { loadAuthConfig } from "./lab-credential-store.server.mjs";
import { ContentError } from "./site-content.server.mjs";

export async function verifySiteAdmin(token) {
  return token ? verifySession(token, await loadAuthConfig()) : null;
}

export async function requireSiteAdmin(request, mutating = false) {
  if (mutating && !isSameOrigin(request)) throw new ContentError("请求来源无效。", 403);
  if (!await verifySiteAdmin(request.cookies.get(COOKIE_NAME)?.value)) throw new ContentError("登录已失效，请重新登录。", 401);
}

export async function readLimited(request, maximum) {
  if (Number(request.headers.get("content-length")) > maximum) throw new ContentError("上传内容超过大小限制。", 413);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return Buffer.concat(chunks, length);
      length += value.length;
      if (length > maximum) {
        await reader.cancel();
        throw new ContentError("上传内容超过大小限制。", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
}

export const privateJson = (value, status = 200) => preventCache(Response.json(value, { status }));
export const contentFailure = error => error instanceof ContentError
  ? privateJson({ message: error.message }, error.status)
  : privateJson({ message: "网站内容库暂不可用。请保留当前编辑，稍后重试。" }, 503);
