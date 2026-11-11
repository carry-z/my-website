import { IMAGE_LIMIT, contentStore, uploadSiteImage } from "../../../../lib/site-content.server.mjs";
import { contentFailure, privateJson, readLimited, requireSiteAdmin } from "../../../../lib/site-content-http.server.mjs";

export const runtime = "nodejs";
export async function POST(request) {
  try {
    await requireSiteAdmin(request, true);
    const bytes = await readLimited(request, IMAGE_LIMIT);
    const asset = await uploadSiteImage(contentStore(), bytes);
    return privateJson({ asset }, 201);
  } catch (error) { return contentFailure(error); }
}
