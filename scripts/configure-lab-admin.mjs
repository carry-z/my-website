import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../lib/lab-auth.server.mjs";

if (!process.stdin.isTTY) throw new Error("请在自己的交互终端运行，密码不会显示或通过命令参数传递。");
let muted = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
async function secretQuestion(label) {
  process.stdout.write(label); muted = true;
  try { return await rl.question(""); } finally { muted = false; process.stdout.write("\n"); }
}
try {
  const username = (await rl.question("管理员账号（默认 carry）：")).trim() || "carry";
  if (username.length > 80 || /[\r\n]/.test(username)) throw new Error("账号格式无效。");
  const password = await secretQuestion("设置管理员密码（至少 12 位，输入不显示）：");
  const confirmation = await secretQuestion("再次输入密码：");
  if (password !== confirmation) throw new Error("两次密码不一致，未更改任何配置。");
  const passwordHash = await hashPassword(password);
  const secret = randomBytes(32).toString("base64url");
  const target = fileURLToPath(new URL("../.env.local", import.meta.url));
  let existing = "";
  try { existing = await readFile(target, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const other = existing.split(/\r?\n/).filter(line => !/^\s*(?:export\s+)?LAB_(?:ADMIN_USERNAME|ADMIN_PASSWORD_HASH|SESSION_SECRET)\s*=/.test(line)).join("\n").trim();
  const lines = { LAB_ADMIN_USERNAME: username, LAB_ADMIN_PASSWORD_HASH: passwordHash, LAB_SESSION_SECRET: secret };
  await writeFile(target, [other, ...Object.entries(lines).map(([key, value]) => `${key}=${JSON.stringify(value)}`), ""].filter((line, i) => i > 0 || line).join("\n"), { mode: 0o600 });
  await chmod(target, 0o600);
  console.log("已将管理员密码哈希和会话密钥保存到 .env.local（仅本机可读，Git 已忽略）。");
  console.log("正式站点：把这三个服务端变量添加到 Vercel 的 my-website 项目 Production 环境，然后重新部署。");
  console.log("不要把 .env.local、密码或会话密钥发到聊天或提交到 GitHub。");
} finally { rl.close(); }
