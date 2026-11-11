import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME } from "../../../lib/lab-auth.server.mjs";
import { verifySiteAdmin } from "../../../lib/site-content-http.server.mjs";
import { contentStore, readContent } from "../../../lib/site-content.server.mjs";
import SiteEditor from "./site-editor";
import styles from "./studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "网站管理 | Carry", robots: { index: false, follow: false } };

export default async function SiteAdmin() {
  let session;
  try { session = await verifySiteAdmin((await cookies()).get(COOKIE_NAME)?.value); }
  catch {
    return <main className={styles.shell}><h1>暂时无法验证管理员登录</h1><p>请稍后刷新重试。</p><a href="/">返回首页</a></main>;
  }
  if (!session) redirect("/admin/login?next=%2Fadmin%2Fsite");

  let initial, storageError;
  try {
    const store = contentStore();
    const { revision, draft, publishedAt } = await readContent(store);
    initial = { revision, draft, publishedAt };
    if (!store) storageError = "内容库尚未连接。可以查看和试填，保存和发布暂不可用。";
  } catch { storageError = "内容库暂不可用。为避免覆盖已有内容，编辑器未载入。"; }
  return (
    <main className={styles.shell}>
      <header className={styles.top}>
        <a href="/">← Carry 首页</a>
        <div className={styles.links}>
          <a href="/lab">实验工作台</a>
          <a href="/admin/password">修改密码</a>
          <form action="/api/lab-auth/logout" method="post"><button type="submit">退出登录</button></form>
        </div>
      </header>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>CARRY / SITE STUDIO</p>
        <h1>网站管理</h1>
        <p>整理摄影作品、更新论文和个人简介。草稿仅自己可见，发布后才会更新首页。</p>
      </section>
      {storageError && <p className={styles.warning} role="status">{storageError}</p>}
      {initial && <SiteEditor initial={initial} connected={!storageError} />}
    </main>
  );
}
