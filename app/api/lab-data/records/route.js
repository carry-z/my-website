import { boundedBody, createDataClient, saveNotebook } from "../../../../lib/lab-data.server.mjs";
import { dataFailure, json, requireLabAdmin } from "../../../../lib/lab-data-http.server.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request) {
  try {
    const config = await requireLabAdmin(request, true);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "invalid_request", message: "需要 JSON 格式的实验记录。" }, 415);
    let payload;
    const raw = await boundedBody(request, 2 * 1024 * 1024);
    try { payload = JSON.parse(raw.toString("utf8")); } catch { return json({ error: "invalid_request", message: "实验记录格式无效。" }, 400); }
    const state = await saveNotebook(await createDataClient(), payload, config.secret);
    return json({ revision: state.revision, records: state.records });
  } catch (error) { return dataFailure(error); }
}
