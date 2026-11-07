import OSS from "ali-oss";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getVercelOidcToken } from "@vercel/oidc";
import { validate } from "../public/lab-assets/model.mjs";

export const DATA_LIMITS = Object.freeze({ chunk: 1024 * 1024, file: 10 * 1024 * 1024, files: 20, batch: 200, records: 10000, journal: 16 * 1024 * 1024, catalog: 3 * 1024 * 1024 });
const ID = /^[a-zA-Z0-9_-]{1,100}$/;
const HASH = /^[a-f0-9]{64}$/;
let cachedCredentials;
export class DataError extends Error { constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; } }
export function dataEnabled(env = process.env) { return Boolean(env.LAB_DATA_PROVIDER); }
async function roleCredentials(env) {
  if (cachedCredentials && cachedCredentials.expiresAt > Date.now() + 120_000) return cachedCredentials;
  const roleArn = env.LAB_OSS_ROLE_ARN, providerArn = env.LAB_OSS_OIDC_PROVIDER_ARN;
  if (!roleArn || !providerArn) throw new DataError("unavailable", "阿里云 OIDC 角色配置不完整，请联系管理员。", 503);
  let oidcToken;
  try { oidcToken = await getVercelOidcToken(); }
  catch { throw new DataError("unavailable", "无法取得 Vercel 生产身份凭证，请确认已在生产环境部署。", 503); }
  const form = new URLSearchParams({ Action: "AssumeRoleWithOIDC", Version: "2015-04-01", Format: "JSON", RoleArn: roleArn, OIDCProviderArn: providerArn, OIDCToken: oidcToken, RoleSessionName: "carry-lab", DurationSeconds: "3600" });
  let body;
  try {
    const response = await fetch("https://sts.aliyuncs.com/", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form, cache: "no-store", signal: AbortSignal.timeout(12_000) });
    body = await response.json();
    if (!response.ok || !body?.Credentials?.AccessKeyId || !body.Credentials.AccessKeySecret || !body.Credentials.SecurityToken || !body.Credentials.Expiration) throw new Error("STS rejected the role exchange");
  } catch { throw new DataError("unavailable", "阿里云临时凭证获取失败，请检查 RAM OIDC 信任策略。", 503); }
  cachedCredentials = {
    accessKeyId: body.Credentials.AccessKeyId,
    accessKeySecret: body.Credentials.AccessKeySecret,
    stsToken: body.Credentials.SecurityToken,
    expiresAt: Date.parse(body.Credentials.Expiration),
  };
  if (!Number.isFinite(cachedCredentials.expiresAt)) { cachedCredentials = undefined;throw new DataError("unavailable", "阿里云临时凭证过期时间无效。", 503); }
  return cachedCredentials;
}
export async function createDataClient(env = process.env) {
  if (env.LAB_DATA_PROVIDER !== "aliyun-oss") throw new DataError("not_configured", "阿里云存储尚未启用，现有本地记录不受影响。", 503);
  if (!env.LAB_OSS_BUCKET || !env.LAB_OSS_REGION) throw new DataError("unavailable", "阿里云存储配置不完整，请联系管理员。", 503);
  const credentials = await roleCredentials(env);
  const options = { bucket: env.LAB_OSS_BUCKET, region: env.LAB_OSS_REGION, accessKeyId: credentials.accessKeyId, accessKeySecret: credentials.accessKeySecret, stsToken: credentials.stsToken, authorizationV4: true, secure: true, timeout: 20000 };
  if (env.LAB_OSS_ENDPOINT) {
    const endpoint = new URL(env.LAB_OSS_ENDPOINT);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.pathname !== "/") throw new DataError("unavailable", "存储 Endpoint 配置无效。", 503);
    options.endpoint = endpoint.origin;options.cname = env.LAB_OSS_CNAME === "1";
  }
  return new OSS(options);
}
export function dataPrefix(env = process.env) {
  const prefix = env.LAB_OSS_PREFIX || "carry-lab-v1/";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,100}\/$/.test(prefix) || prefix.includes("//")) throw new DataError("unavailable", "存储前缀配置无效。", 503);
  return prefix;
}
export async function boundedBody(request, maximum) {
  if (Number(request.headers.get("content-length")) > maximum) throw new DataError("too_large", "本次请求超过大小限制。", 413);
  const reader = request.body?.getReader();if (!reader) return Buffer.alloc(0);
  const pieces = [];let size = 0;
  while (true) { const { done, value } = await reader.read();if (done) break;size += value.byteLength;if (size > maximum) { await reader.cancel();throw new DataError("too_large", "本次请求超过大小限制。", 413); }pieces.push(value); }
  return Buffer.concat(pieces);
}
export async function readNotebook(client, env = process.env) {
  let raw;
  try { const response = await client.get(dataPrefix(env) + "records.jsonl");raw = Buffer.from(response.content); }
  catch (error) { if (error.code === "NoSuchKey") return { revision: 0, records: [], operations: new Map() };throw error; }
  if (raw.length > DATA_LIMITS.journal) throw new DataError("journal_full", "记录历史已达轻量版上限，请先导出备份并升级存储。", 507);
  const records = new Map(), operations = new Map();
  try {
    if (!raw.toString("utf8").endsWith("\n")) throw new Error("Incomplete transaction");
    for (const line of raw.toString("utf8").trimEnd().split("\n")) {
      const event = JSON.parse(line);
      if (event.schema !== 1 || !ID.test(event.operation) || !Array.isArray(event.records) || event.records.length > DATA_LIMITS.batch) throw new Error("Invalid transaction");
      for (const record of event.records) { if (!ID.test(record.id)) throw new Error("Invalid record");records.set(record.id, record); }
      operations.set(event.operation, event.digest);
    }
  } catch { throw new DataError("corrupt", "云端记录校验失败，已停止写入以保护数据。", 503); }
  return { revision: raw.length, records: [...records.values()], operations };
}
function proof(hash, size, secret) { return createHmac("sha256", secret).update("lab-chunk-v1:" + hash + ":" + size).digest("hex"); }
function checkedChunk(chunk, secret, known) {
  if (!chunk || !HASH.test(chunk.hash) || !Number.isInteger(chunk.size) || chunk.size < 1 || chunk.size > DATA_LIMITS.chunk) throw new DataError("invalid_file", "附件分块无效。");
  if (!known.has(chunk.hash + ":" + chunk.size)) {
    const expected = proof(chunk.hash, chunk.size, secret);
    if (typeof chunk.proof !== "string" || chunk.proof.length !== expected.length || !timingSafeEqual(Buffer.from(chunk.proof), Buffer.from(expected))) throw new DataError("invalid_file", "附件尚未完整上传，请重新选择文件。");
  }
  return { hash: chunk.hash, size: chunk.size };
}
function cleanRecord(input, existing, secret, known) {
  if (!input || typeof input !== "object") throw new DataError("invalid_record", "实验记录格式无效。");
  let result;try { result = validate(input); } catch (error) { throw new DataError("invalid_record", error.message); }
  if (!ID.test(input.id) || String(input.id).startsWith("demo-")) throw new DataError("invalid_record", "记录 ID 无效，示例数据不能上传为真实实验。");
  const code = existing?.code || String(input.code || "");
  if (!code || code.length > 100) throw new DataError("invalid_record", "记录编号无效。");
  if (result.files.length > DATA_LIMITS.files) throw new DataError("invalid_file", "每条实验最多 20 个附件。");
  const fileIds = new Set();
  result.files = result.files.map(file => {
    if (!file || !ID.test(file.id) || fileIds.has(file.id) || typeof file.name !== "string" || !file.name || file.name.length > 200 || /[\r\n\0]/.test(file.name) || !Number.isInteger(file.size) || file.size < 1 || file.size > DATA_LIMITS.file || !Array.isArray(file.chunks) || file.chunks.length < 1 || file.chunks.length > 10) throw new DataError("invalid_file", "附件描述无效或超过 10 MB。");
    fileIds.add(file.id);
    const chunks = file.chunks.map(chunk => checkedChunk(chunk, secret, known));
    if (chunks.reduce((sum, chunk) => sum + chunk.size, 0) !== file.size) throw new DataError("invalid_file", "附件大小校验失败。");
    return { id: file.id, name: file.name, type: typeof file.type === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(file.type) ? file.type : "application/octet-stream", size: file.size, chunks };
  });
  const now = new Date().toISOString();
  return { ...result, id: input.id, code, createdAt: existing?.createdAt || now, updatedAt: now };
}
export async function saveNotebook(client, payload, secret, env = process.env) {
  if (!payload || !Number.isSafeInteger(payload.revision) || payload.revision < 0 || !ID.test(payload.operation) || !Array.isArray(payload.records) || !payload.records.length || payload.records.length > DATA_LIMITS.batch) throw new DataError("invalid_request", "每次需保存 1–200 个样品，并提供有效的云端版本。");
  const state = await readNotebook(client, env);
  const digest = createHash("sha256").update(JSON.stringify(payload.records)).digest("hex");
  if (state.operations.has(payload.operation)) {
    if (state.operations.get(payload.operation) !== digest) throw new DataError("operation_conflict", "同一次保存的内容发生变化，请刷新后重试。", 409);
    return state;
  }
  if (state.revision !== payload.revision) throw new DataError("conflict", "其他设备已更新记录。请先刷新云端，再重新保存；本次未覆盖云端。", 409);
  const all = new Map(state.records.map(record => [record.id, record]));
  const known = new Set(state.records.flatMap(record => record.files || []).flatMap(file => file.chunks || []).map(chunk => chunk.hash + ":" + chunk.size));
  const ids = new Set();
  const changed = payload.records.map(input => { if (ids.has(input.id)) throw new DataError("invalid_record", "本次保存包含重复的样品 ID。");ids.add(input.id);return cleanRecord(input, all.get(input.id), secret, known); });
  for (const record of changed) all.set(record.id, record);
  const records = [...all.values()];
  if (records.length > DATA_LIMITS.records || Buffer.byteLength(JSON.stringify(records)) > DATA_LIMITS.catalog) throw new DataError("catalog_full", "记录已达到轻量版容量上限，请先导出备份。", 507);
  const codes = new Set();for (const record of records) { if (codes.has(record.code)) throw new DataError("code_conflict", "样品编号与云端记录重复，请刷新后重新分配编号。", 409);codes.add(record.code); }
  const entry = Buffer.from(JSON.stringify({ schema: 1, operation: payload.operation, digest, records: changed }) + "\n");
  if (state.revision + entry.length > DATA_LIMITS.journal) throw new DataError("journal_full", "记录历史已达轻量版容量上限，请先导出备份。", 507);
  try {
    // OSS PutObject has no If-Match CAS. AppendObject's byte position is the atomic concurrency guard.
    const response = await client.append(dataPrefix(env) + "records.jsonl", entry, { position: state.revision, headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "x-oss-object-acl": "private", "x-oss-server-side-encryption": "AES256" } });
    const revision = Number(response.nextAppendPosition);
    if (revision !== state.revision + entry.length) throw new Error("Append result uncertain");
    return { revision, records };
  } catch (error) { if (error.code === "PositionNotEqualToLength") throw new DataError("conflict", "另一台设备正在保存，请刷新云端后重试。", 409);throw error; }
}
export async function uploadChunk(client, content, secret, env = process.env) {
  if (!content.length || content.length > DATA_LIMITS.chunk) throw new DataError("too_large", "附件分块每次最多 1 MB。", 413);
  const hash = createHash("sha256").update(content).digest("hex"), path = dataPrefix(env) + "chunks/" + hash;
  try { await client.put(path, content, { headers: { "x-oss-forbid-overwrite": "true", "x-oss-object-acl": "private", "x-oss-server-side-encryption": "AES256", "Content-Type": "application/octet-stream" } }); }
  catch (error) { if (error.code !== "FileAlreadyExists") throw error; }
  return { hash, size: content.length, proof: proof(hash, content.length, secret) };
}
export function attachmentStream(client, file, env = process.env) {
  let index = 0;
  return new ReadableStream({ async pull(controller) {
    if (index >= file.chunks.length) { controller.close();return; }
    try { const chunk = file.chunks[index++];const response = await client.get(dataPrefix(env) + "chunks/" + chunk.hash);const bytes = Buffer.from(response.content);
      if (bytes.length !== chunk.size || createHash("sha256").update(bytes).digest("hex") !== chunk.hash) throw new Error("Corrupt attachment");controller.enqueue(bytes);
    } catch { controller.error(new Error("附件读取校验失败，请重试。")); }
  } });
}
