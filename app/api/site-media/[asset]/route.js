import { contentStore, readSiteImage } from "../../../../lib/site-content.server.mjs";
import { requireSiteAdmin } from "../../../../lib/site-content-http.server.mjs";

export const runtime = "nodejs";
export async function GET(request, { params }) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const preview = request.nextUrl.searchParams.get("preview") === "1";
  try {
    if (preview) await requireSiteAdmin(request);
    const { asset } = await params;
    const file = await readSiteImage(contentStore(), asset, preview);
    if (file) return new Response(file.stream, { headers: { ...headers, "Content-Type": "image/webp" } });
    return new Response(null, { headers, status: 404 });
  } catch (error) {
    return new Response(null, { headers, status: error.status === 401 ? 404 : 503 });
  }
}
