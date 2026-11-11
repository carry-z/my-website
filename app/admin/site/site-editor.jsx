"use client";

import { useState } from "react";
import { categories, photoUrl } from "../../../lib/site-content.mjs";
import styles from "./studio.module.css";

const tabs = [["photos", "摄影作品"], ["papers", "论文成果"], ["intro", "首页简介"]];
const paperFields = [
  ["title", "论文标题", 300], ["authors", "作者", 400], ["venue", "期刊", 160],
  ["year", "年份", 4], ["link", "DOI 或 HTTPS 链接", 600], ["summary", "简介", 1000],
];
const maxPhotoSize = 4 * 1024 * 1024;

async function prepareImage(file) {
  if (file.size <= maxPhotoSize) return file;
  if (file.size > 40 * 1024 * 1024) throw new Error("原图超过 40 MB，请先缩小再上传。");
  const image = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 2200 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.88, 0.72, 0.55]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= maxPhotoSize) return blob;
    }
    throw new Error("照片压缩后仍然过大，请先缩小再上传。");
  } finally { image.close(); }
}

async function resultOf(response) {
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.message || "请求未完成，请稍后重试。");
  return result;
}

export default function SiteEditor({ initial, connected }) {
  const [section, setSection] = useState("photos");
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial.draft);
  const [newCaption, setNewCaption] = useState("");
  const [newCategory, setNewCategory] = useState(categories[0]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.draft);

  function patch(list, id, values) {
    setDraft(current => ({ ...current, [list]: current[list].map(entry => entry.id === id ? { ...entry, ...values } : entry) }));
  }

  function move(list, id, direction) {
    setDraft(current => {
      const entries = [...current[list]];
      const from = entries.findIndex(entry => entry.id === id);
      if (from < 0) return current;
      let to = from + direction;
      while (list === "photos" && entries[to] && entries[to].category !== entries[from].category) to += direction;
      if (!entries[to]) return current;
      [entries[from], entries[to]] = [entries[to], entries[from]];
      return { ...current, [list]: entries };
    });
  }

  function remove(list, id) {
    if (!window.confirm("从编辑列表移除此项？已发布的首页会在下次发布时更新。")) return;
    setDraft(current => ({ ...current, [list]: current[list].filter(entry => entry.id !== id) }));
  }

  async function publish(action) {
    if (action === "publish" && !window.confirm("将当前内容发布到公开首页？")) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await resultOf(await fetch("/api/site-admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, revision: saved.revision, content: draft }),
      }));
      setSaved(result);
      setDraft(result.draft);
      setNotice({ text: action === "publish" ? "已发布。现在可以打开首页查看。" : "草稿已保存，公开首页未改动。" });
    } catch (error) { setNotice({ text: error.message, error: true }); }
    finally { setBusy(false); }
  }

  async function addPhoto(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!file?.size || !newCaption.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const bytes = await prepareImage(file);
      const { asset } = await resultOf(await fetch("/api/site-admin/photos", {
        method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: bytes,
      }));
      const item = { id: crypto.randomUUID(), asset, caption: newCaption.trim(), category: newCategory };
      setDraft(current => ({ ...current, photos: [...current.photos, item] }));
      setNewCaption("");
      form.reset();
      setNotice({ text: "照片已上传。请保存草稿，或发布到首页。" });
    } catch (error) { setNotice({ text: error.message, error: true }); }
    finally { setBusy(false); }
  }

  function addPaper() {
    setDraft(current => ({ ...current, papers: [{ id: crypto.randomUUID(), title: "", authors: "", venue: "", year: "", link: "", summary: "" }, ...current.papers] }));
  }

  const toolsFor = (list, id) => (
    <div className={styles.itemActions}>
      <button type="button" onClick={() => move(list, id, -1)}>上移</button>
      <button type="button" onClick={() => move(list, id, 1)}>下移</button>
      <button type="button" className={styles.remove} onClick={() => remove(list, id)}>移出展示</button>
    </div>
  );

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.tabs} aria-label="内容分类">
          {tabs.map(([key, label]) => <button key={key} type="button" aria-pressed={section === key} onClick={() => setSection(key)}>{label}</button>)}
        </div>
        <div className={styles.publishActions}>
          <button type="button" disabled={busy || !connected || !dirty} onClick={() => publish("draft")}>保存草稿</button>
          <button type="button" className={styles.primary} disabled={busy || !connected} onClick={() => publish("publish")}>发布到首页</button>
        </div>
      </div>
      <div className={styles.status} aria-live="polite">
        {busy ? "正在处理…" : notice
          ? <span className={notice.error ? styles.remove : undefined}>{notice.text}</span>
          : dirty ? "有未保存的更改" : saved.publishedAt
            ? <>上次发布：<time dateTime={saved.publishedAt}>{saved.publishedAt.replace("T", " ").slice(0, 16)} UTC</time></>
            : "尚未发布自定义内容"}
      </div>
      <fieldset className={styles.fields} disabled={busy}>
        {section === "photos" && (
          <>
            <form onSubmit={addPhoto} className={styles.upload}>
              <h2>上传照片</h2>
              <p>支持 JPG、PNG、WebP。大图会先压缩为适合网页展示的版本。</p>
              <div className={styles.uploadInputs}>
                <label>选择照片<input name="file" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" required /></label>
                <label>照片说明<input value={newCaption} maxLength={200} required onChange={event => setNewCaption(event.target.value)} placeholder="例如：秋日的岳麓书院" /></label>
                <label>分类<select value={newCategory} onChange={event => setNewCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
                <button className={styles.primary} disabled={!connected || draft.photos.length >= 200}>上传</button>
              </div>
            </form>
            <h2>照片列表 <small>{draft.photos.length} 张</small></h2>
            <div className={styles.photoList}>
              {draft.photos.map(photo => (
                <article key={photo.id} className={styles.photo}>
                  <img src={photoUrl(photo, true)} alt={photo.caption} loading="lazy" />
                  <label>照片说明<input value={photo.caption} maxLength={200} onChange={event => patch("photos", photo.id, { caption: event.target.value })} /></label>
                  <label>分类<select value={photo.category} onChange={event => patch("photos", photo.id, { category: event.target.value })}>
                    {categories.map(item => <option key={item}>{item}</option>)}
                  </select></label>
                  {toolsFor("photos", photo.id)}
                </article>
              ))}
            </div>
          </>
        )}
        {section === "papers" && (
          <>
            <div className={styles.sectionHeading}>
              <h2>论文成果 <small>{draft.papers.length} 篇</small></h2>
              <button type="button" className={styles.primary} disabled={draft.papers.length >= 100} onClick={addPaper}>＋ 新增论文</button>
            </div>
            {draft.papers.map(paper => (
              <article key={paper.id} className={styles.paper}>
                <div className={styles.sectionHeading}>
                  <h3>{paper.title || "未填写标题"}</h3>
                  {toolsFor("papers", paper.id)}
                </div>
                <div className={styles.paperFields}>
                  {paperFields.map(([key, label, limit]) => <label key={key}>{label}
                    {key === "summary"
                      ? <textarea value={paper[key]} maxLength={limit} onChange={event => patch("papers", paper.id, { [key]: event.target.value })} rows={3} />
                      : <input value={paper[key]} maxLength={limit} inputMode={key === "year" ? "numeric" : undefined}
                        onChange={event => patch("papers", paper.id, { [key]: event.target.value })} />}
                  </label>)}
                </div>
              </article>
            ))}
          </>
        )}
        {section === "intro" && <section className={styles.paper}>
          <h2>首页简介</h2>
          <label>显示在首页标题下方
            <textarea rows={6} maxLength={800} value={draft.intro}
              onChange={event => setDraft(current => ({ ...current, intro: event.target.value }))} />
          </label>
        </section>}
      </fieldset>
    </>
  );
}
