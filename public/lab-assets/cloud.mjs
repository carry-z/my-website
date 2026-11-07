// Cloud writes are explicit and acknowledged by the server; local legacy records are never auto-uploaded.
export class CloudNotebook {
  constructor(onStatus = () => {}) { this.enabled = false;this.revision = 0;this.records = [];this.onStatus = onStatus;this.ready = false; }
  async request(path, options = {}) {
    const response = await fetch("/api/lab-data/" + path, { credentials: "same-origin", cache: "no-store", ...options });
    if (response.status === 401) { location.assign("/admin/login?next=%2Flab");throw Error("登录已过期，请重新登录。"); }
    if (!response.ok) { const body = await response.json().catch(() => ({}));const error = new Error(body.message || "云端请求失败，请保留当前表单后重试。");error.code = body.error;error.status = response.status;throw error; }
    return response;
  }
  async refresh() {
    this.onStatus("正在读取云端…");
    try {
      const state = await (await this.request("state")).json();
      this.enabled = state.enabled;this.ready = true;
      if (this.enabled) { this.revision = state.revision;this.records = state.records;this.onStatus("已连接阿里云 · " + this.records.length + " 条记录"); }
      else this.onStatus("云端未配置 · 仍为本地保存");
      return state;
    } catch (error) { this.ready = false;this.onStatus("云端不可用 · 未同步");throw error; }
  }
  async fileDescriptor(file) {
    if (file.chunks?.length && !file.blob) return file;
    if (!file.blob || file.blob.size < 1 || file.blob.size > 10 * 1024 * 1024) throw Error("云端附件需要为 1 字节至 10 MB 的文件。");
    const chunks = [];
    for (let offset = 0;offset < file.blob.size;offset += 1024 * 1024) {
      const response = await this.request("chunks", { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file.blob.slice(offset, offset + 1024 * 1024) });
      chunks.push(await response.json());
    }
    return { id: file.id || crypto.randomUUID(), name: file.name, type: file.type || "application/octet-stream", size: file.blob.size, chunks };
  }
  async save(records, expectedRevision = this.revision) {
    if (!this.enabled || !this.ready) throw Error("请先连接云端，当前表单尚未保存。");
    this.onStatus("正在保存到阿里云…");
    try {
      const clean = [];
      for (const record of records) { const files = [];for (const file of record.files || []) files.push(await this.fileDescriptor(file));clean.push({ ...record, files }); }
      const payload = JSON.stringify({ revision: expectedRevision, operation: crypto.randomUUID(), records: clean });
      const response = await this.request("records", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
      const state = await response.json();this.revision = state.revision;this.records = state.records;
      this.onStatus("已保存到阿里云 · " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
      return this.records;
    } catch (error) { this.onStatus(error.status === 409 ? "存在更新冲突 · 请刷新云端" : "保存未确认 · 请保留表单");throw error; }
  }
  async attachment(record, file) {
    if (file.blob) return file.blob;
    const response = await this.request("attachment?record=" + encodeURIComponent(record.id) + "&file=" + encodeURIComponent(file.id));
    return response.blob();
  }
}
