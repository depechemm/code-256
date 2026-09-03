"use client";

import { FormEvent, useEffect, useState } from "react";
import MemoryGame from "./memory-game";
import GenericQuestStep from "./generic-quest-step";
import FinalTerminal from "./final-terminal";
import { QUEST_TASKS } from "./quest-config";

const modules = QUEST_TASKS;

export default function Home() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [activeModule, setActiveModule] = useState(0);
  const [view, setView] = useState<"home" | "task1" | "taskN" | "final">("home");
  const [selectedTask, setSelectedTask] = useState(1);
  const [memoryRound, setMemoryRound] = useState(0);
  const [taskOneComplete, setTaskOneComplete] = useState(false);
  const [totalErrors, setTotalErrors] = useState(0);
  const [fragments, setFragments] = useState<string[]>([]);
  const currentDate = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date());

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const participant = localStorage.getItem("participant");
      const savedProgress = localStorage.getItem("taskProgress");
      if (participant) { setName(participant); setStarted(true); }
      setTotalErrors(Number(localStorage.getItem("errors") ?? 0));
      setFragments(JSON.parse(localStorage.getItem("fragments") ?? "[]") as string[]);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress) as { memoryRound?: number; task1Complete?: boolean };
        setMemoryRound(progress.memoryRound ?? 0);
        const isComplete = Boolean(progress.task1Complete);
        setTaskOneComplete(isComplete);
        setActiveModule(isComplete ? 1 : 0);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  function saveMemoryProgress(round: number, complete = taskOneComplete) {
    localStorage.setItem("taskProgress", JSON.stringify({ memoryRound: round, task1Complete: complete }));
  }

  function openTask(taskId: number) {
    if (!started || (taskId > 1 && !taskOneComplete)) return;
    setSelectedTask(taskId);
    setView(taskId === 1 ? "task1" : "taskN");
  }

  function registerError() {
    setTotalErrors((current) => {
      const next = current + 1;
      localStorage.setItem("errors", String(next));
      return next;
    });
  }

  function completeMemory() {
    setTaskOneComplete(true);
    setMemoryRound(5);
    saveMemoryProgress(5, true);
    localStorage.setItem("fragments", JSON.stringify(["CO"]));
    setFragments(["CO"]);
    localStorage.setItem("currentStage", "2");
    setActiveModule(1);
  }

  function startQuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (started) return;
    const participant = name.trim().replace(/\s+/g, " ");
    if (participant.length < 3 || !participant.includes(" ")) {
      setError("Введите имя и фамилию, чтобы мы записали ваш результат.");
      return;
    }
    localStorage.setItem("participant", participant);
    localStorage.setItem("startedAt", Date.now().toString());
    localStorage.setItem("currentStage", "1");
    setName(participant);
    setError("");
    setStarted(true);
    setView("task1");
  }

  if (view === "task1") {
    return <MemoryGame initialRound={memoryRound} totalErrors={totalErrors} onError={registerError} onProgress={(round) => { setMemoryRound(round); saveMemoryProgress(round); }} onComplete={completeMemory} onExit={() => setView("home")} />;
  }

  if (view === "taskN") return <GenericQuestStep taskId={selectedTask} errors={totalErrors} onExit={() => setView("home")} />;
  if (view === "final") return <FinalTerminal errors={totalErrors} fragments={fragments} locked onExit={() => setView("home")} />;

  return (
    <main className="landing-shell">
      <div className="preloader" aria-hidden="true">
        <div className="loader-terminal">
          <div className="loader-logo">&gt;_</div>
          <div className="loader-copy">
            <span>АЙТИПЕЛАГ / CODE 256</span>
            <strong>ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ</strong>
          </div>
          <div className="loader-track"><i /></div>
          <div className="loader-readout"><span>[||||||||||||||||]</span><b>READY</b></div>
        </div>
      </div>
      <div className="noise" aria-hidden="true" />
      <div className="orbit orbit-one" aria-hidden="true" />
      <div className="orbit orbit-two" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Айтипелаг, на главную"><span className="brand-mark" aria-hidden="true">&gt;_</span><span>айтипелаг</span></a>
        {started && <nav className="quest-navigation" aria-label="Навигация по заданиям">{QUEST_TASKS.map((task) => {
          const unlocked = task.id === 1 || (task.id === 2 && taskOneComplete);
          return <button type="button" key={task.id} disabled={!unlocked} onClick={() => openTask(task.id)} title={unlocked ? task.title : "Сначала завершите предыдущее задание"}><span>0{task.id}</span><b>{task.code}</b>{!unlocked && <i>×</i>}</button>;
        })}</nav>}
        <div className="system-status"><span className="status-dot" /><span>system.online</span><b suppressHydrationWarning>{currentDate}</b></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span>01</span> Индивидуальный online-квест</div>
          <h1>Восстанови<span className="title-code" data-text="КОД 256">КОД 256</span></h1>
          <p className="lead">Система Айтипелага дала сбой. Шесть модулей отключены, а финальный код разбит на фрагменты. У тебя есть час, чтобы вернуть всё в строй.</p>
          <div className="metrics" aria-label="Параметры квеста">
            <div><strong>06</strong><span>заданий</span></div><div><strong>60</strong><span>минут</span></div><div><strong>01</strong><span>финальный код</span></div>
          </div>
          <form className="start-form" onSubmit={startQuest} noValidate>
            <label htmlFor="participant">Как к вам обращаться?</label>
            <div className={`input-row ${error ? "has-error" : ""}`}>
              <span aria-hidden="true">$</span>
              <input id="participant" name="participant" value={name} onChange={(event) => setName(event.target.value)} placeholder="Имя и фамилия" autoComplete="name" readOnly={started} aria-describedby={error ? "name-error" : undefined} aria-invalid={Boolean(error)} />
              <button type={started ? "button" : "submit"} onClick={started ? () => openTask(1) : undefined}><span>{started ? "Перейти к заданию 01" : "Начать квест"}</span><span aria-hidden="true">&#8599;</span></button>
            </div>
            {error && <p className="form-error" id="name-error">! {error}</p>}
            {started && <p className="form-success">✓ Профиль найден. Можно продолжить с первого доступного задания.</p>}
          </form>
          <p className="privacy-note"><span>[ i ]</span> Прогресс хранится только в вашем браузере.</p>
        </div>

        <aside className="system-map" aria-label="Модули квеста">
          <div className="map-head"><div><span className="status-dot" /> QUEST DIRECTORY</div><span>6 NODES</span></div>
          <div className="terminal-list">
            <p className="terminal-command"><span>$</span> ls -la /nodes <i className="terminal-cursor" /></p>
            <div className="node-list">
              {modules.map((module, index) => {
                const currentIndex = taskOneComplete ? 1 : 0;
                const isDone = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isLocked = index > currentIndex;
                return (
                <button
                  className={`node-row ${activeModule === index ? "is-active" : ""} ${isCurrent ? "is-current" : ""} ${isDone ? "is-done" : ""}`}
                  key={module.code}
                  type="button"
                  onClick={() => started && !isLocked ? openTask(module.id) : setActiveModule(index)}
                  onMouseEnter={() => !isLocked && setActiveModule(index)}
                  aria-pressed={activeModule === index}
                  disabled={started && isLocked}
                >
                  <span className="node-number">0{index + 1}</span>
                  <span className="node-copy"><strong>[{module.code}] <b>{module.title}</b></strong><small>◉ {module.time} · фрагмент: <em>{module.fragment}</em></small></span>
                  <span className="node-action">{isDone ? "DONE" : isCurrent ? "ACTIVE" : isLocked ? "LOCKED" : activeModule === index ? "OPEN" : "+"}</span>
                </button>
              )})}
            </div>
            <button className="final-node" type="button" disabled aria-label="Финальный терминал заблокирован">
              <span className="node-number">★</span><span className="node-copy"><strong>[SERVER] <b>Финальный терминал</b></strong><small>Доступ после доставки кода</small></span><span className="locked">LOCKED</span>
            </button>
          </div>
          <div className="map-footer"><p><span>&gt;</span> {activeModule === 6 ? "access denied: complete all nodes" : `active node: 0${taskOneComplete ? 2 : 1} / ${modules[taskOneComplete ? 1 : 0].code}`}</p><div className="signal" aria-hidden="true"><i /><i /><i /><i /><i /></div></div>
        </aside>
      </section>

      <section className="rules-strip" aria-labelledby="rules-title">
        <div className="rules-heading"><span>02 / ПРОТОКОЛ</span><h2 id="rules-title">Перед стартом</h2></div>
        <ol className="rules-grid">
          <li><span>01</span><p>Проходите квест <strong>индивидуально</strong> и не публикуйте ответы в общем чате.</p></li>
          <li><span>02</span><p>Не используйте <strong>поиск, ИИ</strong> и помощь коллег. Доверьтесь своей логике.</p></li>
          <li><span>03</span><p>Основное время — <strong>60 минут</strong>. Завершить прохождение можно до 75 минут.</p></li>
        </ol>
      </section>
    </main>
  );
}
