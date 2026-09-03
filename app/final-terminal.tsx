"use client";

import { useState } from "react";
import { FINAL_CODE, GOOGLE_FORM } from "./quest-settings";
import QuestStepShell from "./quest-step-shell";
import { loadQuestProgress, updateQuestProgress } from "./quest-storage";

type FinalTerminalProps = {
  errors: number;
  hints?: number;
  locked: boolean;
  onExit: () => void;
};

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function FinalTerminal({ errors, hints = 0, locked, onExit }: FinalTerminalProps) {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [result, setResult] = useState<{ participant: string; time: string; finished: string } | null>(null);

  function submitResult(nextResult: { participant: string; time: string }) {
    try {
      const targetName = `google-form-${Date.now()}`;
      const iframe = document.createElement("iframe");
      iframe.name = targetName;
      iframe.hidden = true;
      document.body.appendChild(iframe);

      const form = document.createElement("form");
      form.method = "POST";
      form.action = GOOGLE_FORM.submitUrl;
      form.target = targetName;
      form.hidden = true;
      const [hours, minutes] = nextResult.time.split(":");
      const values: Record<string, string> = {
        [`entry.${GOOGLE_FORM.fields.participant}`]: nextResult.participant,
        [`entry.${GOOGLE_FORM.fields.code}`]: FINAL_CODE,
        [`entry.${GOOGLE_FORM.fields.time}_hour`]: hours,
        [`entry.${GOOGLE_FORM.fields.time}_minute`]: minutes,
        [`entry.${GOOGLE_FORM.fields.hints}`]: String(hints),
      };
      if (GOOGLE_FORM.fields.errors) values[`entry.${GOOGLE_FORM.fields.errors}`] = String(errors);
      Object.entries(values).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
      window.setTimeout(() => {
        form.remove();
        iframe.remove();
      }, 1400);
    } catch {
      return;
    }
  }

  function verifyCode() {
    const normalized = code.replace(/\s+/g, "").toUpperCase();
    if (normalized !== FINAL_CODE) {
      setCodeError("Код не принят. Соберите буквенные и числовые фрагменты ещё раз.");
      return;
    }
    const now = new Date();
    const progress = loadQuestProgress();
    const startedAt = progress.startedAt ?? now.getTime();
    const nextResult = {
      participant: progress.participant || "Участник",
      time: formatDuration(now.getTime() - startedAt),
      finished: now.toLocaleString("ru-RU"),
    };
    updateQuestProgress({ finishedAt: now.getTime(), status: "completed" });
    setResult(nextResult);
    setCode(FINAL_CODE);
    setCodeError("");
    submitResult(nextResult);
  }

  function formUrl(baseUrl: string) {
    if (!result || !baseUrl) return baseUrl;
    const url = new URL(baseUrl);
    url.searchParams.set("usp", "pp_url");
    const [hours, minutes] = result.time.split(":");
    url.searchParams.set(`entry.${GOOGLE_FORM.fields.participant}`, result.participant);
    url.searchParams.set(`entry.${GOOGLE_FORM.fields.code}`, FINAL_CODE);
    url.searchParams.set(`entry.${GOOGLE_FORM.fields.time}_hour`, hours);
    url.searchParams.set(`entry.${GOOGLE_FORM.fields.time}_minute`, minutes);
    url.searchParams.set(`entry.${GOOGLE_FORM.fields.hints}`, String(hints));
    if (GOOGLE_FORM.fields.errors) url.searchParams.set(`entry.${GOOGLE_FORM.fields.errors}`, String(errors));
    return url.toString();
  }

  return (
    <QuestStepShell code="SERVER" step="FINAL" title="Финальный терминал" errors={errors} hints={hints} onExit={onExit}>
      <section className={`final-page ${result ? "is-finished" : ""}`}>
        <div className="final-panel">
          <span>ФИНАЛЬНЫЙ УЗЕЛ / ACCESS CONTROL</span>
          <h1>{result ? "Система восстановлена" : locked ? "Доступ закрыт" : "Собери код"}</h1>
          {!result && <p>{locked ? "Терминал разблокируется после последовательного завершения всех шести заданий." : "Сначала собери английское слово, обозначающее то, что создаёт программист. Затем добавь номер дня года, в который отмечается День программиста."}</p>}

          {!result && <div className="final-code-entry">
            <label htmlFor="final-code">ФИНАЛЬНЫЙ КОД</label>
            <div><span>&gt;</span><input id="final-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="_ _ _ _ _ _ _" disabled={locked} /><button type="button" onClick={verifyCode} disabled={locked}>ПРОВЕРИТЬ</button></div>
            {codeError && <p>! {codeError}</p>}
          </div>}

          {result && <div className="result-card">
            <div className="result-status"><span>✓</span><div><small>СТАТУС</small><strong>КВЕСТ ПРОЙДЕН</strong></div></div>
            <dl><div><dt>Участник</dt><dd>{result.participant}</dd></div><div><dt>Код</dt><dd>{FINAL_CODE}</dd></div><div><dt>Время</dt><dd>{result.time}</dd></div><div><dt>Ошибки</dt><dd>{errors}</dd></div><div><dt>Подсказки</dt><dd>{hints}</dd></div><div><dt>Завершено</dt><dd>{result.finished}</dd></div></dl>
            <p>Код 256 принят. Система Айтипелага успешно восстановлена! Поздравляем с Днём программиста!</p>
            <div className="result-warning"><span>!</span><p><strong>ВАЖНО</strong>Для фиксации результата он должен быть отправлен в Google Forms. Дождитесь подтверждения отправки ниже.</p></div>
            <div className="result-actions">{GOOGLE_FORM.publicUrl && <a href={formUrl(GOOGLE_FORM.publicUrl)} target="_blank" rel="noreferrer">ОТКРЫТЬ GOOGLE FORMS ↗</a>}</div>
          </div>}
        </div>

      </section>
    </QuestStepShell>
  );
}
