import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import sharp from "sharp";
import { categories, defaultSiteContent, originalPhotoSources } from "./site-content.mjs";

export const IMAGE_LIMIT = 4 * 1024 * 1024;
export const CONTENT_LIMIT = 512 * 1024;
export const ASSET_ID = /^[a-f0-9]{64}$/;
const ITEM_ID = /^[a-zA-Z0-9-]{1,64}$/;
const stateFile = "content-v1.json";
const imageFile = asset => "photos/" + asset + ".webp";
export class ContentError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const conflict = () => new ContentError("另一处已保存内容。请备份当前编辑，再重新打开管理页。", 409);
const digest = value => createHash("sha256").update(value).digest("hex");
const unavailable = () => new ContentError("网站内容库暂不可用。请保留当前编辑，稍后重试。", 503);
const invalid = message => { throw new ContentError(message); };

function field(value, limit, label, required = false) {
  if (typeof value !== "string" || value.length > limit || (required && !value.trim())) invalid(label + "不能为空或超过长度限制。");
  return value.trim();
}
function paperLink(value) {
  const entered = field(value, 600, "论文链接或 DOI", true);
  const doi = entered.replace(/^doi:\s*/i, "");
  const link = /^10\.\d{4,9}\/\S+$/i.test(doi) ? "https://doi.org/" + doi : entered;
  try {
    const url = new URL(link);
    if (url.protocol === "https:" && !url.username && !url.password) return url.href;
  } catch { /* Return the same validation message for malformed URLs. */ }
  return invalid("请填写有效的 HTTPS 论文链接或 DOI。");
}
export function validateSiteContent(content) {
  if (!content || !Array.isArray(content.photos) || content.photos.length > 200 ||
      !Array.isArray(content.papers) || content.papers.length > 100) invalid("最多可管理 200 张照片和 100 篇论文。");
  const ids = new Set();
  function idOf(entry) {
    const id = entry?.id;
    if (typeof id !== "string" || !ITEM_ID.test(id) || ids.has(id)) invalid("内容编号无效或重复。");
    ids.add(id);
    return id;
  }
  return {
    intro: field(content.intro, 800, "首页简介", true),
    photos: content.photos.map(photo => {
      const id = idOf(photo);
      if (!categories.includes(photo.category)) invalid("请选择有效的照片分类。");
      const entry = { id, caption: field(photo.caption, 200, "照片说明", true), category: photo.category };
      if (photo.asset !== undefined) {
        if (typeof photo.asset !== "string" || !ASSET_ID.test(photo.asset)) invalid("照片文件无效。");
        entry.asset = photo.asset;
      } else if (!Object.hasOwn(originalPhotoSources, id)) invalid("请先上传照片。");
      return entry;
    }),
    papers: content.papers.map(paper => {
      const id = idOf(paper);
      const year = field(paper.year, 4, "年份");
      if (year && !/^\d{4}$/.test(year)) invalid("年份应为四位数字。");
      return {
        id, year, title: field(paper.title, 300, "论文标题", true),
        authors: field(paper.authors, 400, "作者"),
        venue: field(paper.venue, 160, "期刊"),
        summary: field(paper.summary, 1000, "论文简介"),
        link: paperLink(paper.link),
      };
    }),
  };
}

export function contentStore(env = process.env, blob = { get, put }) {
  const storeId = env.SITE_CONTENT_BLOB_STORE_ID;
  if (storeId) {
    if (!/^store_[a-zA-Z0-9]+$/.test(storeId) || storeId === (env.LAB_AUTH_BLOB_STORE_ID || env.BLOB_STORE_ID)) throw unavailable();
    const options = () => ({ storeId, access: "private", abortSignal: AbortSignal.timeout(10_000) });
    return {
      async read(key) {
        const result = await blob.get(key, { ...options(), useCache: key !== stateFile });
        if (!result) return null;
        if (result.statusCode !== 200 || !result.stream) throw unavailable();
        return { stream: result.stream, version: result.blob.etag, size: result.blob.size };
      },
      async saveState(bytes, version) {
        try {
          await blob.put(stateFile, bytes, {
            ...options(), addRandomSuffix: false, contentType: "application/json",
            allowOverwrite: Boolean(version), ...(version ? { ifMatch: version } : {}),
          });
        } catch (error) {
          if (error instanceof BlobPreconditionFailedError || (!version && await blob.get(stateFile, { ...options(), useCache: false }).then(result => {
            result?.stream?.cancel().catch(() => {});
            return Boolean(result);
          }).catch(() => false))) throw conflict();
          throw error;
        }
      },
      async saveImage(key, bytes) {
        try { await blob.put(key, bytes, { ...options(), addRandomSuffix: false, allowOverwrite: false, contentType: "image/webp" }); }
        catch (error) {
          // Immutable content-addressed images can be safely reused.
          const existing = await this.read(key);
          if (!existing) throw error;
          await existing.stream.cancel();
        }
      },
    };
  }

  const directory = env.SITE_CONTENT_LOCAL_DIR;
  if (!env.VERCEL && isAbsolute(directory || "")) {
    return {
      async read(key) {
        try {
          const bytes = await readFile(join(directory, key));
          return { stream: new Response(bytes).body, version: digest(bytes), size: bytes.length };
        } catch (error) { if (error.code === "ENOENT") return null; throw error; }
      },
      async saveState(bytes, version) {
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const lock = join(directory, "publishing.lock");
        const temporary = join(directory, randomUUID() + ".tmp");
        try { await writeFile(lock, "", { flag: "wx", mode: 0o600 }); }
        catch (error) { if (error.code === "EEXIST") throw conflict(); throw error; }
        try {
          const current = await this.read(stateFile);
          await current?.stream.cancel();
          if ((current?.version || null) !== version) throw conflict();
          await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
          await rename(temporary, join(directory, stateFile));
        } finally {
          await unlink(temporary).catch(() => {});
          await unlink(lock);
        }
      },
      async saveImage(key, bytes) {
        await mkdir(join(directory, "photos"), { recursive: true, mode: 0o700 });
        const temporary = join(directory, randomUUID() + ".tmp");
        try {
          await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
          await rename(temporary, join(directory, key));
        } finally { await unlink(temporary).catch(() => {}); }
      },
    };
  }
  return null;
}

export async function readContent(store) {
  const result = store && await store.read(stateFile);
  if (!result) return { revision: null, version: null, draft: defaultSiteContent, published: defaultSiteContent, publishedAt: null };
  if (result.size > CONTENT_LIMIT || !result.version) {
    await result.stream.cancel();
    throw unavailable();
  }
  const state = await new Response(result.stream).json();
  if (state.schema !== 1 || !ITEM_ID.test(state.revision || "")) throw unavailable();
  return { ...state, version: result.version };
}

export async function publicSiteContent() {
  try { return (await readContent(contentStore())).published; }
  catch { return defaultSiteContent; } // Public site remains reachable if storage is temporarily unavailable.
}

export async function updateContent(store, payload) {
  if (!store) throw unavailable();
  if (!payload || !["draft", "publish"].includes(payload.action)) invalid("请选择保存草稿或发布。");
  const current = await readContent(store);
  if (current.revision !== payload.revision) throw conflict();
  const draft = validateSiteContent(payload.content);
  const assets = new Set([...current.draft.photos, ...current.published.photos].map(photo => photo.asset));
  for (const asset of new Set(draft.photos.map(photo => photo.asset).filter(asset => asset && !assets.has(asset)))) {
    const file = await store.read(imageFile(asset));
    if (!file) invalid("有照片未上传成功，请重新选择。");
    await file.stream.cancel();
  }
  const publish = payload.action === "publish";
  const next = {
    schema: 1, revision: randomUUID(), draft,
    published: publish ? draft : current.published,
    publishedAt: publish ? new Date().toISOString() : current.publishedAt,
  };
  const bytes = Buffer.from(JSON.stringify(next));
  if (bytes.length > CONTENT_LIMIT) invalid("当前内容超过容量限制，请缩短说明或简介。");
  await store.saveState(bytes, current.version);
  return next;
}

export async function uploadSiteImage(store, input) {
  if (!store) throw unavailable();
  if (!input.length || input.length > IMAGE_LIMIT) throw new ContentError("请选择不超过 4 MB 的照片。", 413);
  let bytes;
  try {
    const image = sharp(input, { limitInputPixels: 48_000_000, failOn: "error" });
    const meta = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format) || (meta.pages || 1) !== 1) throw new Error("Unsupported format");
    // Re-encode to a known safe format, rotate by EXIF and discard embedded metadata.
    bytes = await image.autoOrient().resize(2400, 2400, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
  } catch { invalid("无法处理该文件。请选择有效的 JPG、PNG 或 WebP 静态照片。"); }
  if (bytes.length > IMAGE_LIMIT) throw new ContentError("处理后的照片仍然过大，请先缩小尺寸。", 413);
  const asset = digest(bytes);
  await store.saveImage(imageFile(asset), bytes);
  return asset;
}

export async function readSiteImage(store, asset, preview) {
  if (!store || !ASSET_ID.test(asset)) return null;
  if (!preview) {
    const { published } = await readContent(store);
    if (!published.photos.some(photo => photo.asset === asset)) return null;
  }
  return store.read(imageFile(asset));
}
