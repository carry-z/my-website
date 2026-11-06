import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySession } from "../../../lib/lab-auth.server.mjs";
import { loadAuthConfig } from "../../../lib/lab-credential-store.server.mjs";
import styles from "../login/login.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "修改密码 | Carry", robots: { index: false, follow: false } };
const messages = {
  current: "当前密码不正确，请重新输入。",
  length: "新密码需要 12–256 个字符，建议使用独立的长密码。",
  mismatch: "两次输入的新密码不一致，请重新输入。",
  same: "新密码不能与当前密码相同。",
  limited: "尝试次数较多，请稍后再试。",
  conflict: "密码刚刚在另一处被修改，请重新登录后再试。",
  unavailable: "密码存储暂不可用，本次没有修改密码，请稍后再试。",
};
export default async function PasswordPage({ searchParams }) {
  const params = await searchParams;
  const store = await cookies();
  let config = null;
  try { config = await loadAuthConfig(); } catch { /* Render a locked form on storage failure. */ }
  if (!config || !verifySession(store.get(COOKIE_NAME)?.value, config)) redirect("/admin/login?next=%2Fadmin%2Fpassword");
  const writable = config.storageMode !== "environment";
  const error = typeof params.error === "string" && Object.hasOwn(messages, params.error) ? messages[params.error] : null;
  return (
    <main className={styles.page}>
      <a className={styles.home} href="/lab">← 返回实验工作台</a>
      <section className={styles.card} aria-labelledby="password-title">
        <div className={styles.mark} aria-hidden="true">d<span>·</span></div>
        <p className={styles.eyebrow}>CARRY / ACCOUNT SECURITY</p>
        <h1 id="password-title">修改密码</h1>
        <p className={styles.intro}>当前管理员：{config.username}</p>
        <div className={styles.notice}><span aria-hidden="true">◈</span> 修改后，所有设备都需要重新登录</div>
        <form action="/api/lab-auth/change-password" method="post" className={styles.form}>
          <label htmlFor="current-password">当前密码</label>
          <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" placeholder="输入现在使用的密码" required maxLength={256} disabled={!writable} />
          <label htmlFor="new-password">新密码</label>
          <input id="new-password" name="newPassword" type="password" autoComplete="new-password" placeholder="至少 12 位，可使用长短语" aria-describedby="password-hint" required minLength={12} maxLength={256} disabled={!writable} />
          <p id="password-hint" className={styles.hint}>支持粘贴和密码管理器，不需要记复杂的字符规则。</p>
          <label htmlFor="confirm-password">确认新密码</label>
          <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="再次输入新密码" required minLength={12} maxLength={256} disabled={!writable} />
          {(!writable || error) && <p className={styles.error} role="alert">{!writable ? "安全存储尚未配置，暂时无法在网页修改密码。" : error}</p>}
          <button type="submit" disabled={!writable}>保存新密码并重新登录 <span aria-hidden="true">→</span></button>
        </form>
        <p className={styles.note}>修改密码不会删除或移动你的实验记录。请把新密码保存在自己的密码管理器中，本机的初始密码文件不会自动更新。</p>
      </section>
      <p className={styles.footer}>Dopant Lab · 为下一次发现留好记录</p>
    </main>
  );
}
