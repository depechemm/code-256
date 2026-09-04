"use client";

import { DragEvent, FormEvent, useState } from "react";
import QuestStepShell from "./quest-step-shell";
import RoboDuckFace from "./robo-duck-face";

const targetOrder = "GHEXJ";
const decoded = "DEBUG";

function rotateLetter(letter: string, backwardSteps: number) {
  const code = letter.charCodeAt(0) - 65;
  return String.fromCharCode(((code - backwardSteps + 26) % 26) + 65);
}

type CipherGameProps = {
  totalErrors: number;
  totalHints: number;
  onError: () => void;
  onHint: () => void;
  onComplete: () => void;
  onNext: () => void;
  onExit: () => void;
};

export default function CipherGame({ totalErrors, totalHints, onError, onHint, onComplete, onNext, onExit }: CipherGameProps) {
  const [letters, setLetters] = useState(() => "JXEHG".split(""));
  const [dragged, setDragged] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<"order" | "shift" | "finishing" | "complete">("order");
  const [feedback, setFeedback] = useState<"idle" | "error">("idle");
  const [shifts, setShifts] = useState([0, 0, 0, 0, 0]);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  function moveLetter(from: number, to: number) {
    if (from === to || phase !== "order" || feedback === "error") return;
    setLetters((current) => {
      const next = [...current];
      const [letter] = next.splice(from, 1);
      next.splice(to, 0, letter);
      return next;
    });
  }

  function drop(event: DragEvent<HTMLButtonElement>, index: number) {
    event.preventDefault();
    if (dragged !== null) moveLetter(dragged, index);
    setDragged(null);
  }

  function selectTile(index: number) {
    if (phase !== "order" || feedback === "error") return;
    if (selected === null) {
      setSelected(index);
      return;
    }
    moveLetter(selected, index);
    setSelected(null);
  }

  function checkCipher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedback === "error" || phase === "finishing" || phase === "complete") return;
    const valid = phase === "order" ? letters.join("") === targetOrder : letters.map((letter, index) => rotateLetter(letter, shifts[index])).join("") === decoded;
    if (!valid) {
      setFeedback("error");
      onError();
      window.setTimeout(() => setFeedback("idle"), 2600);
      return;
    }
    if (phase === "order") {
      setSelected(null);
      setPhase("shift");
      return;
    }
    setPhase("finishing");
    window.setTimeout(() => {
      setPhase("complete");
      onComplete();
    }, 1200);
  }

  function changeShift(index: number, change: number) {
    if (phase !== "shift" || feedback === "error") return;
    setShifts((current) => current.map((value, position) => position === index ? Math.min(9, Math.max(0, value + change)) : value));
  }

  function showHint() {
    if (!hintUsed) { setHintUsed(true); onHint(); }
    setHintOpen(true);
  }

  return <QuestStepShell code="CIPHER" step={3} title="Зашифрованное сообщение" errors={totalErrors} hints={totalHints} onExit={onExit}>
    <section className={`cipher-layout cipher-${phase} cipher-${feedback}`}>
      <div className="cipher-copy">
        <span className="game-kicker">ЗАДАНИЕ 03 / REVERSE CIPHER</span>
        <h1>Разверни.<br /><em>Сдвинь.</em><br />Прочитай.</h1>
        <p>Во время сбоя строка перевернулась, а каждая буква сдвинулась на три позиции вперёд по английскому алфавиту.</p>
        <div className="cipher-rule"><span>01</span><p>Восстанови порядок букв, перетаскивая плитки.</p><span>02</span><p>Вручную поверни каждый алфавитный ротор на <b>−3</b>.</p></div>
        <button className="bugs-hint" type="button" onClick={showHint}><span>?</span>{hintUsed ? "ПОКАЗАТЬ ПОДСКАЗКУ" : "ПОЗВАТЬ РОБО-УТКУ"}</button>
      </div>

      <form className="cipher-terminal" onSubmit={checkCipher}>
        <div className="cipher-head"><span>CIPHER_BUFFER / SHIFT: +3</span><b>{phase === "complete" ? "DECRYPTED" : phase === "shift" ? "ROTORS ONLINE" : "CORRUPTED"}</b></div>
        <div className="cipher-source"><small>ПЕРЕХВАЧЕННАЯ СТРОКА</small><strong>JXEHG</strong><i>REVERSE → SHIFT −3</i></div>
        <div className="cipher-workspace">
          <div className="cipher-label"><span>{phase === "order" ? "ЭТАП 01 / СОБЕРИ ОБРАТНЫЙ ПОРЯДОК" : "ЭТАП 01 / ПОРЯДОК ВОССТАНОВЛЕН"}</span><b>{letters.join("")}</b></div>
          <div className="cipher-tiles" aria-label="Плитки зашифрованного сообщения">
            {letters.map((letter, index) => <button key={letter} type="button" draggable={phase === "order" && feedback !== "error"} disabled={phase !== "order"} className={`${dragged === index ? "is-dragging" : ""} ${selected === index ? "is-selected" : ""}`} onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, index)} onDragEnd={() => setDragged(null)} onClick={() => selectTile(index)} aria-label={`Буква ${letter}, позиция ${index + 1}`}><small>0{index + 1}</small><strong>{letter}</strong><i>{phase === "order" ? "⋮⋮" : "✓"}</i></button>)}
          </div>
          {phase === "order" && <p className="cipher-mobile-note">На телефоне нажми на плитку, затем на новую позицию.</p>}
          <div className="rotor-panel" aria-live="polite">
            <div className="rotor-heading"><span>ЭТАП 02 / АЛФАВИТНЫЕ РОТОРЫ</span><b>{shifts.reduce((sum, value) => sum + value, 0)} СДВИГОВ</b></div>
            <div className="cipher-rotors">{letters.map((letter, index) => <div className={shifts[index] === 3 ? "is-calibrated" : ""} key={letter}><button type="button" onClick={() => changeShift(index, -1)} disabled={phase !== "shift"} aria-label={`Сдвинуть ${letter} вперёд`}>+1</button><strong>{phase === "order" ? "·" : rotateLetter(letter, shifts[index])}</strong><button type="button" onClick={() => changeShift(index, 1)} disabled={phase !== "shift"} aria-label={`Сдвинуть ${letter} назад`}>−1</button><small>SHIFT −{shifts[index]}</small></div>)}</div>
          </div>
        </div>
        <div className="cipher-actions"><p>{feedback === "error" ? phase === "order" ? "ПОРЯДОК НЕВЕРНЫЙ — ПРОВЕРЬ НАПРАВЛЕНИЕ ЧТЕНИЯ" : "РАСШИФРОВКА НЕ СХОДИТСЯ — ПРОВЕРЬ КАЖДЫЙ РОТОР" : phase === "shift" ? "> rotors unlocked / set every letter to shift -3_" : phase === "finishing" ? "> validating plaintext..." : phase === "complete" ? "> plaintext recovered: DEBUG" : "> awaiting reconstructed buffer_"}</p><button type="submit" disabled={feedback === "error" || phase === "finishing" || phase === "complete"}>{phase === "shift" ? "ПРОВЕРИТЬ РАСШИФРОВКУ" : "ПРОВЕРИТЬ ПОРЯДОК"} <span>↗</span></button></div>
      </form>
    </section>

    {hintOpen && <div className="hint-backdrop" role="presentation"><section className="bugs-hint-dialog" role="dialog" aria-modal="true" aria-labelledby="cipher-hint-title"><RoboDuckFace /><div><small>РОБО-УТКА / CRYPTO ASSIST</small><h2 id="cipher-hint-title">Кря! У строки просто случился разворот не туда.</h2><p>Первое действие — прочитать строку справа налево. Как носки после стирки: сначала разверни, потом разбирайся, что получилось.</p><button type="button" onClick={() => setHintOpen(false)}>СПАСИБО, РАЗВЕРНУ</button></div></section></div>}

    {phase === "complete" && <div className="fragment-modal-backdrop" role="presentation"><section className="fragment-modal" role="dialog" aria-modal="true" aria-labelledby="fragment-three-title"><div className="fragment-modal-head"><span>NODE_03 / DECRYPTED</span><b>MESSAGE RECOVERED</b></div><div className="fragment-icon" aria-hidden="true">✓</div><span>ПОЛУЧЕН ФРАГМЕНТ КОДА</span><strong id="fragment-three-title">DE</strong><p>Сообщение DEBUG восстановлено. Новый фрагмент сохранён в терминале.</p><div className="fragment-modal-actions"><button type="button" onClick={onNext}>СЛЕДУЮЩИЙ УРОВЕНЬ <span>04 ↗</span></button><button type="button" onClick={onExit}>НА ГЛАВНУЮ</button></div></section></div>}
  </QuestStepShell>;
}
