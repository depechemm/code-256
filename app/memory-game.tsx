"use client";

import { useEffect, useRef, useState } from "react";
import { MEMORY_ROUNDS } from "./quest-config";
import QuestStepShell from "./quest-step-shell";

type MemoryGameProps = {
  initialRound: number;
  totalErrors: number;
  onError: () => void;
  onProgress: (round: number) => void;
  onComplete: () => void;
  onExit: () => void;
};

function makeSequence(length: number) {
  const sequence: number[] = [];
  while (sequence.length < length) {
    const next = Math.floor(Math.random() * 16);
    if (next !== sequence.at(-1)) sequence.push(next);
  }
  return sequence;
}

export default function MemoryGame({ initialRound, totalErrors, onError, onProgress, onComplete, onExit }: MemoryGameProps) {
  const [round, setRound] = useState(Math.min(initialRound, 5));
  const [sequence, setSequence] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [litCell, setLitCell] = useState<number | null>(null);
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
    void playSequence(makeSequence(MEMORY_ROUNDS[round]));
  }

  function selectCell(cell: number) {
    if (status !== "input") return;
    const nextInput = [...input, cell];
    setInput(nextInput);

    if (sequence[nextInput.length - 1] !== cell) {
      onError();
      setStatus("error");
      window.setTimeout(() => void playSequence(makeSequence(MEMORY_ROUNDS[round]), totalErrors + 1), 900);
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
        onProgress(nextRound);
        window.setTimeout(() => void playSequence(makeSequence(MEMORY_ROUNDS[nextRound])), 1100);
      }
    }
  }

  return (
    <QuestStepShell code="MEM" step={1} title="Оперативная память" errors={totalErrors} onExit={onExit}>
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
          {status === "complete" && <button className="game-start" onClick={onExit} type="button">ЗАБРАТЬ ФРАГМЕНТ <span>CO</span></button>}
        </div>

        <div className={`memory-board-wrap state-${status}`}>
          <div className="board-meta"><span>MEMORY_ARRAY[4×4]</span><b>ROUND {round + 1}/6</b></div>
          <div className="memory-board" aria-label="Поле памяти 4 на 4">
            {Array.from({ length: 16 }, (_, cell) => (
              <button key={cell} type="button" onClick={() => selectCell(cell)} disabled={status !== "input"} className={litCell === cell ? "is-lit" : input.includes(cell) && status === "input" ? "is-entered" : ""} aria-label={`Ячейка ${cell + 1}`}>
                <span>{String(cell + 1).padStart(2, "0")}</span><i />
              </button>
            ))}
          </div>
          <div className="board-footer"><span>&gt; {status === "showing" ? "transmitting pattern..." : status === "input" ? "awaiting input_" : "memory bus ready"}</span><b>{MEMORY_ROUNDS[round]} SIGNALS</b></div>
        </div>
      </section>
    </QuestStepShell>
  );
}
