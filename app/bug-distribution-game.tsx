"use client";

import { CSSProperties, FormEvent, useState } from "react";
import QuestStepShell from "./quest-step-shell";
import RoboDuckFace from "./robo-duck-face";

const developers = [
  { id: "Аня", color: "#ff8c78", hair: "#60273f", line: "Я? Нет. Я вообще красивый код пишу. Это Борис.", variant: 0 },
  { id: "Борис", color: "#62c9e6", hair: "#17394b", line: "Не доказано. Зато Вика очень подозрительно молчит.", variant: 1 },
  { id: "Вика", color: "#b79cff", hair: "#39295f", line: "Я молчу, потому что Глеб уже всё сломал за меня.", variant: 2 },
  { id: "Глеб", color: "#ffd35e", hair: "#574126", line: "Клевета. Всё было сломано ещё при Ане.", variant: 3 },
] as const;

const times = ["10:00", "11:00", "12:00", "13:00"];

type SelectOption = { value: string; label: string; color?: string };

function QuestSelect({ value, placeholder, options, onChange, kind }: { value: string; placeholder: string; options: SelectOption[]; onChange: (value: string) => void; kind: "person" | "time" }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return <div className={`quest-select ${open ? "is-open" : ""}`} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button className="quest-select-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <i className={`quest-select-symbol symbol-${kind}`} style={selected?.color ? { "--select-color": selected.color } as CSSProperties : undefined}>{kind === "person" ? "●" : "◷"}</i>
      <span>{selected?.label ?? placeholder}</span>
      <b aria-hidden="true">⌄</b>
    </button>
    {open && <div className="quest-select-menu" role="listbox">
      {options.map((option, index) => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? "is-selected" : ""} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}>
        <i style={option.color ? { "--select-color": option.color } as CSSProperties : undefined}>{kind === "person" ? "●" : String(index + 10).padStart(2, "0")}</i>
        <span>{option.label}</span><b>{option.value === value ? "SELECTED" : "+"}</b>
      </button>)}
    </div>}
  </div>;
}

type BugDistributionGameProps = {
  totalErrors: number;
  totalHints: number;
  onError: () => void;
  onHint: () => void;
  onComplete: () => void;
  onNext: () => void;
  onExit: () => void;
};

function Person({ color, hair, variant }: { color: string; hair: string; variant: number }) {
  return <svg viewBox="0 0 120 130" aria-hidden="true">
    {variant === 1 ? <path d="M20 126c3-30 18-44 40-44s37 14 40 44" fill={color} stroke="#001524" strokeWidth="4" /> : <path d="M24 126c2-29 15-43 36-43s34 14 36 43" fill={color} stroke="#001524" strokeWidth="4" />}
    <path d="M48 79v15c7 7 17 7 24 0V79" fill="#f5c9ad" stroke="#001524" strokeWidth="4" />
    <path d="M35 43c0-24 12-35 27-35 17 0 28 13 27 36l-3 22c-3 16-13 24-26 24S38 81 35 65Z" fill="#f5c9ad" stroke="#001524" strokeWidth="4" />
    {variant === 0 && <><path d="M33 48C28 20 43 4 62 4c21 0 31 17 27 48l-12-18c-9 7-23 11-44 14Z" fill={hair} stroke="#001524" strokeWidth="4" /><path d="M33 45v34l9 6V40m46 3v34l-9 7V37" fill={hair} stroke="#001524" strokeWidth="4" /></>}
    {variant === 1 && <><path d="M34 45c-5-9 0-17 7-18-4-10 7-17 15-13 4-11 19-8 20 1 10-3 17 8 12 16 7 5 4 13 1 17-9-2-17-8-23-17-7 8-18 13-32 14Z" fill={hair} stroke="#001524" strokeWidth="4" /><path d="M31 126 43 99l17 12 17-12 13 27" fill="none" stroke="#001524" strokeWidth="3" /><path d="m60 111 0 15" stroke="#001524" strokeWidth="3" /></>}
    {variant === 2 && <><ellipse cx="91" cy="29" rx="15" ry="20" fill={hair} stroke="#001524" strokeWidth="4" /><path d="M34 47C31 18 46 4 64 5c18 0 28 15 25 43-9-3-18-10-23-20-7 10-17 16-32 19Z" fill={hair} stroke="#001524" strokeWidth="4" /><circle cx="86" cy="67" r="3" fill="#b79cff" stroke="#001524" strokeWidth="2" /><path d="M29 126 43 93l17 16 17-16 14 33" fill="none" stroke="#001524" strokeWidth="3" /></>}
    {variant === 3 && <><path d="M34 45C32 18 46 4 63 5c19 1 28 15 26 43l-9-11-8 5-7-12-9 11-8-6-14 10Z" fill={hair} stroke="#001524" strokeWidth="4" /><path d="M36 27C39 9 49 3 63 4c14 0 23 8 26 25Z" fill={color} stroke="#001524" strokeWidth="4" /><path d="M41 18h44" stroke="#001524" strokeWidth="3" /><rect x="39" y="103" width="42" height="15" rx="3" fill="#001524" opacity=".22" /></>}
    {variant === 0 && <><rect x="42" y="52" width="15" height="11" rx="4" fill="none" stroke="#001524" strokeWidth="3" /><rect x="65" y="52" width="15" height="11" rx="4" fill="none" stroke="#001524" strokeWidth="3" /><path d="M57 57h8" stroke="#001524" strokeWidth="3" /><path d="M54 73q7 7 15 0" fill="none" stroke="#001524" strokeWidth="3" strokeLinecap="round" /></>}
    {variant === 1 && <><path d="M45 56q5-4 10 0m12 0q5-4 10 0" fill="none" stroke="#001524" strokeWidth="3" strokeLinecap="round" /><path d="M54 72q8 3 15-2" fill="none" stroke="#001524" strokeWidth="3" strokeLinecap="round" /></>}
    {variant === 2 && <><path d="M44 55h11m13 0h11" stroke="#001524" strokeWidth="3" strokeLinecap="round" /><path d="M55 72h13" stroke="#001524" strokeWidth="3" strokeLinecap="round" /></>}
    {variant === 3 && <><path d="M45 56h9m15 0h9" stroke="#001524" strokeWidth="3" strokeLinecap="round" /><path d="M54 70q8 10 17 0" fill="none" stroke="#001524" strokeWidth="3" strokeLinecap="round" /></>}
  </svg>;
}

export default function BugDistributionGame({ totalErrors, totalHints, onError, onHint, onComplete, onNext, onExit }: BugDistributionGameProps) {
  const [person, setPerson] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<"ready" | "error" | "complete">("ready");
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!person || !time || status !== "ready") return;
    if (person === "Глеб" && time === "11:00") {
      setStatus("complete");
      onComplete();
      return;
    }
    setStatus("error");
    onError();
    window.setTimeout(() => setStatus("ready"), 2600);
  }

  function showHint() {
    if (!hintUsed) {
      setHintUsed(true);
      onHint();
    }
    setHintOpen(true);
  }

  return <QuestStepShell code="BUGS" step={2} title="Распределение багов" errors={totalErrors} hints={totalHints} onExit={onExit}>
    <section className={`bugs-layout bugs-${status}`}>
      <div className="bugs-brief">
        <span className="game-kicker">ЗАДАНИЕ 02 / ЛОГИЧЕСКИЙ ДЕБАГ</span>
        <h1>Следствие ведет<br /><em>тимлид</em></h1>
        <p>После обновления система дала сбой. Расследование показало, что причиной стало изменение в мобильном приложении. Четыре разработчика в тот день работали над разными частями системы и закончили работу в разное время. Восстановите журнал событий и выясните, кто внёс критический баг и во сколько.</p>
        <ol className="clue-stack">
          <li><b>01</b><span>Фронтенд исправили первым, базу данных — последней.</span></li>
          <li><b>02</b><span>Глеб закончил ровно на час позже Бориса.</span></li>
          <li><b>03</b><span>Аня исправляла бэкенд.</span></li>
          <li><b>04</b><span>Вика не работала ни с фронтендом, ни с мобильным приложением.</span></li>
        </ol>
        <button className="bugs-hint" type="button" onClick={showHint}><span>?</span>{hintUsed ? "ПОКАЗАТЬ ПОДСКАЗКУ" : "ПОЗВАТЬ РОБО-УТКУ"}</button>
        <div className={`bugs-duck-helper ${hintOpen ? "is-talking" : ""}`} aria-live="polite"><div className="duck-speech"><span>Сначала закрепите крайние значения: фронтенд — 10:00, база данных — 13:00. Затем исключайте занятые роли.</span><button type="button" onClick={() => setHintOpen(false)}>СПАСИБО!</button></div><RoboDuckFace /></div>
      </div>

      <div className="bugs-console">
        <div className="bugs-console-head"><span>TEAM_MATRIX / 4 USERS</span><b>ANALYSIS ACTIVE</b></div>
        <div className="developer-grid" role="list" aria-label="Выберите разработчика">
          {developers.map((developer, index) => <button type="button" role="listitem" key={developer.id} className={person === developer.id ? "is-selected" : ""} onClick={() => setPerson(developer.id)} style={{ "--person-color": developer.color, "--delay": `${index * 80}ms` } as CSSProperties}>
            <span className="developer-speech">{developer.line}</span>
            <Person color={developer.color} hair={developer.hair} variant={developer.variant} />
            <strong>{developer.id}</strong><small>DEV_0{index + 1}</small><i>{person === developer.id ? "SELECTED" : "SELECT"}</i>
          </button>)}
        </div>
        <form className="bugs-answer" onSubmit={checkAnswer}>
          <div className="bugs-field"><span>КТО ИСПРАВИЛ МОБИЛЬНЫЙ БАГ?</span><QuestSelect kind="person" value={person} placeholder="Выберите имя" onChange={setPerson} options={developers.map((developer) => ({ value: developer.id, label: developer.id, color: developer.color }))} /></div>
          <div className="bugs-field"><span>ВРЕМЯ ЗАВЕРШЕНИЯ</span><QuestSelect kind="time" value={time} placeholder="Выберите время" onChange={setTime} options={times.map((value) => ({ value, label: value }))} /></div>
          <button type="submit" disabled={!person || !time || status === "error"}>ПРОВЕРИТЬ ГИПОТЕЗУ <span>↗</span></button>
          <p aria-live="polite">{status === "error" ? "СВЯЗИ НЕ СХОДЯТСЯ — ПРОВЕРЬТЕ УСЛОВИЯ ЕЩЁ РАЗ" : `> ${person || "developer"} / ${time || "time"} / awaiting validation_`}</p>
        </form>
      </div>
    </section>

    {status === "complete" && <div className="fragment-modal-backdrop" role="presentation"><section className="fragment-modal" role="dialog" aria-modal="true" aria-labelledby="fragment-two-title">
      <div className="fragment-modal-head"><span>NODE_02 / RECOVERED</span><b>LOGIC VERIFIED</b></div><div className="fragment-icon" aria-hidden="true">✓</div><span>ПОЛУЧЕН ФРАГМЕНТ КОДА</span><strong id="fragment-two-title">2</strong><p>Модуль распределения багов восстановлен. Фрагмент сохранён в терминале.</p><div className="fragment-modal-actions"><button type="button" onClick={onNext}>СЛЕДУЮЩИЙ УРОВЕНЬ <span>03 ↗</span></button><button type="button" onClick={onExit}>НА ГЛАВНУЮ</button></div>
    </section></div>}
  </QuestStepShell>;
}
