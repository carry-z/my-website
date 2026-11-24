import styles from "./tools.module.css";

export const metadata = {
  title: "工具 | Carry",
  description: "Carry 个人网站的在线工具，包括计时器与实验工作台。",
};

const tools = [
  {
    number: "01",
    category: "FOCUS",
    title: "在线计时器",
    description: "正计时、倒计时和阶段记录，让每一段专注都有迹可循。",
    href: "/timer",
    action: "打开计时器",
  },
  {
    number: "02",
    category: "RESEARCH",
    title: "实验工作台",
    description: "整理实验记录、样品信息与研究过程，随时回到工作现场。",
    href: "/lab",
    action: "进入工作台",
  },
];

export default function ToolsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="/">Carry <span>/ 工具</span></a>
        <a className={styles.back} href="/">返回主页 <span aria-hidden="true">↗</span></a>
      </header>
      <section className={styles.content}>
        <p className={styles.eyebrow}>TOOLS & WORKSPACE</p>
        <h1>工具</h1>
        <p className={styles.intro}>专注时间，也整理研究。选择一个工具继续。</p>
        <div className={styles.grid}>
          {tools.map((tool) => (
            <a className={styles.card} href={tool.href} key={tool.href}>
              <div className={styles.cardTop}><span>{tool.number}</span><span>{tool.category}</span></div>
              <div>
                <h2>{tool.title}</h2>
                <p>{tool.description}</p>
              </div>
              <span className={styles.action}>{tool.action} <span aria-hidden="true">→</span></span>
            </a>
          ))}
        </div>
      </section>
      <footer className={styles.footer}>Carry · Personal Tools</footer>
    </main>
  );
}
