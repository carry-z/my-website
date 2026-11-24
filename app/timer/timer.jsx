"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./timer.module.css";

function formatTime(milliseconds, showMilliseconds = false) {
  const safeTime = Math.max(milliseconds, 0);
  const seconds = Math.floor(safeTime / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (showMilliseconds) {
    const millis = Math.floor(safeTime % 1000);
    return {
      values: [String(minutes).padStart(2, "0"), String(remainder).padStart(2, "0"), String(millis).padStart(3, "0")],
      labels: ["分", "秒", "毫秒"],
      text: `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}.${String(millis).padStart(3, "0")}`,
    };
  }

  const values = [hours, minutes, remainder].map((value) => String(value).padStart(2, "0"));
  return { values, labels: ["小时", "分钟", "秒"], text: values.join(":") };
}

export default function Timer() {
  const [mode, setMode] = useState("countdown");
  const [hours, setHours] = useState("00");
  const [minutes, setMinutes] = useState("25");
  const [seconds, setSeconds] = useState("00");
  const [milliseconds, setMilliseconds] = useState("000");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const [lastLapAt, setLastLapAt] = useState(0);
  const startedAt = useRef(0);

  const duration = (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000 + Number(milliseconds);
  const remaining = Math.max(duration - elapsed, 0);
  const shownMilliseconds = mode === "countdown" ? Number(hours) === 0 : elapsed < 3600000;
  const shownTime = formatTime(mode === "countdown" ? remaining : elapsed, shownMilliseconds);
  const sliderMinutes = Math.min(Number(hours) * 60 + Number(minutes), 180);

  useEffect(() => {
    if (!running) return undefined;

    const tick = () => {
      const nextElapsed = Math.max(Date.now() - startedAt.current, 0);
      if (mode === "countdown" && nextElapsed >= duration) {
        setElapsed(duration);
        setRunning(false);
        return;
      }
      setElapsed(nextElapsed);
    };

    const interval = window.setInterval(tick, 10);
    tick();
    return () => window.clearInterval(interval);
  }, [running, mode, duration]);

  function updateDuration(setter, value, max) {
    const digits = value.replace(/\D/g, "").slice(0, max === 999 ? 3 : 2);
    const normalized = Math.min(Number(digits || 0), max);
    setter(String(normalized).padStart(max === 999 ? 3 : 2, "0"));
    if (setter === setHours && normalized > 0) setMilliseconds("000");
    setElapsed(0);
    setLaps([]);
    setLastLapAt(0);
  }

  function updateFromSlider(value) {
    const totalMinutes = Number(value);
    setHours(String(Math.floor(totalMinutes / 60)).padStart(2, "0"));
    setMinutes(String(totalMinutes % 60).padStart(2, "0"));
    setSeconds("00");
    setMilliseconds("000");
    setElapsed(0);
    setLaps([]);
    setLastLapAt(0);
  }

  function changeMode(nextMode) {
    if (running || mode === nextMode) return;
    setMode(nextMode);
    setElapsed(0);
    setLaps([]);
    setLastLapAt(0);
  }

  function toggleTimer() {
    if (running) {
      setElapsed(Math.max(Date.now() - startedAt.current, 0));
      setRunning(false);
      return;
    }
    if (mode === "countdown" && duration <= 0) return;
    startedAt.current = Date.now() - elapsed;
    setRunning(true);
  }

  function resetTimer() {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    setLastLapAt(0);
  }

  function recordLap() {
    const total = running ? Math.max(Date.now() - startedAt.current, 0) : elapsed;
    setLaps((current) => [{ id: Date.now(), total, split: total - lastLapAt }, ...current]);
    setLastLapAt(total);
  }

  const canStart = mode !== "countdown" || duration > 0;

  return (
    <section className={styles.timerWrap} aria-label="在线计时器">
      <div className={styles.intro}>
        <p className={styles.kicker}>FOCUS · TIME</p>
        <h1>把时间，交还给专注。</h1>
        <p>设置一段属于自己的节奏，开始计时，也别忘了记录每个阶段。</p>
      </div>

      <div className={styles.timerCard}>
        <div className={styles.modeSwitch} role="tablist" aria-label="计时模式">
          <button className={mode === "countdown" ? styles.modeActive : ""} onClick={() => changeMode("countdown")} role="tab" aria-selected={mode === "countdown"} disabled={running}>倒计时</button>
          <button className={mode === "countup" ? styles.modeActive : ""} onClick={() => changeMode("countup")} role="tab" aria-selected={mode === "countup"} disabled={running}>正计时</button>
        </div>

        <div className={`${styles.clock} ${mode === "countdown" && remaining === 0 && elapsed > 0 ? styles.finished : ""}`} aria-live="off" aria-label={shownMilliseconds ? `${shownTime.values[0]}分${shownTime.values[1]}秒${shownTime.values[2]}毫秒` : shownTime.text}>
          {shownTime.values.map((part, index) => (
            <span className={styles.clockPart} key={index}>
              <strong>{part}</strong>
              <small>{shownTime.labels[index]}</small>
            </span>
          ))}
        </div>

        {mode === "countdown" ? (
          <div className={styles.durationSetup}>
            <label className={styles.sliderLabel} htmlFor="duration-slider">
              <span>滑动选时</span>
              <strong>{formatTime(duration, Number(hours) === 0).text}</strong>
            </label>
            <input
              id="duration-slider"
              className={styles.durationSlider}
              type="range"
              min="0"
              max="180"
              step="1"
              value={sliderMinutes}
              aria-label="滑动设置倒计时时间，0 到 180 分钟"
              disabled={running}
              onChange={(event) => updateFromSlider(event.target.value)}
            />
            <div className={styles.sliderScale} aria-hidden="true"><span>0 分钟</span><span>60 分钟</span><span>120 分钟</span><span>180 分钟</span></div>
            <fieldset className={styles.durationFields} disabled={running}>
              <legend>精确设置倒计时时长</legend>
              {[[hours, setHours, 99, "小时"], [minutes, setMinutes, 59, "分钟"], [seconds, setSeconds, 59, "秒"], ...(Number(hours) === 0 ? [[milliseconds, setMilliseconds, 999, "毫秒"]] : [])].map(([value, setter, max, label]) => (
                <label className={styles.durationField} key={label}>
                  <span>{label}</span>
                  <input inputMode="numeric" aria-label={label} value={value} maxLength={max === 999 ? 3 : 2} onChange={(event) => updateDuration(setter, event.target.value, max)} onBlur={(event) => setter(String(Number(event.target.value || 0)).padStart(max === 999 ? 3 : 2, "0"))} />
                </label>
              ))}
            </fieldset>
            <p className={styles.precisionHint}>{Number(hours) === 0 ? "分钟模式 · 精确到毫秒" : "小时模式 · 精确到秒"}</p>
          </div>
        ) : (
          <p className={styles.modeHint}>正计时从 00:00 开始；一小时内显示毫秒，超过一小时显示到秒。</p>
        )}

        <div className={styles.controls}>
          <button className={styles.primaryButton} onClick={toggleTimer} disabled={!running && !canStart}>{running ? "暂停" : elapsed > 0 ? "继续" : "开始"}</button>
          <button className={styles.secondaryButton} onClick={resetTimer} disabled={!running && elapsed === 0 && laps.length === 0}>重置</button>
          <button className={styles.lapButton} onClick={recordLap} disabled={!running}>记录中间时间 <span aria-hidden="true">＋</span></button>
        </div>
      </div>

      <section className={styles.lapPanel} aria-labelledby="lap-title">
        <div className={styles.lapHeading}>
          <div><p className={styles.kicker}>TIME MARKS</p><h2 id="lap-title">中间时间</h2></div>
          <span>{String(laps.length).padStart(2, "0")} 条记录</span>
        </div>
        {laps.length ? (
          <ol className={styles.lapList}>
            {laps.map((lap, index) => (
              <li key={lap.id}>
                <span className={styles.lapIndex}>记录 {String(laps.length - index).padStart(2, "0")}</span>
                <span><small>阶段用时</small><strong>{formatTime(lap.split, mode === "countup" ? lap.split < 3600000 : Number(hours) === 0).text}</strong></span>
                <span><small>累计用时</small><strong>{formatTime(lap.total, mode === "countup" ? lap.total < 3600000 : Number(hours) === 0).text}</strong></span>
              </li>
            ))}
          </ol>
        ) : <p className={styles.emptyLaps}>开始计时后，点击“记录中间时间”保存当前阶段。</p>}
      </section>
    </section>
  );
}
