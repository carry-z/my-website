# Carry 个人网站中的实验记录工作台

网站首页导航「管理员登录」进入 `/lab`，未登录会转到 `/admin/login`。公开主页不需要登录。Next.js 的服务端 Proxy 同时保护 `/lab` 和 `/lab-assets/`，不能通过直接打开 HTML 或脚本绕过登录。不使用 GPT、第三方身份认证或外部脚本与字体。

## 管理员配置

仅有一个私人管理员账号，不开放公众注册。未配置凭据时保持锁定，没有默认密码。在自己的交互终端运行：

```sh
node scripts/configure-lab-admin.mjs
```

首次自动部署使用 `scripts/generate-lab-admin.mjs` 生成随机初始密码，登录信息位于 `.lab-admin/登录信息.txt`，部署配置位于 `.lab-admin/production-env.json`。目录权限为 `0700`、文件为 `0600`，整个目录已被 Git 忽略，脚本不会覆盖现有凭据。可将初始密码保存在个人密码管理器中；不要公开分享这两个文件。后续自行设定密码可使用上面的交互脚本。

按提示设置账号和至少 12 位密码（不回显）。脚本保存加盐 scrypt 密码哈希与随机会话密钥到 Git 忽略的 `.env.local`，权限为 `0600`。不要将该文件、密码或密钥发到聊天或提交到仓库。

正式站点需要在 Vercel 的 `my-website` 项目添加同名服务端环境变量并重新部署：

- `LAB_ADMIN_USERNAME`：管理员账号。
- `LAB_ADMIN_PASSWORD_HASH`：脚本生成的完整哈希，注意保留 `$`，不要加引号。
- `LAB_SESSION_SECRET`：脚本生成的随机密钥。

密码哈希、会话密钥使用 Secret 类型，配置 Production；如需保护预览部署也配置 Preview。未配置的预览仍会锁定。不要使用 `NEXT_PUBLIC_` 前缀。以后改密码或更换密钥后重新部署，旧登录会话随即失效。

登录会话使用服务端 HMAC 签名、HttpOnly / Secure / SameSite=Strict Cookie，有效 8 小时。登录和退出拒绝跨站表单，响应禁止 CDN/浏览器缓存。单实例限制同一来源 15 分钟内最多 8 次尝试；这不是跨实例的持久化防爆破，未来多人使用时应增加共享限流或托管身份服务。退出清除当前浏览器 Cookie；已被复制的会话令牌在到期或轮换密钥前仍有效。

验证命令：

```sh
node --test test/lab-auth.test.mjs
npm run build
node scripts/test-lab-auth-http.mjs
node scripts/test-lab-auth-http.mjs --unconfigured
```

## 数据范围

此版本采用管理员登录、当前浏览器本地记录。没有邮箱注册或服务器同步。登录门禁保护网上的实验界面，不会加密浏览器已有的 IndexedDB 数据；共用电脑请使用独立系统/浏览器账号。退出登录不会删除实验记录。已打开的页面在重新聚焦及每分钟检查会话失效并返回登录页，离线时保留本地记录。

原 `chatgpt.site` 与 `www.carryz.top` 是不同网站来源，浏览器不会自动共享数据。迁移时：在原网站「数据与备份」导出完整 JSON，在 `/lab` 同一入口导入；附件和批次关联都会保留。正式使用时请固定 `www.carryz.top`，避免把不同子域名的本地记录误认为同一份数据。

## 更新实验系统

当前 `public/lab-assets/` 已包含全部运行文件，线上构建不依赖 `sites/` 子目录。

如果本机还保留独立实验系统源码，可运行：

```sh
node scripts/sync-lab.mjs sites/dopant-lab-20261105/dist
```

该脚本复制前端资源，调整本站资源路径，增加返回主页、退出管理与会话检查入口。保留 `admin-session.js` 和服务端登录相关文件。提交 `public/lab-assets/` 的更新后，正常构建部署个人网站即可。

## 国内托管

此集成沿用个人网站的 Vercel 托管配置。域名集成本身不能保证中国大陆各网络的可达性。若需要稳定的国内部署，可将整个 Next.js 站点迁至国内支持 Node.js 的主机，并配置相同的服务端环境变量和 HTTPS。不能只发布 `public/lab-assets/` 静态目录，否则会失去服务端门禁。备案等要求按所选云服务官方流程办理。
