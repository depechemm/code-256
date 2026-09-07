"use client";

import { useEffect, useRef, useState } from "react";
import QuestStepShell from "./quest-step-shell";
import RoboDuckTop from "./robo-duck-top";
import RoboDuckFace from "./robo-duck-face";
import { loadQuestProgress, updateQuestProgress } from "./quest-storage";

type Direction = "N" | "E" | "S" | "W";
type Position = { col: number; row: number };
type Action = "ВПЕРЕД" | "НАЛЕВО" | "НАПРАВО";
type Condition = "ВПЕРЕДИ_СВОБОДНО" | "СПРАВА_СВОБОДНО" | "СЛЕВА_СВОБОДНО";
type Program = { firstCondition: Condition; first: Action; condition: Condition; second: Action; third: Action };
type Status = "idle" | "running" | "failed" | "success";

const START = { col: 1, row: 5 };
const SERVER = { col: 5, row: 1 };
const ROUTE = ["1-5", "1-4", "1-3", "2-3", "3-3", "3-2", "3-1", "4-1", "5-1"];
const FREE = new Set(ROUTE);
const DIRECTIONS: Direction[] = ["N", "E", "S", "W"];
const FAILURE = "Алгоритм не доставил робота до сервера. Проверь условия и команды.";
const vectors: Record<Direction, Position> = { N: { col: 0, row: -1 }, E: { col: 1, row: 0 }, S: { col: 0, row: 1 }, W: { col: -1, row: 0 } };
type Props = { totalErrors: number; totalHints: number; onError: () => void; onHint: () => void; onComplete: () => void; onFinal: () => void; onExit: () => void };

const keyOf = (p: Position) => `${p.col}-${p.row}`;
const turn = (f: Direction, side: "left" | "right") => DIRECTIONS[(DIRECTIONS.indexOf(f) + (side === "left" ? 3 : 1)) % 4];
const ahead = (p: Position, f: Direction) => ({ col: p.col + vectors[f].col, row: p.row + vectors[f].row });
const isFree = (p: Position) => p.col >= 0 && p.col < 6 && p.row >= 0 && p.row < 6 && FREE.has(keyOf(p));
const normalize = (line: string) => line.trim().toUpperCase().replace(/Ё/g, "Е").replace(/[();{}]/g, "").replace(/\s+/g, " ");

function parseCode(source: string): { program?: Program; error?: string; sourceLines: number[] } {
  const raw = source.split("\n");
  const useful = raw.map((text, index) => ({ text: normalize(text), index })).filter(({ text }) => text && !text.startsWith("//"));
  const lines = useful.map(({ text }) => text);
  if (!lines.length) return { error: "Сначала напиши программу.", sourceLines: [] };
  if (lines.length !== 9) return { error: "Проверь структуру: программа должна содержать 9 строк, включая два КОНЕЦ.", sourceLines: useful.map(({ index }) => index) };
  if (lines[0] !== "ПОКА НЕ СЕРВЕР") return { error: "Строка 1: программа должна начинаться с «ПОКА НЕ СЕРВЕР».", sourceLines: useful.map(({ index }) => index) };
  if (!lines[1].startsWith("ЕСЛИ ")) return { error: "Строка 2: ожидалось условие ЕСЛИ.", sourceLines: useful.map(({ index }) => index) };
  if (!lines[3].startsWith("ИНАЧЕ ЕСЛИ ")) return { error: "Строка 4: ожидалась ветка ИНАЧЕ ЕСЛИ.", sourceLines: useful.map(({ index }) => index) };
  if (lines[5] !== "ИНАЧЕ" || lines[7] !== "КОНЕЦ" || lines[8] !== "КОНЕЦ") return { error: "Проверь ветку ИНАЧЕ и закрывающие команды КОНЕЦ.", sourceLines: useful.map(({ index }) => index) };
  const condition1 = lines[1].slice(5) as Condition; const condition2 = lines[3].slice(11) as Condition;
  const conditions = ["ВПЕРЕДИ_СВОБОДНО", "СПРАВА_СВОБОДНО", "СЛЕВА_СВОБОДНО"];
  const actions = ["ВПЕРЕД", "НАЛЕВО", "НАПРАВО"];
  if (!conditions.includes(condition1) || !conditions.includes(condition2)) return { error: "Используй одно из условий из справочника.", sourceLines: useful.map(({ index }) => index) };
  if (![lines[2], lines[4], lines[6]].every((line) => actions.includes(line))) return { error: "Внутри веток должна находиться одна допустимая команда.", sourceLines: useful.map(({ index }) => index) };
  return { program: { firstCondition: condition1, first: lines[2] as Action, condition: condition2, second: lines[4] as Action, third: lines[6] as Action }, sourceLines: useful.map(({ index }) => index) };
}

export default function RobotGame({ totalErrors, totalHints, onError, onHint, onComplete, onFinal, onExit }: Props) {
  const [code, setCode] = useState(""); const [robot, setRobot] = useState<Position>(START); const [direction, setDirection] = useState<Direction>("N");
  const [visited, setVisited] = useState([keyOf(START)]); const [activeLine, setActiveLine] = useState<number | null>(null); const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Напиши программу по инструкции и запусти её."); const [failures, setFailures] = useState(0); const [hintUsed, setHintUsed] = useState(false);
  const [compileStatus, setCompileStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [hintMode, setHintMode] = useState<"closed" | "confirm" | "shown">("closed"); const [introOpen, setIntroOpen] = useState(false); const [finalUnlocked, setFinalUnlocked] = useState(false);
  const runId = useRef(0); const introShown = useRef(false);

  useEffect(() => { const timer = window.setTimeout(() => { const p = loadQuestProgress(); const saved = p.robotProgram.join("\n"); setCode(saved); setFailures(p.robotFailures); setHintUsed(p.robotHintUsed); if (p.task6Complete) { setStatus("success"); setRobot(SERVER); setVisited(ROUTE); setDirection("E"); setFinalUnlocked(true); } }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => () => { runId.current += 1; }, []);
  const pause = (ms: number, id: number) => new Promise<boolean>((resolve) => window.setTimeout(() => resolve(runId.current === id), ms));
  function resetRobot() { setRobot(START); setDirection("N"); setVisited([keyOf(START)]); setActiveLine(null); }
  function updateCode(value: string) { setCode(value); setCompileStatus("idle"); setMessage("Код изменён. Выполни предкомпиляцию или запусти программу."); updateQuestProgress({ robotProgram: value.split("\n") }); if (!introShown.current && value.trim()) { introShown.current = true; setIntroOpen(true); } }
  function resetProgram() { ++runId.current; setCode(""); setStatus("idle"); setCompileStatus("idle"); setMessage("Редактор очищен. Напиши новую программу."); resetRobot(); updateQuestProgress({ robotProgram: [] }); }
  function editProgram() { ++runId.current; setStatus("idle"); setMessage("Исправь программу и запусти её снова."); resetRobot(); }
  function check(condition: Condition, p: Position, f: Direction) { const d = condition === "ВПЕРЕДИ_СВОБОДНО" ? f : turn(f, condition === "СПРАВА_СВОБОДНО" ? "right" : "left"); return isFree(ahead(p, d)); }
  async function execute(action: Action, p: Position, f: Direction, id: number) {
    if (action !== "ВПЕРЕД") { const nextDirection = turn(f, action === "НАЛЕВО" ? "left" : "right"); setDirection(nextDirection); if (!await pause(250, id)) return null; return { position: p, facing: nextDirection }; }
    const next = ahead(p, f); if (!isFree(next)) return false; setRobot(next); setVisited((old) => old.includes(keyOf(next)) ? old : [...old, keyOf(next)]); if (!await pause(320, id)) return null; return { position: next, facing: f };
  }
  async function fail(id: number, text = FAILURE) { if (runId.current !== id) return; setStatus("failed"); setActiveLine(null); setMessage(text); onError(); const count = loadQuestProgress().robotFailures + 1; setFailures(count); updateQuestProgress({ robotFailures: count }); }
  async function runProgram() {
    if (!code.trim() || status === "running" || status === "success") return; const parsed = parseCode(code); const id = ++runId.current; resetRobot(); setIntroOpen(false); setHintMode("closed"); setStatus("running");
    if (!parsed.program) { await pause(250, id); await fail(id, parsed.error); return; }
    const program = parsed.program; let position = START; let facing: Direction = "N"; let actions = 0;
    while (keyOf(position) !== keyOf(SERVER) && actions < 30) {
      setActiveLine(parsed.sourceLines[0]); if (!await pause(140, id)) return; setActiveLine(parsed.sourceLines[1]); if (!await pause(150, id)) return;
      let action: Action; let sourceIndex: number;
      if (check(program.firstCondition, position, facing)) { action = program.first; sourceIndex = 2; }
      else { setActiveLine(parsed.sourceLines[3]); if (!await pause(150, id)) return; if (check(program.condition, position, facing)) { action = program.second; sourceIndex = 4; } else { setActiveLine(parsed.sourceLines[5]); if (!await pause(130, id)) return; action = program.third; sourceIndex = 6; } }
      setActiveLine(parsed.sourceLines[sourceIndex]); if (!await pause(190, id)) return; actions += 1; const result = await execute(action, position, facing, id);
      if (result === null) return; if (result === false) { await fail(id); return; } position = result.position; facing = result.facing;
    }
    if (keyOf(position) !== keyOf(SERVER)) { await fail(id); return; } setActiveLine(null); setStatus("success"); setMessage("Алгоритм выполнен. Код доставлен на сервер."); updateQuestProgress({ task6Complete: true, currentStage: 7, robotProgram: code.split("\n") }); onComplete(); await pause(850, id); if (runId.current === id) setFinalUnlocked(true);
  }
  function precompile() {
    const parsed = parseCode(code);
    if (parsed.program) { setCompileStatus("valid"); setMessage("Синтаксис корректен. Программа готова к запуску."); }
    else { setCompileStatus("invalid"); setMessage(`Ошибка синтаксиса: ${parsed.error}`); }
  }
  function confirmHint() { if (!hintUsed) { setHintUsed(true); onHint(); updateQuestProgress({ robotHintUsed: true }); } setHintMode("shown"); }
  const locked = status === "running" || status === "success";

  return <QuestStepShell code="ROBOT" step={6} title="Доставь код на сервер" errors={totalErrors} hints={totalHints} onExit={onExit}><section className={`robot-layout robot-program-layout robot-${status}`}>
    <div className="robot-board-panel"><div className="robot-panel-head"><span>GRID_WORLD / 6×6</span><b>{status === "running" ? "EXECUTING" : status === "success" ? "ACCESS GRANTED" : "ROUTE HIDDEN"}</b></div><div className="column-coordinates" aria-hidden="true">{"ABCDEF".split("").map((c) => <span key={c}>{c}</span>)}</div>
      <div className="robot-board" aria-label="Игровое поле шесть на шесть">{Array.from({ length: 36 }, (_, index) => { const col = index % 6; const row = Math.floor(index / 6); const key = `${col}-${row}`; const wall = !FREE.has(key); return <div key={key} className={`robot-cell ${wall ? "is-obstacle maze-bug" : ""} ${key === keyOf(SERVER) ? "is-server" : ""} ${visited.includes(key) ? "is-visited" : ""}`}><small>{String.fromCharCode(65 + col)}{row + 1}</small>{wall && <div className="bug-block" aria-label="Баг"><span>×</span></div>}{key === keyOf(SERVER) && <div className="server-target"><i /><i /><i /><b>SERVER</b></div>}{key === keyOf(robot) && <div className={`robot-character dir-${direction}`}><RoboDuckTop /></div>}</div>; })}</div>
      <div className="robot-board-foot"><span>&gt; start B6 / target F2</span><b>{status === "success" ? "CODE DELIVERED" : `${visited.length - 1} CELLS PASSED`}</b></div></div>
    <div className="program-panel robot-program-panel"><span className="game-kicker">ЗАДАНИЕ 06 / ROBOT PROGRAM</span><h1>Напиши код.<br /><em>Запусти утку.</em></h1><p>Самостоятельно напиши программу, которая будет вести утку до сервера. Алгоритм повторяется, пока робот не окажется на цели.</p>
      <div className="robot-writing-guide"><b>КАК ПИСАТЬ ПРОГРАММУ</b><ol><li>Начни цикл строкой <code>ПОКА НЕ СЕРВЕР</code>.</li><li>Добавь проверку <code>ЕСЛИ условие</code>, затем команду.</li><li>Добавь ветки <code>ИНАЧЕ ЕСЛИ условие</code> и <code>ИНАЧЕ</code>.</li><li>Закрой условие и цикл двумя строками <code>КОНЕЦ</code>.</li></ol><div><span>УСЛОВИЯ</span><code>ВПЕРЕДИ_СВОБОДНО</code><code>СПРАВА_СВОБОДНО</code><code>СЛЕВА_СВОБОДНО</code></div><div><span>КОМАНДЫ</span><code>ВПЕРЕД</code><code>НАЛЕВО</code><code>НАПРАВО</code></div></div>
      <div className="robot-code-editor"><div className="pseudocode-title"><span>ROBOT_PROGRAM</span><b>{status === "running" ? "RUN" : "EDIT"}</b></div><div className="robot-code-body"><div className="code-lines" aria-hidden="true">{Array.from({ length: Math.max(9, code.split("\n").length) }, (_, i) => <span className={activeLine === i ? "is-active" : ""} key={i}>{String(i + 1).padStart(2, "0")}</span>)}</div><textarea value={code} onChange={(e) => updateCode(e.target.value)} disabled={locked} spellCheck={false} aria-label="Редактор программы робота" /></div></div>
      <div className="program-actions robot-program-actions">{status === "failed" ? <button className="edit-program" onClick={editProgram}>ИЗМЕНИТЬ АЛГОРИТМ</button> : <button className="run-program" onClick={() => void runProgram()} disabled={locked || !code.trim()}>ЗАПУСТИТЬ <span>↗</span></button>}<button className="precompile-program" onClick={precompile} disabled={locked || !code.trim()}>ПРЕДКОМПИЛЯЦИЯ</button><button className="reset-program" onClick={resetProgram} disabled={locked}>СБРОСИТЬ</button><button className="robot-hint-button" onClick={() => { setIntroOpen(false); setHintMode(hintUsed ? "shown" : "confirm"); }} disabled={locked}><span>?</span>ПОДСКАЗКА</button></div>
      <div className={`program-status ${status === "failed" || compileStatus === "invalid" ? "is-error" : ""} ${compileStatus === "valid" ? "is-valid" : ""}`} aria-live="polite"><span>{message}</span><b>{compileStatus === "valid" ? "SYNTAX VALID" : compileStatus === "invalid" ? "SYNTAX ERROR" : `НЕУДАЧНЫХ ЗАПУСКОВ: ${failures}`}</b></div>
      <div className={`robot-hint-helper ${hintMode !== "closed" || introOpen ? "is-talking" : ""}`}><div className="duck-speech">{introOpen ? <><span>О, настоящий код! Я выполню его буквально. Надеюсь, страховка для клюва предусмотрена.</span><button onClick={() => setIntroOpen(false)}>ПОНЯТНО</button></> : hintMode === "confirm" ? <><span>Использовать подсказку? Она будет учтена в итоговом результате.</span><div className="duck-confirm-actions"><button onClick={() => setHintMode("closed")}>НЕ СЕЙЧАС</button><button onClick={confirmHint}>ИСПОЛЬЗОВАТЬ</button></div></> : <><span>Сначала реши, что робот должен делать, пока путь перед ним свободен. Поворот нужен только тогда, когда дальше двигаться прямо нельзя.</span><button onClick={() => setHintMode("closed")}>СПАСИБО!</button></>}</div><RoboDuckFace /></div>
    </div></section>
    {status === "success" && finalUnlocked && <div className="fragment-modal-backdrop"><section className="robot-success-modal" role="dialog" aria-modal="true"><div className="fragment-modal-head"><span>NODE_06 / DELIVERED</span><b>ACCESS GRANTED</b></div><div className="fragment-icon">✓</div><span>АЛГОРИТМ ВЫПОЛНЕН</span><h2>Код доставлен на сервер.</h2><p>Финальный терминал разблокирован!</p><button onClick={onFinal}>ОТКРЫТЬ ФИНАЛЬНЫЙ ТЕРМИНАЛ <span>↗</span></button></section></div>}
  </QuestStepShell>;
}
