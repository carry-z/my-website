import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, safeReturnTo, verifySession } from "../../../lib/lab-auth.server.mjs";
import { loadAuthConfig } from "../../../lib/lab-credential-store.server.mjs";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "管理员登录 | Carry", description: "Carry 的个人实验工作台管理员入口。", robots: { index: false, follow: false } };
const errors = { invalid: "账号或密码不正确，请重新输入。", limited: "尝试次数较多，请稍后再试。", unavailable: "管理员账号尚未配置，请稍后再试。" };

export default async function AdminLogin({ searchParams }) {
  const params = await searchParams;
  const next = safeReturnTo(params.next);
  const site = next.split("?")[0] === "/admin/site";
  let config = null;
  try { config = await loadAuthConfig(); } catch { /* Fail closed; do not expose storage errors or credentials. */ }
  const error = typeof params.error === "string" && Object.hasOwn(errors, params.error) ? errors[params.error] : null;
  const store = await cookies();
  if (verifySession(store.get(COOKIE_NAME)?.value, config)) redirect(next);
  return (
    <main className={styles.page}>
      <a className={styles.home} href="/">← 返回 Carry 主页</a>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.mark} aria-hidden="true">d<span>·</span></div>
        <p className={styles.eyebrow}>{site ? "CARRY / SITE STUDIO" : "CARRY / PERSONAL LAB NOTEBOOK"}</p>
        <h1 id="login-title">管理员登录</h1>
        <p className={styles.intro}>{site ? "使用实验工作台的同一账号和密码。" : "登录后，继续你的实验记录。"}</p>
        <div className={styles.notice}><span aria-hidden="true">◈</span> {site ? "网站内容管理仅向管理员开放" : "实验工作台仅向管理员开放"}</div>
        {params.changed === "1" && <p className={styles.success} role="status">密码已更新，请使用新密码重新登录。其他设备的旧登录也已失效。</p>}
        <form action="/api/lab-auth/login" method="post" className={styles.form}>
          <input type="hidden" name="next" value={next} />
          <label htmlFor="admin-username">管理员账号</label>
          <input id="admin-username" name="username" autoComplete="username" placeholder="输入管理员账号" required maxLength={80} disabled={!config} />
          <label htmlFor="admin-password">登录密码</label>
          <input id="admin-password" name="password" type="password" autoComplete="current-password" placeholder="输入密码" required maxLength={256} disabled={!config} />
          {(!config || error) && <p className={styles.error} role="alert">{!config ? "管理员账号正在配置，工作台暂时锁定。" : error}</p>}
          <button type="submit" disabled={!config}>登录{site ? "网站管理" : "实验工作台"} <span aria-hidden="true">→</span></button>
        </form>
        <p className={styles.note}>{site ? "保存草稿不会改变首页，点击发布后才对外展示。" : "实验记录按工作台显示的存储方式保存。退出登录不会删除记录。"}</p>
      </section>
      <p className={styles.footer}>Dopant Lab · 为下一次发现留好记录</p>
    </main>
  );
}
