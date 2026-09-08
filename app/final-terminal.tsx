"use client";

import { CSSProperties, useEffect, useState } from "react";
import { FINAL_CODE, GOOGLE_FORM } from "./quest-settings";
import QuestStepShell from "./quest-step-shell";
import RoboDuck from "./robo-duck";
import { loadQuestProgress, updateQuestProgress } from "./quest-storage";

type FinalTerminalProps = {
  errors: number;
  hints?: number;
  locked: boolean;
  onExit: () => void;
};

const FRAGMENT_SEQUENCE = [
  { node: "MEM", fragment: "CO", label: "Оперативная память" },
  { node: "BUGS", fragment: "2", label: "Распределение багов" },
  { node: "CIPHER", fragment: "DE", label: "Зашифрованное сообщение" },
  { node: "ALGO", fragment: "5", label: "Алгоритм" },
  { node: "NET", fragment: "6", label: "Соединение" },
] as const;

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
  const [collectedFragments, setCollectedFragments] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const progress = loadQuestProgress();
      const stored = new Set(progress.fragments);
      setCollectedFragments(FRAGMENT_SEQUENCE.filter(({ fragment }) => !locked || stored.has(fragment)).map(({ fragment }) => fragment));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [locked]);

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
      <section className={`final-page final-terminal-page ${result ? "is-finished" : ""}`}>
        <div className="final-terminal-window">
          <header className="final-terminal-bar">
            <span>root@aytipelag: /system/recovery</span>
            <b>{result ? "RESTORED" : locked ? "LOCKED" : "SECURE SESSION"}</b>
          </header>

          {!result ? <div className="final-terminal-body">
            <div className="terminal-boot-log" aria-live="polite">
              <p style={{ "--boot-delay": "120ms" } as CSSProperties}><span>&gt;</span> initializing recovery console...</p>
              <p style={{ "--boot-delay": "520ms" } as CSSProperties}><span>&gt;</span> scanning recovered nodes... <b>DONE</b></p>
              <p style={{ "--boot-delay": "920ms" } as CSSProperties}><span>&gt;</span> fragments received: <b>{collectedFragments.length}/5</b></p>
              <p style={{ "--boot-delay": "1320ms" } as CSSProperties}><span>&gt;</span> access status: <b>{locked ? "DENIED" : "READY"}</b><i className="terminal-cursor" /></p>
            </div>

            <div className="terminal-fragment-section">
              <div className="terminal-section-head"><span>$ ls -la /recovered/fragments</span><b>ORDER: ISSUED</b></div>
              <ol className="terminal-fragment-list">
                {FRAGMENT_SEQUENCE.map((item, index) => {
                  const received = collectedFragments.includes(item.fragment);
                  return <li className={received ? "is-received" : "is-locked"} key={item.node} style={{ "--fragment-delay": `${1.45 + index * .12}s` } as CSSProperties}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><small>[{item.node}]</small><strong>{item.label}</strong></div>
                    <code>{received ? item.fragment : "??"}</code>
                    <b>{received ? "RECEIVED" : "LOCKED"}</b>
                  </li>;
                })}
              </ol>
            </div>

            <aside className="terminal-final-hint">
              <p>{locked ? "Терминал разблокируется после последовательного завершения всех шести заданий." : "Соберите из буквенных фрагментов английское слово, обозначающее то, что создаёт программист. Затем объедините числовые фрагменты и добавьте получившееся число после слова."}</p>
            </aside>

            <div className="final-code-entry terminal-code-entry">
              <label htmlFor="final-code">root@aytipelag:~$ enter_final_code</label>
              <div><span>&gt;</span><input id="final-code" value={code} onChange={(event) => { setCode(event.target.value); if (codeError) setCodeError(""); }} placeholder="_ _ _ _ _ _ _" disabled={locked} autoComplete="off" spellCheck={false} /><button type="button" onClick={verifyCode} disabled={locked || !code.trim()}>ПРОВЕРИТЬ</button></div>
              {codeError && <p role="alert">{codeError}</p>}
            </div>
          </div> : <div className="final-success-screen">
            <div className="success-terminal-log" aria-hidden="true">
              <p><span>&gt;</span> validating final code... <b>OK</b></p>
              <p><span>&gt;</span> restoring system services... <b>100%</b></p>
              <p><span>&gt;</span> reboot complete <i className="terminal-cursor" /></p>
            </div>
            <div className="final-success-hero">
              <div><span>SYSTEM.STATUS / ONLINE</span><h1>Система<br /><em>восстановлена</em></h1><p>Все модули работают штатно. Код 256 принят центральным сервером.</p></div>
              <div className="final-dancing-duck" aria-label="Робо-утка празднует восстановление системы"><span className="duck-music-note">♪</span><RoboDuck /><i /><i /></div>
            </div>
            <div className="result-card terminal-result-card">
              <div className="result-status"><span>✓</span><div><small>СТАТУС</small><strong>КВЕСТ ПРОЙДЕН</strong></div></div>
              <dl><div><dt>Участник</dt><dd>{result.participant}</dd></div><div><dt>Код</dt><dd>{FINAL_CODE}</dd></div><div><dt>Время</dt><dd>{result.time}</dd></div><div><dt>Ошибки</dt><dd>{errors}</dd></div><div><dt>Подсказки</dt><dd>{hints}</dd></div><div><dt>Завершено</dt><dd>{result.finished}</dd></div></dl>
              <p>Система Айтипелага успешно восстановлена! Поздравляем с Днём программиста!</p>
              <div className="result-warning"><span>!</span><p><strong>ВАЖНО</strong>Для фиксации результата он должен быть отправлен в Google Forms. Откройте форму с помощью кнопки ниже.</p></div>
              <div className="result-actions">{GOOGLE_FORM.publicUrl && <a href={formUrl(GOOGLE_FORM.publicUrl)} target="_blank" rel="noreferrer">ОТКРЫТЬ GOOGLE FORMS ↗</a>}</div>
            </div>
          </div>}
          <footer className="final-terminal-footer"><span>● encrypted channel</span><b>{result ? "system.online" : "awaiting operator"}</b></footer>
        </div>
      </section>
    </QuestStepShell>
  );
}
