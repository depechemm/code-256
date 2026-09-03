"use client";

import { useEffect, useRef, useState } from "react";
import { MEMORY_ROUNDS } from "./quest-config";
import QuestStepShell from "./quest-step-shell";

type MemoryGameProps = {
  initialRound: number;
  totalErrors: number;
  totalHints: number;
  onError: () => void;
  onHint: () => void;
  onProgress: (round: number) => void;
  onComplete: () => void;
  onNext: () => void;
  onExit: () => void;
};

function RoboDuck() {
  return <svg viewBox="0 0 100 88" role="img" aria-label="Робо-утка">
    <ellipse cx="48" cy="62" rx="34" ry="22" fill="#ffd65a" stroke="#001524" strokeWidth="3" />
    <circle cx="57" cy="35" r="25" fill="#ffe477" stroke="#001524" strokeWidth="3" />
    <path d="M34 57c-13 0-22-4-29-12 0 17 9 28 28 28" fill="#ffd65a" stroke="#001524" strokeWidth="3" strokeLinecap="round" />
    <path d="m79 39 16 6-16 8c-2-4-2-9 0-14Z" fill="#ff9a4a" stroke="#001524" strokeWidth="3" strokeLinejoin="round" />
    <path d="M32 35C32 15 43 5 59 5c17 0 28 12 28 33l-8 8H39l-7-11Z" fill="#c8d4dc" stroke="#001524" strokeWidth="3" />
    <path d="M38 30c2-13 9-19 21-19 13 0 21 8 22 22l-5 4H41Z" fill="#001524" />
    <path d="M38 31h42v13c-11 5-28 5-42 0Z" fill="#061b28" stroke="#001524" strokeWidth="2" />
    <path d="M43 35h32" stroke="#00a7e1" strokeWidth="6" strokeLinecap="round" />
    <path d="M46 35v5m6-5v5m6-5v5m6-5v5m6-5v5" stroke="#d8f8ff" strokeWidth="2" />
    <path d="M40 46h37l-5 10H44Z" fill="#9babb5" stroke="#001524" strokeWidth="2.5" />
    <path d="M47 50h20" stroke="#00a7e1" strokeWidth="2" strokeDasharray="3 3" />
    <path d="M29 61c8-10 20-10 29 0-8 10-20 10-29 0Z" fill="#ffc84a" stroke="#001524" strokeWidth="2.5" />
    <path d="M37 61h13" stroke="#001524" strokeWidth="2" strokeLinecap="round" />
    <path d="M35 82v3m27-3v3" stroke="#ff9a4a" strokeWidth="4" strokeLinecap="round" />
  </svg>;
}

function makeSequence(length: number) {
  const sequence: number[] = [];
  while (sequence.length < length) {
    const next = Math.floor(Math.random() * 16);
    if (next !== sequence.at(-1)) sequence.push(next);
  }
  return sequence;
}

export default function MemoryGame({ initialRound, totalErrors, totalHints, onError, onHint, onProgress, onComplete, onNext, onExit }: MemoryGameProps) {
  const [round, setRound] = useState(Math.min(initialRound, 5));
  const [sequence, setSequence] = useState<number[]>([]);
  const [masterSequence] = useState(() => makeSequence(8));
  const [input, setInput] = useState<number[]>([]);
  const [litCell, setLitCell] = useState<number | null>(null);
  const [pressedCell, setPressedCell] = useState<number | null>(null);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [hintUsedRound, setHintUsedRound] = useState(false);
  const [duckTalking, setDuckTalking] = useState(false);
  const [status, setStatus] = useState<"briefing" | "showing" | "input" | "error" | "roundDone" | "complete">("briefing");
  const runId = useRef(0);

  useEffect(() => () => { runId.current += 1; }, []);

  async function playSequence(nextSequence: number[], errorCount = totalErrors) {
    const currentRun = ++runId.current;
    setSequence(nextSequence);
    setInput([]);
    setStatus("showing");
    const lightTime = errorCount >= 3 ? 850 : 650;

    await new Promise((resolve) => window.setTimeout(resolve, 350));
    for (const cell of nextSequence) {
      if (runId.current !== currentRun) return;
      setLitCell(cell);
      await new Promise((resolve) => window.setTimeout(resolve, lightTime));
      setLitCell(null);
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    if (runId.current === currentRun) setStatus("input");
  }

  function startRound() {
    setHintUsedRound(false);
    void playSequence(masterSequence.slice(0, MEMORY_ROUNDS[round]));
  }

  function useHint() {
    if (status !== "input" || hintUsedRound) return;
    const nextCell = sequence[input.length];
    setHintUsedRound(true);
    setDuckTalking(true);
    setHintCell(nextCell);
    onHint();
  }

  function closeHint() {
    setHintCell(null);
    setDuckTalking(false);
  }

  function selectCell(cell: number) {
    if (status !== "input") return;
    setPressedCell(cell);
    window.setTimeout(() => setPressedCell(null), 240);
    const nextInput = [...input, cell];
    setInput(nextInput);

    if (sequence[nextInput.length - 1] !== cell) {
      onError();
      setStatus("error");
      window.setTimeout(() => void playSequence(masterSequence.slice(0, MEMORY_ROUNDS[round]), totalErrors + 1), 900);
      return;
    }

    if (nextInput.length === sequence.length) {
      if (round === MEMORY_ROUNDS.length - 1) {
        setStatus("complete");
        onComplete();
      } else {
        const nextRound = round + 1;
        setStatus("roundDone");
        setRound(nextRound);
        setHintUsedRound(false);
        onProgress(nextRound);
        window.setTimeout(() => void playSequence(masterSequence.slice(0, MEMORY_ROUNDS[nextRound])), 1100);
      }
    }
  }

  return (
    <QuestStepShell code="MEM" step={1} title="Оперативная память" errors={totalErrors} hints={totalHints} onExit={onExit}>
      <section className="memory-layout">
        <div className="memory-copy">
          <span className="game-kicker">ЗАДАНИЕ 01 / ПРОТОКОЛ ПАМЯТИ</span>
          <h1>Повтори<br /><em>сигнал</em></h1>
          <p>Запомни последовательность импульсов и повтори её, нажимая на ячейки в том же порядке.</p>
          <div className="round-track">
            {MEMORY_ROUNDS.map((length, index) => <span key={length} className={index < round ? "done" : index === round ? "current" : ""}>{index < round ? "✓" : `0${index + 1}`}</span>)}
          </div>
          <div className={`game-message message-${status}`}>
            {status === "briefing" && <><strong>СИСТЕМА ГОТОВА</strong><span>Раунд {round + 1} · последовательность из {MEMORY_ROUNDS[round]} сигналов</span></>}
            {status === "showing" && <><strong>СМОТРИ ВНИМАТЕЛЬНО</strong><span>Ввод временно заблокирован</span></>}
            {status === "input" && <><strong>ТВОЙ ХОД</strong><span>Введено {input.length} из {sequence.length}</span></>}
            {status === "error" && <><strong>СБОЙ ПОСЛЕДОВАТЕЛЬНОСТИ</strong><span>Пока не сходится. Проверь логику и попробуй ещё раз</span></>}
            {status === "roundDone" && <><strong>РАУНД ПРОЙДЕН</strong><span>Загружаем следующий паттерн...</span></>}
            {status === "complete" && <><strong>МОДУЛЬ ВОССТАНОВЛЕН</strong><span>Получен фрагмент кода: CO</span></>}
          </div>
          {status === "briefing" && <button className="game-start" onClick={startRound} type="button">ЗАПУСТИТЬ СИГНАЛ <span>↗</span></button>}
          {status === "input" && <button className="hint-button" onClick={useHint} type="button" disabled={hintUsedRound}><span>?</span>{hintUsedRound ? "ПОДСКАЗКА ИСПОЛЬЗОВАНА" : "ПОЗВАТЬ РОБО-УТКУ"}<b>{totalHints}</b></button>}
          <div className={`duck-helper ${duckTalking ? "is-talking" : ""}`} aria-live="polite">
            <div className="duck-speech"><span>Кря! Вот следующий импульс — запоминай.</span><button type="button" onClick={closeHint}>СПАСИБО!</button></div><RoboDuck />
          </div>
        </div>

        <div className={`memory-board-wrap state-${status}`}>
          <div className="board-meta"><span>MEMORY_ARRAY[4×4]</span><b>ROUND {round + 1}/6</b></div>
          <div className="memory-board" aria-label="Поле памяти 4 на 4">
            {Array.from({ length: 16 }, (_, cell) => (
              <button key={cell} type="button" onClick={() => selectCell(cell)} disabled={status !== "input" || duckTalking} className={litCell === cell ? "is-lit" : hintCell === cell ? "is-hint" : pressedCell === cell ? "is-pressed" : input.includes(cell) && status === "input" ? "is-entered" : ""} aria-label={`Ячейка ${cell + 1}`}>
                <span>{String(cell + 1).padStart(2, "0")}</span><i />
              </button>
            ))}
          </div>
          <div className="board-footer"><span>&gt; {status === "showing" ? "transmitting pattern..." : status === "input" ? "awaiting input_" : "memory bus ready"}</span><b>{MEMORY_ROUNDS[round]} SIGNALS</b></div>
        </div>
      </section>
      {status === "complete" && <div className="fragment-modal-backdrop" role="presentation">
        <section className="fragment-modal" role="dialog" aria-modal="true" aria-labelledby="fragment-title">
          <div className="fragment-modal-head"><span>NODE_01 / RECOVERED</span><b>ACCESS GRANTED</b></div>
          <div className="fragment-icon" aria-hidden="true">✓</div>
          <span>ПОЛУЧЕН ФРАГМЕНТ КОДА</span>
          <strong id="fragment-title">CO</strong>
          <p>Модуль оперативной памяти восстановлен. Фрагмент сохранён в терминале.</p>
          <div className="fragment-modal-actions"><button type="button" onClick={onNext}>СЛЕДУЮЩИЙ УРОВЕНЬ <span>02 ↗</span></button><button type="button" onClick={onExit}>НА ГЛАВНУЮ</button></div>
        </section>
      </div>}
    </QuestStepShell>
  );
}
