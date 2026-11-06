import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Keep the personal website deployable without the separate Sites checkout.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, process.argv[2] || "sites/dopant-lab-20261105/dist");
const destination = resolve(root, "public/lab-assets");
const filenames = ["index.html", "styles.css", "app.js", "model.mjs", "batch.mjs"];
const files = await Promise.all(filenames.map(async (name) => [name, await readFile(resolve(source, name), "utf8")]));
await mkdir(destination, { recursive: true });
for (let [name, content] of files) {
  if (name === "index.html") {
    content = content
      .replace('<link rel="stylesheet" href="styles.css">', '<link rel="stylesheet" href="/lab-assets/styles.css">')
      .replace('src="app.js"', 'src="/lab-assets/app.js"')
      .replace('</head>', '<script src="/lab-assets/admin-session.js" defer></script>\n</head>')
      .replace('</button></div></header>', '</button><form action="/api/lab-auth/logout" method="post"><button class="admin-logout" type="submit">退出管理</button></form></div></header>')
      .replace('<meta name="theme-color"', '<meta name="robots" content="noindex, nofollow">\n  <meta name="theme-color"')
      .replace('<aside class="sidebar">', '<aside class="sidebar">\n    <a class="return-home" href="/">← 返回 Carry 主页</a>');
  }
  if (name === "styles.css") {
    content += '\n.return-home{font-size:11px;color:#819077;padding:0 10px;margin:-8px 0 20px;display:inline-block}.return-home:hover{color:#c25b38}.admin-logout{font-size:10px;color:#8b977f;border:1px solid #e0e6d7;background:transparent;border-radius:5px;padding:5px 9px}.admin-logout:hover{background:#eef3e7}.topbar form{margin:0}@media(max-width:760px){.return-home{font-size:10px;margin:0 0 10px;padding:0}.local-badge{display:none}}\n';
  }
  await writeFile(resolve(destination, name), content);
}
console.log(`Synced ${files.length} self-contained lab assets to public/lab-assets.`);
