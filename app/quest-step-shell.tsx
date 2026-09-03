"use client";

import { ReactNode } from "react";

type QuestStepShellProps = {
  code: string;
  step: number | "FINAL";
  title: string;
  errors: number;
  onExit: () => void;
  children: ReactNode;
};

export default function QuestStepShell({ code, step, title, errors, onExit, children }: QuestStepShellProps) {
  return (
    <main className="game-shell">
      <div className="game-grid-bg" aria-hidden="true" />
      <header className="game-header">
        <button className="back-button" onClick={onExit} type="button">← / ГЛАВНАЯ</button>
        <div className="game-title"><span>[{code}]</span> {title.toUpperCase()}</div>
        <div className="game-errors">{step === "FINAL" ? "ТЕРМИНАЛ" : `ШАГ 0${step}`} <strong>{step === "FINAL" ? "★" : String(errors).padStart(2, "0")}</strong></div>
      </header>
      {children}
    </main>
  );
}
