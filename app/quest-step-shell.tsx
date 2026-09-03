"use client";

import { ReactNode } from "react";

type QuestStepShellProps = {
  code: string;
  step: number | "FINAL";
  title: string;
  errors: number;
  hints?: number;
  onExit: () => void;
  children: ReactNode;
};

export default function QuestStepShell({ code, step, title, errors, hints = 0, onExit, children }: QuestStepShellProps) {
  return (
    <main className="game-shell">
      <div className="game-grid-bg" aria-hidden="true" />
      <header className="game-header">
        <button className="back-button" onClick={onExit} type="button">ГЛАВНАЯ</button>
        <div className="game-title"><span>[{code}]</span> {step !== "FINAL" && <i>0{step} / </i>}{title.toUpperCase()}</div>
        <div className="game-counters" aria-label={`Ошибки: ${errors}, подсказки: ${hints}`}>
          <div className="error-counter"><span>×</span><small>ОШИБКИ</small><strong>{String(errors).padStart(2, "0")}</strong></div>
          <div className="hint-counter"><span>?</span><small>ПОДСКАЗКИ</small><strong>{String(hints).padStart(2, "0")}</strong></div>
        </div>
      </header>
      {children}
    </main>
  );
}
