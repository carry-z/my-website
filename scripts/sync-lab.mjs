import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Keep the personal website deployable without the separate Sites checkout.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, process.argv[2] || "sites/dopant-lab-20261105/dist");
const destination = resolve(root, "public/lab-assets");
// The integrated app.js/cloud.mjs are now authoritative; never overwrite cloud sync with the standalone local-only app.
const filenames = ["index.html", "styles.css", "model.mjs", "batch.mjs"];
const files = await Promise.all(filenames.map(async (name) => [name, await readFile(resolve(source, name), "utf8")]));
await mkdir(destination, { recursive: true });
for (let [name, content] of files) {
  if (name === "index.html") {
    content = content
      .replace('<link rel="stylesheet" href="styles.css">', '<link rel="stylesheet" href="/lab-assets/styles.css">')
      .replace('src="app.js"', 'src="/lab-assets/app.js"')
      .replace('</head>', '<script src="/lab-assets/admin-session.js" defer></script>\n</head>')
      .replace('</button></div></header>', '</button><a class="admin-logout" href="/admin/password">修改密码</a><form action="/api/lab-auth/logout" method="post"><button class="admin-logout" type="submit">退出管理</button></form></div></header>')
      .replace('<meta name="theme-color"', '<meta name="robots" content="noindex, nofollow">\n  <meta name="theme-color"')
      .replace('<aside class="sidebar">', '<aside class="sidebar">\n    <a class="return-home" href="/">← 返回 Carry 主页</a>');
    content = content.replace('<div class="sourcebar">', '<section class="cloud-bar" aria-label="云端保存"><div><strong id="cloudStatus" role="status">正在检查云端连接…</strong><small>只有显示“已保存到阿里云”，才代表云端已确认。</small></div><button class="button" id="refreshCloud" type="button">刷新云端</button></section><section class="cloud-migration" id="cloudMigration" hidden><p>发现此浏览器 <strong id="legacyCount">0</strong> 条旧记录。可迁移到阿里云，本地原件保留。</p><button class="button" id="exportLocal" type="button">先备份本地记录</button><button class="button primary" id="migrateLocal" type="button">迁移到阿里云</button></section><div class="sourcebar">');
    content = content.replace('你的记录和附件保存在<strong>当前浏览器、当前网址</strong>的本地数据库中。换电脑、换浏览器或清理网站数据后不会自动出现。网页访问权限与本地数据是两件事。', '已启用云端时，记录和附件保存在阿里云私有存储，换设备登录同一账号后点「刷新云端」读取。未启用时仍只保存在此浏览器。旧的本地记录不会自动上传，可用页面中的迁移按钮处理。完整备份包含附件，请妥善保管。');
  }
  if (name === "styles.css") {
    content += '\n.cloud-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #dae2cf;background:#f4f7ef;border-radius:9px;padding:13px 16px;margin:0 0 16px}.cloud-bar strong{font-size:12px;color:#637b50;display:block}.cloud-bar small{font-size:10px;color:#8d9b80;display:block;margin-top:4px}.cloud-migration{border:1px dashed #d8b995;background:#fbf7ef;border-radius:8px;padding:14px 16px;margin:0 0 15px;font-size:12px}.cloud-migration[hidden]{display:none}.cloud-migration p{margin:0 0 10px}.cloud-migration .button{margin:0 7px 5px 0}@media(max-width:600px){.cloud-bar{align-items:flex-start;padding:12px}.cloud-bar small{max-width:190px}}\n';
    content += '\n.return-home{font-size:11px;color:#819077;padding:0 10px;margin:-8px 0 20px;display:inline-block}.return-home:hover{color:#c25b38}.admin-logout{font-size:10px;color:#8b977f;border:1px solid #e0e6d7;background:transparent;border-radius:5px;padding:5px 9px}.admin-logout:hover{background:#eef3e7}.topbar form{margin:0}@media(max-width:760px){.return-home{font-size:10px;margin:0 0 10px;padding:0}.local-badge{display:none}}\n';
  }
  await writeFile(resolve(destination, name), content);
}
console.log(`Synced ${files.length} self-contained lab assets to public/lab-assets.`);
