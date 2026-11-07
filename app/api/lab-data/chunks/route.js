import { boundedBody, createDataClient, DATA_LIMITS, uploadChunk } from "../../../../lib/lab-data.server.mjs";
import { dataFailure, json, requireLabAdmin } from "../../../../lib/lab-data-http.server.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request) {
  try { const config = await requireLabAdmin(request, true);return json(await uploadChunk(await createDataClient(), await boundedBody(request, DATA_LIMITS.chunk), config.secret)); }
  catch (error) { return dataFailure(error); }
}
