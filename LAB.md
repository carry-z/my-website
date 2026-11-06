# Carry 个人网站中的实验记录工作台

网站首页导航「管理员登录」进入 `/lab`，未登录会转到 `/admin/login`。公开主页不需要登录。Next.js 的服务端 Proxy 同时保护 `/lab` 和 `/lab-assets/`，不能通过直接打开 HTML 或脚本绕过登录。不使用 GPT、第三方身份认证或外部脚本与字体。

## 管理员配置

仅有一个私人管理员账号，不开放公众注册。未配置凭据时保持锁定，没有默认密码。在自己的交互终端运行：

```sh
node scripts/configure-lab-admin.mjs
```

首次自动部署使用 `scripts/generate-lab-admin.mjs` 生成随机初始密码，登录信息位于 `.lab-admin/登录信息.txt`，部署配置位于 `.lab-admin/production-env.json`。目录权限为 `0700`、文件为 `0600`，整个目录已被 Git 忽略，脚本不会覆盖现有凭据。不要公开分享这两个文件。

### 在网站修改密码

登录后点工作台右上角「修改密码」，进入 `/admin/password`。输入当前密码、新密码和确认密码；新密码要求 12–256 个字符，支持粘贴、中文长短语和密码管理器。保存后会清除当前登录 Cookie，并要求所有设备重新登录；服务器读取最新密码版本，旧密码与旧签名会话均不再有效。修改不会读写 IndexedDB 中的实验记录。

新密码只保存为加盐 scrypt 哈希，不回显、不打印、不放在链接中。确认不一致、旧密码错误、过短/过长、与旧密码相同的请求都不会写入。新密码请自行保存，`.lab-admin/登录信息.txt` 只是初始密码文件，不会自动更新。没有公开注册或邮箱找回入口。

### 持久化部署

正式站采用独立的私有 Vercel Blob 存储 `carry-lab-auth`，只存 `auth/admin-v1.json`（账号、密码哈希、更新时间），不存明文密码、会话签名密钥或实验数据。仅关联 Production，不让预览代码访问正式密码记录。

- `LAB_AUTH_STORE_MODE=blob`：正式环境启用持久化。
- `LAB_AUTH_BLOB_STORE_ID`：正式私有存储 ID，配合关联项目的 OIDC 权限（或服务端存储凭据）。
- 首次迁移时临时设置 `LAB_AUTH_INITIALIZE=1`，构建脚本 `scripts/initialize-lab-auth.mjs` 只在记录不存在时迁移初始环境变量哈希。部署成功后删除这个标志；运行时没有初始化/重置接口。
- 后续构建检测到已存在记录时不会覆盖，不会把网页改好的密码重置为环境变量里的初始密码。
- 运行时一旦启用持久化，记录缺失、损坏、存储超额或不可用均保持锁定，**不会回退到初始密码**。
- 每次读取使用 `useCache: false` 获取最新哈希；修改用 ETag 条件写入，阻止并发覆盖。

没有持久存储时，`environment` 模式保留原有登录但禁用网页改密。自托管或隔离测试可使用 `LAB_AUTH_STORE_MODE=file` 和绝对路径 `LAB_AUTH_LOCAL_FILE`，文件使用原子替换、版本校验和 `0600` 权限；Vercel 上明确禁止 file 模式，因为函数磁盘不持久。初始化脚本不会自动加载 `.env.local`；本地需要显式传入对应环境变量。

按提示设置账号和至少 12 位密码（不回显）。脚本保存加盐 scrypt 密码哈希与随机会话密钥到 Git 忽略的 `.env.local`，权限为 `0600`。不要将该文件、密码或密钥发到聊天或提交到仓库。

正式站点需要在 Vercel 的 `my-website` 项目添加同名服务端环境变量并重新部署：

- `LAB_ADMIN_USERNAME`：管理员账号。
- `LAB_ADMIN_PASSWORD_HASH`：脚本生成的完整哈希，注意保留 `$`，不要加引号。
- `LAB_SESSION_SECRET`：脚本生成的随机密钥。

初始密码哈希、会话密钥使用 Secret 类型，配置 Production。不要使用 `NEXT_PUBLIC_` 前缀。持久化启用后，更新初始 `LAB_ADMIN_PASSWORD_HASH` 不会重置正式密码；正常改密应走网页入口。更换会话密钥并重新部署也会使旧登录会话失效。

登录会话使用服务端 HMAC 签名、HttpOnly / Secure / SameSite=Strict Cookie，有效 8 小时。登录、改密和退出拒绝跨站表单，响应禁止 CDN/浏览器缓存并禁止页面嵌入。单实例限制同一来源 15 分钟内最多 8 次登录/改密尝试（分别计数）；这不是跨实例的持久化防爆破，未来多人使用时应增加共享限流或托管身份服务。退出仅清除当前浏览器 Cookie；改密、更换签名密钥才会撤销所有旧会话。

验证命令：

```sh
node --test test/lab-auth.test.mjs test/lab-password.test.mjs
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
