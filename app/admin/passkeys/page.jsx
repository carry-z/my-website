import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySession } from "../../../lib/lab-auth.server.mjs";
import { loadAuthConfig } from "../../../lib/lab-credential-store.server.mjs";
import { listPasskeys, passkeyStore } from "../../../lib/passkeys.server.mjs";
import { PasskeyManager } from "./passkey-ui";
import styles from "../login/login.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "通行密钥 | Carry", robots: { index: false, follow: false } };
export default async function PasskeysPage() {
  let config;
  try { config = await loadAuthConfig(); } catch { /* Fail closed. */ }
  if (!config || !verifySession((await cookies()).get(COOKIE_NAME)?.value, config)) redirect("/admin/login?next=%2Fadmin%2Fpasskeys");
  let keys = [], enabled = true;
  try { keys = await listPasskeys(passkeyStore(), config); } catch { enabled = false; }
  return <main className={styles.page}>
    <a href="/admin/site" className={styles.home}>← 返回网站管理</a>
    <section className={styles.card}>
      <p className={styles.eyebrow}>CARRY / ACCOUNT SECURITY</p>
      <h1>通行密钥</h1>
      <p className={styles.intro}>使用指纹、面容或设备 PIN 登录，不用再输入网站密码。</p>
      <p className={styles.hint}>网站只保存公钥，不接收你的指纹、面容或设备 PIN。请仅绑定你本人控制的设备 / 密码管理器。</p>
      {!enabled && <p className={styles.error}>安全存储暂不可用，请稍后重试。密码登录不受影响。</p>}
      <PasskeyManager initialKeys={keys} enabled={enabled} />
      <p className={styles.note}>密码始终保留作备用。修改管理员密码会使全部已绑定通行密钥失效，届时需重新绑定。</p>
      <a href="/admin/password">修改管理员密码 →</a>
    </section>
  </main>;
}
