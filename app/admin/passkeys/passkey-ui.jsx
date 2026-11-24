"use client";

import { useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import styles from "../login/login.module.css";

async function api(action, body) {
  const response = await fetch("/api/lab-auth/passkeys/" + action, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.message || "认证服务未响应，请使用密码登录。");
  return result;
}
function support() {
  if (!window.isSecureContext || !window.PublicKeyCredential) throw new Error("当前浏览器不支持通行密钥，请使用最新版 Safari、Edge 或 Chrome，并通过 HTTPS 访问正式站。");
}
function message(error) {
  if (error.name === "NotAllowedError" || error.code === "ERROR_CEREMONY_ABORTED") return "操作已取消或超时。你仍可使用密码登录。";
  if (error.name === "InvalidStateError") return "这个通行密钥可能已经绑定，请尝试直接登录。";
  return error.message || "设备验证未完成，请重试或使用密码登录。";
}

export function PasskeyLogin({ next, enabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login() {
    setBusy(true); setError("");
    try {
      support();
      const { options } = await api("login-options", {});
      const response = await startAuthentication({ optionsJSON: options });
      const result = await api("login-verify", { response, next });
      window.location.assign(result.next);
    } catch (error) { setError(message(error)); setBusy(false); }
  }
  return <div className={styles.passkey}>
    <button type="button" disabled={busy || !enabled} onClick={login}>{busy ? "等待设备确认…" : "指纹 / 面容 / 通行密钥登录"}</button>
    <p className={styles.hint}>已绑定后可免输网站密码。按设备提示使用指纹、面容或设备 PIN。</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </div>;
}

export function PasskeyManager({ initialKeys, enabled }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  async function register(event) {
    event.preventDefault(); setBusy(true); setNotice(""); setFailed(false);
    try {
      support();
      const { options } = await api("register-options", { password, name });
      setPassword("");
      const response = await startRegistration({ optionsJSON: options });
      const result = await api("register-verify", { response });
      setKeys(result.keys); setName(""); setNotice("已绑定。下次可在管理员登录页选择通行密钥登录。");
    } catch (error) { setFailed(true); setNotice(message(error)); }
    finally { setPassword(""); setBusy(false); }
  }
  async function revoke(id) {
    if (!password) { setFailed(true); setNotice("请先在下方输入当前管理员密码，再点击移除。"); return; }
    if (!window.confirm("移除此通行密钥？以后不能再用它登录，但密码登录仍可使用。")) return;
    setBusy(true); setFailed(false); setNotice("");
    try {
      const result = await api("revoke", { id, password });
      setKeys(result.keys); setNotice("已移除。设备或密码管理器中的密钥副本需要你自行删除。");
    } catch (error) { setFailed(true); setNotice(message(error)); }
    finally { setPassword(""); setBusy(false); }
  }
  return <>
    <ul className={styles.keyList}>
      {keys.map(key => <li key={key.id}><strong>{key.name}</strong>
        <span className={styles.hint}>绑定于 {key.createdAt?.slice(0, 10)}{key.lastUsedAt ? " · 最近使用 " + key.lastUsedAt.slice(0, 10) : ""}</span>
        <button type="button" disabled={!enabled || busy} onClick={() => revoke(key.id)}>移除</button>
      </li>)}
    </ul>
    {!keys.length && <p className={styles.hint}>尚未绑定通行密钥。</p>}
    <form onSubmit={register} className={styles.form}>
      <label htmlFor="passkey-password">当前管理员密码（绑定 / 移除时确认）</label>
      <input id="passkey-password" type="password" autoComplete="current-password" required maxLength={256}
        value={password} onChange={event => setPassword(event.target.value)} disabled={!enabled || busy} />
      <label htmlFor="passkey-name">通行密钥名称</label>
      <input id="passkey-name" placeholder="例如：我的 Mac / iPhone" maxLength={60} required
        value={name} onChange={event => setName(event.target.value)} disabled={!enabled || busy} />
      <button disabled={!enabled || busy || keys.length >= 8}>{busy ? "等待设备确认…" : "绑定新的通行密钥"}</button>
    </form>
    {notice && <p role="status" className={failed ? styles.error : styles.success}>{notice}</p>}
  </>;
}
