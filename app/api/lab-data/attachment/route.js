import { attachmentStream, createDataClient, DataError, readNotebook } from "../../../../lib/lab-data.server.mjs";
import { dataFailure, requireLabAdmin } from "../../../../lib/lab-data-http.server.mjs";
import { preventCache } from "../../../../lib/lab-auth.server.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  try {
    await requireLabAdmin(request);
    const client = await createDataClient(), state = await readNotebook(client), params = new URL(request.url).searchParams;
    const record = state.records.find(item => item.id === params.get("record")), file = record?.files?.find(item => item.id === params.get("file"));
    if (!file) throw new DataError("not_found", "附件不存在。", 404);
    return preventCache(new Response(attachmentStream(client, file), { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(file.name), "Content-Length": String(file.size), "Content-Security-Policy": "sandbox; default-src 'none'" } }));
  } catch (error) { return dataFailure(error); }
}
