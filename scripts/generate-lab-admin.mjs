import { mkdir, writeFile, chmod, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../lib/lab-auth.server.mjs";

// One-time bootstrap: writes private local files, never prints the password.
const dir = new URL("../.lab-admin/", import.meta.url);
const loginFile = new URL("登录信息.txt", dir);
const envFile = new URL("production-env.json", dir);
for (const file of [loginFile, envFile]) {
  try { await access(file); throw new Error("本地管理员凭据已存在，不会覆盖；改密码请使用 configure-lab-admin.mjs。"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const username = "carry";
const password = randomBytes(24).toString("base64url");
const values = { LAB_ADMIN_USERNAME: username, LAB_ADMIN_PASSWORD_HASH: await hashPassword(password), LAB_SESSION_SECRET: randomBytes(48).toString("base64url") };
await mkdir(dir, { mode: 0o700, recursive: true });
await chmod(dir, 0o700);
await writeFile(loginFile, `Carry 实验工作台管理员\n\n登录网址：https://www.carryz.top/admin/login\n账号：${username}\n密码：${password}\n\n生成时间：${new Date().toISOString()}\n这是随机初始密码，请妥善保存到密码管理器。\n此文件不进入 Git，也不上传到服务器。请勿发到聊天或公开分享。\n`, { mode: 0o600, flag: "wx" });
await writeFile(envFile, JSON.stringify(values, null, 2) + "\n", { mode: 0o600, flag: "wx" });
console.log(JSON.stringify({ loginFile: fileURLToPath(loginFile), envFile: fileURLToPath(envFile) }));
