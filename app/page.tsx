"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import MemoryGame from "./memory-game";
import BugDistributionGame from "./bug-distribution-game";
import GenericQuestStep from "./generic-quest-step";
import FinalTerminal from "./final-terminal";
import { QUEST_TASKS } from "./quest-config";
import { loadQuestProgress, updateQuestProgress } from "./quest-storage";

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
  const [totalHints, setTotalHints] = useState(0);
  const [currentStage, setCurrentStage] = useState(1);
  const [completedTaskNotice, setCompletedTaskNotice] = useState<number | null>(null);
  const currentDate = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date());

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const progress = loadQuestProgress();
      if (progress.participant) { setName(progress.participant); setStarted(true); }
      setTotalErrors(progress.errors);
      setTotalHints(progress.hints);
      setCurrentStage(progress.currentStage);
      setMemoryRound(progress.memoryRound);
      setTaskOneComplete(progress.task1Complete);
      setActiveModule(Math.min(Math.max(progress.currentStage - 1, 0), QUEST_TASKS.length - 1));
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  function saveMemoryProgress(round: number, complete = taskOneComplete) {
    updateQuestProgress({ memoryRound: round, task1Complete: complete });
  }

  function openTask(taskId: number) {
    if (!started || taskId > currentStage) return;
    setActiveModule(taskId - 1);
    if (taskId < currentStage) {
      setCompletedTaskNotice(taskId);
      return;
    }
    setSelectedTask(taskId);
    setView(taskId === 1 ? "task1" : "taskN");
  }

  function continueQuest() {
    if (currentStage > QUEST_TASKS.length) {
      setView("final");
      return;
    }
    openTask(currentStage);
  }

  function registerError() {
    setTotalErrors((current) => {
      const next = current + 1;
      updateQuestProgress({ errors: next });
      return next;
    });
  }

  function registerHint() {
    setTotalHints((current) => {
      const next = current + 1;
      updateQuestProgress({ hints: next });
      return next;
    });
  }

  function completeMemory() {
    const progress = loadQuestProgress();
    setTaskOneComplete(true);
    setMemoryRound(5);
    saveMemoryProgress(5, true);
    updateQuestProgress({ fragments: Array.from(new Set([...progress.fragments, "CO"])), currentStage: Math.max(progress.currentStage, 2), memoryRound: 5, task1Complete: true });
    setCurrentStage((stage) => Math.max(stage, 2));
    setActiveModule(1);
  }

  function completeBugDistribution() {
    const progress = loadQuestProgress();
    updateQuestProgress({ task2Complete: true, fragments: Array.from(new Set([...progress.fragments, "2"])), currentStage: Math.max(progress.currentStage, 3) });
    setCurrentStage((stage) => Math.max(stage, 3));
    setActiveModule(2);
  }

  function startQuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (started) return;
    const participant = name.trim().replace(/\s+/g, " ");
    if (participant.length < 3 || !participant.includes(" ")) {
      setError("Введите имя и фамилию, чтобы мы записали ваш результат.");
      return;
    }
    updateQuestProgress({ participant, startedAt: Date.now(), currentStage: 1, status: "active" });
    setName(participant);
    setError("");
    setStarted(true);
    setView("task1");
  }

  if (view === "task1") {
    return <MemoryGame initialRound={memoryRound} totalErrors={totalErrors} totalHints={totalHints} onError={registerError} onHint={registerHint} onProgress={(round) => { setMemoryRound(round); saveMemoryProgress(round); }} onComplete={completeMemory} onNext={() => { setSelectedTask(2); setView("taskN"); }} onExit={() => setView("home")} />;
  }

  if (view === "taskN" && selectedTask === 2) return <BugDistributionGame totalErrors={totalErrors} totalHints={totalHints} onError={registerError} onHint={registerHint} onComplete={completeBugDistribution} onNext={() => { setSelectedTask(3); setView("taskN"); }} onExit={() => setView("home")} />;
  if (view === "taskN") return <GenericQuestStep taskId={selectedTask} errors={totalErrors} onExit={() => setView("home")} />;
  if (view === "final") return <FinalTerminal errors={totalErrors} hints={totalHints} locked={currentStage < 7} onExit={() => setView("home")} />;

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
        <a className="brand" href="#top" aria-label="Айтипелаг, на главную"><span className="brand-mark" aria-hidden="true"><Image src="/aytipelag-logo.png" alt="" width={750} height={354} priority /></span><span>айтипелаг</span></a>
        {started && <nav className="quest-navigation" aria-label="Навигация по заданиям">{QUEST_TASKS.map((task) => {
          const unlocked = task.id <= currentStage;
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
              <button type={started ? "button" : "submit"} onClick={started ? continueQuest : undefined}><span>{started ? currentStage > QUEST_TASKS.length ? "Открыть финальный терминал" : `Перейти к заданию ${String(currentStage).padStart(2, "0")}` : "Начать квест"}</span><span aria-hidden="true">&#8599;</span></button>
            </div>
            {error && <p className="form-error" id="name-error">! {error}</p>}
            {started && <p className="form-success">✓ Профиль найден. Можно продолжить с текущего доступного задания.</p>}
          </form>
          <p className="privacy-note"><span>[ i ]</span> Прогресс хранится только в вашем браузере.</p>
        </div>

        <aside className="system-map" aria-label="Модули квеста">
          <div className="map-head"><div><span className="status-dot" /> QUEST DIRECTORY</div><span>6 NODES</span></div>
          <div className="terminal-list">
            <p className="terminal-command"><span>$</span> ls -la /nodes <i className="terminal-cursor" /></p>
            <div className="node-list">
              {modules.map((module, index) => {
                const currentIndex = Math.min(currentStage - 1, modules.length - 1);
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
                  <span className="node-copy"><strong>[{module.code}] <b>{module.title}</b></strong><small>◉ {module.time} · фрагмент: <em>{isDone ? module.fragment : "???"}</em></small></span>
                  <span className="node-action">{isDone ? "DONE" : isCurrent ? "ACTIVE" : isLocked ? "LOCKED" : activeModule === index ? "OPEN" : "+"}</span>
                </button>
              )})}
            </div>
            <button className="final-node" type="button" disabled={currentStage < 7} onClick={() => setView("final")} aria-label={currentStage < 7 ? "Финальный терминал заблокирован" : "Открыть финальный терминал"}>
              <span className="node-number">★</span><span className="node-copy"><strong>[SERVER] <b>Финальный терминал</b></strong><small>Доступ после доставки кода</small></span><span className="locked">LOCKED</span>
            </button>
          </div>
          <div className="map-footer"><p><span>&gt;</span> {currentStage > 6 ? "all nodes complete / server ready" : `active node: 0${currentStage} / ${modules[currentStage - 1]?.code}`}</p><div className="signal" aria-hidden="true"><i /><i /><i /><i /><i /></div></div>
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
      {completedTaskNotice !== null && (() => {
        const task = QUEST_TASKS[completedTaskNotice - 1];
        return <div className="completed-notice-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCompletedTaskNotice(null); }}>
          <section className="completed-notice" role="dialog" aria-modal="true" aria-labelledby="completed-notice-title">
            <div className="completed-notice-head"><span>NODE_0{task.id} / ARCHIVED</span><b>COMPLETE</b></div>
            <div className="completed-notice-icon" aria-hidden="true">✓</div><span>ЗАДАНИЕ УЖЕ ПРОЙДЕНО</span>
            <h2 id="completed-notice-title">Поздравляем!</h2>
            <p>Вы уже восстановили модуль «{task.title}». Повторный запуск не требуется — результат и фрагмент сохранены.</p>
            <div className="completed-notice-fragment"><small>ФРАГМЕНТ КОДА</small><strong>{task.fragment}</strong></div>
            <button type="button" onClick={() => setCompletedTaskNotice(null)}>ПОНЯТНО</button>
          </section>
        </div>;
      })()}
    </main>
  );
}
