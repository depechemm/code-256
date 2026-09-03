"use client";

import QuestStepShell from "./quest-step-shell";

type FinalTerminalProps = {
  errors: number;
  fragments: string[];
  locked: boolean;
  onExit: () => void;
};

export default function FinalTerminal({ errors, fragments, locked, onExit }: FinalTerminalProps) {
  return (
    <QuestStepShell code="SERVER" step="FINAL" title="Финальный терминал" errors={errors} onExit={onExit}>
      <section className="final-skeleton">
        <div className="final-ascii" aria-hidden="true">{`┌──────────────────┐\n│  CENTRAL SERVER  │\n│  [ ${locked ? "LOCKED" : "READY"} ]       │\n└────────┬─────────┘\n         │`}</div>
        <span>ФИНАЛЬНЫЙ УЗЕЛ / ACCESS CONTROL</span>
        <h1>{locked ? "Доступ закрыт" : "Собери код"}</h1>
        <p>{locked ? "Терминал разблокируется только после последовательного завершения всех шести заданий." : "Все модули восстановлены. Используй полученные фрагменты, чтобы собрать финальный код."}</p>
        <div className="fragment-slots">{Array.from({ length: 5 }, (_, index) => <i key={index}>{fragments[index] ?? "??"}</i>)}</div>
        <button type="button" disabled={locked}>{locked ? "LOCKED / 6 STEPS REQUIRED" : "ВВЕСТИ ФИНАЛЬНЫЙ КОД"}</button>
      </section>
    </QuestStepShell>
  );
}
