# Carry 网站管理

- 入口：`/admin/site`，从个人首页导航可进入。
- 登录：与 `/lab` 共用账号、密码和会话。更改密码后，两个界面的旧登录都会失效。
- 支持：上传 JPG / PNG / WebP、修改照片说明和分类、调整顺序、移出展示、新增或编辑论文和首页简介。论文可填写 DOI 或 HTTPS 链接。
- 点「保存草稿」只保存后台版本；点「发布到首页」才更新公开内容。新照片文件在发布前仅登录后可预览。移出展示不会物理删除文件。

## 正式环境

创建一个专用于网站内容的 **Private Vercel Blob**（建议名 `carry-site-content`），仅连接 `my-website` 项目的 **Production** 环境，使用 Vercel OIDC。把对应的 Store ID 设置为生产环境的 `SITE_CONTENT_BLOB_STORE_ID`，再部署。不要复用密码库 `carry-lab-auth`，不要改动实验记录的 OSS 角色或桶。

没有连接时，首页仍会显示原有内容，编辑器不能保存或发布。发布前后，现有静态照片继续使用原始网站路径。云端照片会压缩成适合网页的 WebP，并去除原图元数据。

## 本地验证

`npm run build` 后执行 `node scripts/test-lab-auth-http.mjs`。测试生成虚构的管理员账号和独立临时内容库，覆盖照片上传、草稿隔离、并发发布、公开读取、登录会话撤销等步骤；不会接触线上数据。
