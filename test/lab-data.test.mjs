import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { attachmentStream, boundedBody, createDataClient, DATA_LIMITS, readNotebook, saveNotebook, uploadChunk } from "../lib/lab-data.server.mjs";

const secret = randomBytes(32).toString("hex");
const env = { LAB_OSS_PREFIX: "fixture/" };
const record = (n, overrides = {}) => ({ id: "fixture-" + n, code: "EXP-" + n, title: "虚构测试样品 " + n, date: "2026-11-07", host: "fixture-host", dopant: "fixture-dopant", reference: "fixture molar fraction", basis: "mol%", loading: n, status: "待测试", files: [], ...overrides });
class MemoryOSS {
  constructor() { this.objects = new Map();this.calls = []; }
  async get(path) { this.calls.push(["get", path]);if (!this.objects.has(path)) throw Object.assign(new Error("Not found"), { code: "NoSuchKey" });return { content: Buffer.from(this.objects.get(path)) }; }
  async put(path, data, options) { this.calls.push(["put", path, options]);if (this.objects.has(path)) throw Object.assign(new Error("Exists"), { code: "FileAlreadyExists" });this.objects.set(path, Buffer.from(data)); }
  async append(path, data, options) {
    this.calls.push(["append", path, options]);const old = this.objects.get(path) || Buffer.alloc(0);
    if (old.length !== options.position) throw Object.assign(new Error("Stale position"), { code: "PositionNotEqualToLength" });
    const next = Buffer.concat([old, data]);this.objects.set(path, next);return { nextAppendPosition: next.length };
  }
}
test("一批样品单次提交，第二个客户端能读到记录及完整修改历史", async () => {
  const client = new MemoryOSS();
  const first = await saveNotebook(client, { revision: 0, operation: "batch-one", records: Array.from({ length: 200 }, (_, n) => record(n)) }, secret, env);
  assert.equal(first.records.length, 200);
  assert.equal(client.calls.filter(call => call[0] === "append").length, 1);
  const second = await readNotebook(client, env);assert.equal(second.records.length, 200);assert.equal(second.revision, first.revision);
  const updated = await saveNotebook(client, { revision: second.revision, operation: "update-one", records: [record(1, { notes: "updated" })] }, secret, env);
  assert.equal(updated.records.find(item => item.id === "fixture-1").notes, "updated");
  assert.equal(updated.records.find(item => item.id === "fixture-1").createdAt, first.records[1].createdAt);
  assert.ok(client.objects.get("fixture/records.jsonl").toString().includes('"operation":"batch-one"'));
});
test("陈旧版本及并发保存返回冲突，绝不覆盖另一设备已保存的内容", async () => {
  const client = new MemoryOSS();
  const outcomes = await Promise.allSettled([
    saveNotebook(client, { revision: 0, operation: "writer-one", records: [record(1)] }, secret, env),
    saveNotebook(client, { revision: 0, operation: "writer-two", records: [record(2)] }, secret, env),
  ]);
  assert.equal(outcomes.filter(item => item.status === "fulfilled").length, 1);
  assert.equal(outcomes.find(item => item.status === "rejected").reason.status, 409);
  await assert.rejects(saveNotebook(client, { revision: 0, operation: "stale", records: [record(3)] }, secret, env), error => error.status === 409);
  assert.equal((await readNotebook(client, env)).records.length, 1);
});
test("响应丢失后的同操作重试不会重复写入；不同内容不能复用操作号", async () => {
  const client = new MemoryOSS(), payload = { revision: 0, operation: "retry-one", records: [record(1)] };
  const first = await saveNotebook(client, payload, secret, env), second = await saveNotebook(client, payload, secret, env);
  assert.equal(first.revision, second.revision);assert.equal(second.records.length, 1);
  await assert.rejects(saveNotebook(client, { ...payload, records: [record(2)] }, secret, env), error => error.status === 409);
});
test("文件分块私有上传、去重、完整性校验，重组后与原文件逐字节相同", async () => {
  const client = new MemoryOSS(), bytes = randomBytes(DATA_LIMITS.chunk + 123), chunks = [];
  for (let offset = 0; offset < bytes.length; offset += DATA_LIMITS.chunk) chunks.push(await uploadChunk(client, bytes.subarray(offset, offset + DATA_LIMITS.chunk), secret, env));
  const file = { id: "file-one", name: "fixture.csv", type: "text/csv", size: bytes.length, chunks };
  const saved = await saveNotebook(client, { revision: 0, operation: "with-file", records: [record(1, { files: [file] })] }, secret, env);
  assert.equal(saved.records[0].files[0].chunks[0].proof, undefined);
  const result = Buffer.from(await new Response(attachmentStream(client, saved.records[0].files[0], env)).arrayBuffer());
  assert.deepEqual(result, bytes);
  assert.ok(client.calls.filter(call => call[0] === "put" || call[0] === "append").every(call => call[2].headers["x-oss-object-acl"] === "private"));
  const duplicate = await uploadChunk(client, bytes.subarray(0, DATA_LIMITS.chunk), secret, env);assert.equal(duplicate.hash, chunks[0].hash);
  const state = await saveNotebook(client, { revision: saved.revision, operation: "keep-file", records: [saved.records[0]] }, secret, env);
  assert.equal(state.records[0].files.length, 1);
});
test("拒绝伪造文件凭据、超大分块、损坏附件和非法记录，不写入不完整事务", async () => {
  const client = new MemoryOSS();
  await assert.rejects(uploadChunk(client, Buffer.alloc(DATA_LIMITS.chunk + 1), secret, env), error => error.status === 413);
  const chunk = await uploadChunk(client, Buffer.from("fixture"), secret, env);
  const forged = { id: "file-1", name: "x", type: "text/plain", size: chunk.size, chunks: [{ ...chunk, proof: "0".repeat(64) }] };
  await assert.rejects(saveNotebook(client, { revision: 0, operation: "forged", records: [record(1, { files: [forged] })] }, secret, env), error => error.code === "invalid_file");
  for (const invalid of [record(1, { id: "../../secret" }), record(1, { loading: -1 }), record(1, { date: "2026-02-31" }), record(1, { id: "demo-1" })]) await assert.rejects(saveNotebook(client, { revision: 0, operation: "bad-record", records: [invalid] }, secret, env));
  assert.equal(client.objects.has("fixture/records.jsonl"), false);
  const file = { ...forged, chunks: [chunk] };
  const state = await saveNotebook(client, { revision: 0, operation: "good-file", records: [record(1, { files: [file] })] }, secret, env);
  client.objects.set("fixture/chunks/" + chunk.hash, Buffer.from("corrupt"));
  await assert.rejects(new Response(attachmentStream(client, state.records[0].files[0], env)).arrayBuffer());
});
test("云端损坏、Bucket 不存在及配置缺失不能伪装为空白成功；请求体有上限", async () => {
  const client = new MemoryOSS();client.objects.set("fixture/records.jsonl", Buffer.from('{"bad":true}'));
  await assert.rejects(readNotebook(client, env), error => error.code === "corrupt");
  await assert.rejects(readNotebook({ get: async () => { throw Object.assign(new Error("Bucket missing"), { code: "NoSuchBucket" }); } }, env));
  await assert.rejects(createDataClient({}), error => error.code === "not_configured");
  await assert.rejects(createDataClient({ LAB_DATA_PROVIDER: "aliyun-oss" }), error => error.status === 503);
  const request = new Request("https://example.invalid", { method: "POST", body: "x".repeat(30) });
  await assert.rejects(boundedBody(request, 20), error => error.status === 413);
});
