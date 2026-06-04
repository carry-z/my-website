import "./globals.css";

export const metadata = {
  title: "Carry | 个人网站",
  description: "Carry 的个人网站，记录科研、写作、摄影与日常表达。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
