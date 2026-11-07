import { createDataClient, dataEnabled, DATA_LIMITS, readNotebook } from "../../../../lib/lab-data.server.mjs";
import { dataFailure, json, requireLabAdmin } from "../../../../lib/lab-data-http.server.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  try {
    await requireLabAdmin(request);
    if (!dataEnabled()) return json({ enabled: false });
    const state = await readNotebook(await createDataClient());
    return json({ enabled: true, provider: "阿里云 OSS", revision: state.revision, records: state.records, limits: DATA_LIMITS });
  } catch (error) { return dataFailure(error); }
}
