import Timer from "./timer";
import styles from "./timer.module.css";

export const metadata = {
  title: "计时器 | Carry",
  description: "支持正计时、倒计时和阶段记录的在线计时器。",
};

export default function TimerPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/">Carry<span> / 工具</span></a>
        <a className={styles.back} href="/tools">返回工具页 <span aria-hidden="true">↗</span></a>
      </header>
      <Timer />
      <footer className={styles.footer}>专注当下，把握每一段时间。</footer>
    </main>
  );
}
