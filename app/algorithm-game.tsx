"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import QuestStepShell from "./quest-step-shell";
import RoboDuckFace from "./robo-duck-face";

type AlgorithmGameProps = {
  totalErrors: number;
  totalHints: number;
  onError: () => void;
  onHint: () => void;
  onComplete: () => void;
  onNext: () => void;
  onExit: () => void;
};

const branches = ["even", "even", "even", "odd"] as const;

export default function AlgorithmGame({ totalErrors, totalHints, onError, onHint, onComplete, onNext, onExit }: AlgorithmGameProps) {
  const [status, setStatus] = useState<"idle" | "running" | "ready" | "error" | "complete">("idle");
  const [activeLine, setActiveLine] = useState(1);
  const [iteration, setIteration] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const runId = useRef(0);

  useEffect(() => () => { runId.current += 1; }, []);

  async function pause(milliseconds: number, currentRun: number) {
    await new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    return runId.current === currentRun;
  }

  async function runAlgorithm() {
    if (status === "running" || status === "complete") return;
    const currentRun = ++runId.current;
    setStatus("running");
    setAnswer("");
    setIteration(0);
    setActiveLine(1);
    if (!await pause(650, currentRun)) return;

    for (let index = 0; index < branches.length; index += 1) {
      setIteration(index + 1);
      setActiveLine(2);
      if (!await pause(520, currentRun)) return;
      setActiveLine(3);
      if (!await pause(520, currentRun)) return;
      if (branches[index] === "odd") {
        setActiveLine(5);
        if (!await pause(360, currentRun)) return;
      }
      setActiveLine(branches[index] === "even" ? 4 : 6);
      if (!await pause(720, currentRun)) return;
      setActiveLine(7);
      if (!await pause(360, currentRun)) return;
    }
    setActiveLine(8);
    setStatus("ready");
  }

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "ready" && status !== "error") return;
    if (answer.trim() === "23") {
      setStatus("complete");
      setActiveLine(8);
      onComplete();
      return;
    }
    setStatus("error");
    onError();
    window.setTimeout(() => setStatus((current) => current === "error" ? "ready" : current), 2600);
  }

  function showHint() {
    if (!hintUsed) { setHintUsed(true); onHint(); }
    setHintOpen(true);
  }

  return <QuestStepShell code="ALGO" step={4} title="Выполни алгоритм" errors={totalErrors} hints={totalHints} onExit={onExit}>
    <section className={`algorithm-layout algorithm-${status}`}>
      <div className="algorithm-copy">
        <span className="game-kicker">ЗАДАНИЕ 04 / EXECUTION TRACE</span>
        <h1>Выполни<br /><em>алгоритм</em></h1>
        <p>Проследи изменение переменной <b>x</b> на каждой итерации и введи её итоговое значение.</p>
        <div className="iteration-track" aria-label={`Текущая итерация: ${iteration} из 4`}>
          {branches.map((_, index) => <span key={index} className={iteration > index ? iteration === index + 1 && status === "running" ? "current" : "done" : ""}>{iteration > index && !(iteration === index + 1 && status === "running") ? "✓" : `0${index + 1}`}</span>)}
        </div>
        <div className="algorithm-status" aria-live="polite"><strong>{status === "idle" ? "ПРОГРАММА ЗАГРУЖЕНА" : status === "running" ? `ВЫПОЛНЯЕТСЯ ИТЕРАЦИЯ ${iteration}/4` : status === "error" ? "ЗНАЧЕНИЕ НЕВЕРНО" : status === "complete" ? "АЛГОРИТМ ВЫПОЛНЕН" : "ВЫЧИСЛЕНИЕ ЗАВЕРШЕНО"}</strong><span>{status === "running" ? "Следи за активной строкой псевдокода" : status === "error" ? "Проверь записанные значения после каждого повтора" : status === "ready" ? "Введи получившееся значение x" : "Начальное значение: x = 6"}</span></div>
        {status === "idle" && <button className="game-start" type="button" onClick={() => void runAlgorithm()}>ЗАПУСТИТЬ АЛГОРИТМ <span>↗</span></button>}
        {status !== "idle" && status !== "running" && <button className="algorithm-replay" type="button" onClick={() => void runAlgorithm()} disabled={status === "complete"}>ПОВТОРИТЬ ТРАССИРОВКУ</button>}
        <button className="bugs-hint" type="button" onClick={showHint}><span>?</span>{hintUsed ? "ПОКАЗАТЬ ПОДСКАЗКУ" : "ПОЗВАТЬ РОБО-УТКУ"}</button>
        <div className={`algorithm-duck-helper ${hintOpen ? "is-talking" : ""}`} aria-live="polite"><div className="duck-speech"><span>Кря! Заведи четыре строчки в черновике — по одной на каждый круг. Иначе икс убежит, он такой.</span><button type="button" onClick={() => setHintOpen(false)}>СПАСИБО!</button></div><RoboDuckFace /></div>
      </div>

      <div className="algorithm-terminal">
        <div className="algorithm-head"><span>ALGORITHM.PSEUDO / READ ONLY</span><b>{status === "running" ? "RUNNING" : status === "complete" ? "COMPLETE" : "READY"}</b></div>
        <div className="pseudocode" aria-label="Псевдокод алгоритма">
          <div className={activeLine === 1 ? "active" : ""}><i>01</i><code>x ← <em>6</em></code></div>
          <div className={activeLine === 2 ? "active" : ""}><i>02</i><code><b>FOR</b> i ← 1 <b>TO</b> 4 <b>DO</b></code></div>
          <div className={activeLine === 3 ? "active" : ""}><i>03</i><code>    <b>IF</b> x MOD 2 = 0 <b>THEN</b></code></div>
          <div className={activeLine === 4 ? "active branch-even" : ""}><i>04</i><code>        x ← x / 2 + <em>7</em></code></div>
          <div className={activeLine === 5 ? "active" : ""}><i>05</i><code>    <b>ELSE</b></code></div>
          <div className={activeLine === 6 ? "active branch-odd" : ""}><i>06</i><code>        x ← x × 2 − <em>3</em></code></div>
          <div className={activeLine === 7 ? "active" : ""}><i>07</i><code><b>END FOR</b></code></div>
          <div className={activeLine === 8 ? "active" : ""}><i>08</i><code><b>RETURN</b> x</code></div>
        </div>
        <div className="execution-register"><span>ITERATION</span><strong>{String(iteration).padStart(2, "0")} / 04</strong><span>REGISTER X</span><strong>{iteration === 0 ? "06" : status === "complete" ? "23" : "??"}</strong></div>
        <form className="algorithm-answer" onSubmit={checkAnswer}><label htmlFor="algorithm-result">ИТОГОВОЕ ЗНАЧЕНИЕ X</label><div><span>x =</span><input id="algorithm-result" inputMode="numeric" autoComplete="off" value={answer} onChange={(event) => setAnswer(event.target.value.replace(/[^0-9-]/g, ""))} placeholder="?" disabled={status === "idle" || status === "running" || status === "complete"} /><button type="submit" disabled={!answer || status === "idle" || status === "running" || status === "complete"}>ПРОВЕРИТЬ <b>↗</b></button></div>{status === "error" && <p>РЕЗУЛЬТАТ НЕ СОВПАЛ — ПРОЙДИ ЧЕТЫРЕ ИТЕРАЦИИ ЕЩЁ РАЗ</p>}</form>
      </div>
    </section>

    {status === "complete" && <div className="fragment-modal-backdrop" role="presentation"><section className="fragment-modal" role="dialog" aria-modal="true" aria-labelledby="fragment-four-title"><div className="fragment-modal-head"><span>NODE_04 / EXECUTED</span><b>RETURN 23</b></div><div className="fragment-icon" aria-hidden="true">✓</div><span>ПОЛУЧЕН ФРАГМЕНТ КОДА</span><strong id="fragment-four-title">5</strong><p>Алгоритм выполнен без ошибок. Фрагмент сохранён в терминале.</p><div className="fragment-modal-actions"><button type="button" onClick={onNext}>СЛЕДУЮЩИЙ УРОВЕНЬ <span>05 ↗</span></button><button type="button" onClick={onExit}>НА ГЛАВНУЮ</button></div></section></div>}
  </QuestStepShell>;
}
