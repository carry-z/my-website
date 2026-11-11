import { CONTENT_LIMIT, ContentError, contentStore, updateContent } from "../../../../lib/site-content.server.mjs";
import { contentFailure, privateJson, readLimited, requireSiteAdmin } from "../../../../lib/site-content-http.server.mjs";

export const runtime = "nodejs";
export async function PUT(request) {
  try {
    await requireSiteAdmin(request, true);
    const body = await readLimited(request, CONTENT_LIMIT);
    let payload;
    try { payload = JSON.parse(body.toString("utf8")); }
    catch { throw new ContentError("保存内容格式无效。"); }
    const { revision, draft, publishedAt } = await updateContent(contentStore(), payload);
    return privateJson({ revision, draft, publishedAt });
  } catch (error) { return contentFailure(error); }
}
