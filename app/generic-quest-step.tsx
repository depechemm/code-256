"use client";

import { QUEST_TASKS } from "./quest-config";
import QuestStepShell from "./quest-step-shell";

type GenericQuestStepProps = {
  taskId: number;
  errors: number;
  onExit: () => void;
};

export default function GenericQuestStep({ taskId, errors, onExit }: GenericQuestStepProps) {
  const task = QUEST_TASKS[taskId - 1];

  return (
    <QuestStepShell code={task.code} step={task.id} title={task.title} errors={errors} onExit={onExit}>
      <section className="step-skeleton">
        <div className="step-skeleton-copy">
          <span>КАРКАС ШАГА N / NODE_0{task.id}</span>
          <h1>{task.title}</h1>
          <p>Этот экран уже подключён к общей навигации, проверке доступа и сохранению прогресса. Интерактивную механику шага можно добавить отдельным компонентом, не меняя контроллер квеста.</p>
          <div className="skeleton-meta"><div><small>ВРЕМЯ</small><strong>{task.time}</strong></div><div><small>ФРАГМЕНТ</small><strong>{task.fragment}</strong></div><div><small>СТАТУС</small><strong>AWAITING BUILD</strong></div></div>
          <button type="button" onClick={onExit}>ВЕРНУТЬСЯ К КАРТЕ <b>↗</b></button>
        </div>
        <div className="step-blueprint" aria-label="Схема будущего задания">
          <div className="blueprint-head"><span>STEP_COMPONENT_{String(task.id).padStart(2, "0")}</span><b>ISOLATED</b></div>
          <div className="blueprint-body"><span>01</span><i /><span>02</span><i /><span>03</span><i /><strong>&lt; GAME_MECHANIC /&gt;</strong></div>
          <div className="blueprint-foot">input → validate → persist → unlock_next</div>
        </div>
      </section>
    </QuestStepShell>
  );
}
