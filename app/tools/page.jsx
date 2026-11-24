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
        <div className={styles.eyebrow}><span>TOOLS & WORKSPACE</span><i>PERSONAL TOOLKIT · 02</i></div>
        <h1>专注与研究，<br /><span>都可以更顺手。</span></h1>
        <p className={styles.intro}>从一段专注时间，到一次实验记录。把常用工具放在一起，让想法更快开始。</p>
        <div className={styles.highlights}>
          <span><i>01</i> 专注计时</span>
          <span><i>02</i> 实验记录</span>
          <span><i>↗</i> 即开即用</span>
        </div>
        <div className={styles.grid}>
          {tools.map((tool) => (
            <a className={`${styles.card} ${tool.number === "01" ? styles.timerCard : styles.labCard}`} href={tool.href} key={tool.href}>
              <div className={styles.cardTop}><span>{tool.number} <i>/ TOOL</i></span><span>{tool.category}</span></div>
              {tool.number === "01" ? (
                <div className={styles.timerArtwork} aria-hidden="true">
                  <span className={styles.artRing} />
                  <span className={styles.artClock}>25<span>:</span>00</span>
                  <span className={styles.artCaption}>A MOMENT FOR FOCUS</span>
                </div>
              ) : (
                <div className={styles.labArtwork} aria-hidden="true">
                  <span className={styles.labPaper}><i>LAB NOTEBOOK</i><b>Sample record</b><em /><em /><em /></span>
                  <span className={styles.labMark}>✳</span>
                </div>
              )}
              <div className={styles.cardCopy}>
                <h2>{tool.title}</h2>
                <p>{tool.description}</p>
              </div>
              <span className={styles.action}>{tool.action} <span aria-hidden="true">→</span></span>
            </a>
          ))}
        </div>
        <p className={styles.note}><span /> 所有工具均可从这里快速进入</p>
      </section>
      <footer className={styles.footer}>Carry · Personal Tools</footer>
    </main>
  );
}
