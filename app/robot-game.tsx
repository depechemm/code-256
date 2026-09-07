"use client";

import { DragEvent, useEffect, useRef, useState } from "react";
import QuestStepShell from "./quest-step-shell";
import RoboDuckTop from "./robo-duck-top";
import RoboDuckFace from "./robo-duck-face";
import { loadQuestProgress, updateQuestProgress } from "./quest-storage";

type Direction = "N" | "E" | "S" | "W";
type Action = "forward" | "left" | "right";
type Command = Action | "while" | "if_front" | "else_if_right" | "else_if_left" | "else" | "end";
type Position = { col: number; row: number };
type Status = "idle" | "running" | "failed" | "success";
type Props = { totalErrors: number; totalHints: number; onError: () => void; onHint: () => void; onComplete: () => void; onFinal: () => void; onExit: () => void };

const START = { col: 1, row: 5 }; const SERVER = { col: 5, row: 1 };
const ROUTE = ["1-5", "1-4", "1-3", "2-3", "3-3", "3-2", "3-1", "4-1", "5-1"]; const FREE = new Set(ROUTE);
const DIRECTIONS: Direction[] = ["N", "E", "S", "W"];
const vectors: Record<Direction, Position> = { N: { col: 0, row: -1 }, E: { col: 1, row: 0 }, S: { col: 0, row: 1 }, W: { col: -1, row: 0 } };
const commandInfo: Record<Command, { icon: string; label: string; short: string; group: "logic" | "action" }> = {
  while: { icon: "↻", label: "Повторять до сервера", short: "ПОКА НЕ СЕРВЕР", group: "logic" },
  if_front: { icon: "?", label: "Если впереди свободно", short: "ЕСЛИ ВПЕРЕДИ СВОБОДНО", group: "logic" },
  else_if_right: { icon: "?", label: "Иначе если справа свободно", short: "ИНАЧЕ ЕСЛИ СПРАВА СВОБОДНО", group: "logic" },
  else_if_left: { icon: "?", label: "Иначе если слева свободно", short: "ИНАЧЕ ЕСЛИ СЛЕВА СВОБОДНО", group: "logic" },
  else: { icon: ":", label: "В остальных случаях", short: "ИНАЧЕ", group: "logic" },
  end: { icon: "⌟", label: "Закрыть блок", short: "КОНЕЦ", group: "logic" },
  forward: { icon: "↑", label: "Шаг вперёд", short: "ВПЕРЁД", group: "action" },
  left: { icon: "↶", label: "Повернуть налево", short: "НАЛЕВО", group: "action" },
  right: { icon: "↷", label: "Повернуть направо", short: "НАПРАВО", group: "action" },
};
const palette: Command[] = ["while", "if_front", "else_if_right", "else_if_left", "else", "end", "forward", "left", "right"];
const solutions: Command[][] = [
  ["while", "if_front", "forward", "else_if_right", "right", "else_if_left", "left", "end", "end"],
  ["while", "if_front", "forward", "else_if_right", "right", "else", "left", "end", "end"],
];
const keyOf = (p: Position) => `${p.col}-${p.row}`;
const turn = (f: Direction, side: "left" | "right") => DIRECTIONS[(DIRECTIONS.indexOf(f) + (side === "left" ? 3 : 1)) % 4];
const ahead = (p: Position, f: Direction) => ({ col: p.col + vectors[f].col, row: p.row + vectors[f].row });
const isFree = (p: Position) => p.col >= 0 && p.col < 6 && p.row >= 0 && p.row < 6 && FREE.has(keyOf(p));
const cellName = (p: Position) => `${String.fromCharCode(65 + p.col)}${p.row + 1}`;
function validateProgram(commands: Command[]) {
  const structure: Array<Command | "action" | "last_branch"> = ["while", "if_front", "action", "else_if_right", "action", "last_branch", "action", "end", "end"];
  if (commands.length !== structure.length) return { error: `Нужно собрать 9 блоков. Сейчас: ${commands.length}.`, index: Math.min(commands.length, 8) };
  for (let index = 0; index < structure.length; index += 1) {
    const expected = structure[index]; const valid = expected === "action" ? ["forward", "left", "right"].includes(commands[index]) : expected === "last_branch" ? ["else_if_left", "else"].includes(commands[index]) : commands[index] === expected;
    if (!valid) return { error: `Блок ${index + 1} стоит не на своём месте. Проверь вложенность цикла и условий.`, index };
  }
  return { actions: { first: commands[2] as Action, second: commands[4] as Action, third: commands[6] as Action }, lastBranch: commands[5] as "else_if_left" | "else" };
}

export default function RobotGame({ totalErrors, totalHints, onError, onHint, onComplete, onFinal, onExit }: Props) {
  const [commands, setCommands] = useState<Command[]>([]); const [robot, setRobot] = useState<Position>(START); const [direction, setDirection] = useState<Direction>("N");
  const [visited, setVisited] = useState([keyOf(START)]); const [activeIndex, setActiveIndex] = useState<number | null>(null); const [failedIndex, setFailedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle"); const [message, setMessage] = useState("Добавь команды в программу и расставь их в нужном порядке.");
  const [failures, setFailures] = useState(0); const [hintUsed, setHintUsed] = useState(false); const [hintOpen, setHintOpen] = useState(false); const [finalUnlocked, setFinalUnlocked] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null); const runId = useRef(0);
  const programRef = useRef<HTMLDivElement>(null); const scrollTarget = useRef<number | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { const p = loadQuestProgress(); const filtered = p.robotProgram.filter((item): item is Command => palette.includes(item as Command)); const restored = filtered.includes("while") ? filtered.slice(0, 9) : []; setCommands(restored); if (restored.length !== p.robotProgram.length) updateQuestProgress({ robotProgram: restored }); setFailures(p.robotFailures); setHintUsed(p.robotHintUsed); if (p.task6Complete) { setStatus("success"); setRobot(SERVER); setVisited(ROUTE); setDirection("E"); setFinalUnlocked(true); } }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => () => { runId.current += 1; }, []);
  useEffect(() => { const index = scrollTarget.current; if (index === null) return; scrollTarget.current = null; window.requestAnimationFrame(() => programRef.current?.querySelectorAll("li")[index]?.scrollIntoView({ behavior: "smooth", block: "nearest" })); }, [commands]);
  const pause = (ms: number, id: number) => new Promise<boolean>((resolve) => window.setTimeout(() => resolve(runId.current === id), ms));
  function save(next: Command[]) { setCommands(next); updateQuestProgress({ robotProgram: next }); }
  function resetRobot() { setRobot(START); setDirection("N"); setVisited([keyOf(START)]); setActiveIndex(null); setFailedIndex(null); }
  function prepareEdit() { if (status === "failed") { setStatus("idle"); resetRobot(); setMessage("Программа изменена. Запусти её ещё раз."); } }
  function addCommand(command: Command) { if (status === "running" || status === "success" || commands.length >= 9) return; prepareEdit(); scrollTarget.current = commands.length; save([...commands, command]); }
  function removeCommand(index: number) { prepareEdit(); save(commands.filter((_, position) => position !== index)); }
  function moveCommand(index: number, shift: -1 | 1) { const target = index + shift; if (target < 0 || target >= commands.length) return; prepareEdit(); const next = [...commands]; [next[index], next[target]] = [next[target], next[index]]; scrollTarget.current = target; save(next); }
  function moveDragged(to: number) { if (draggedIndex === null || draggedIndex === to) return; const next = [...commands]; const [item] = next.splice(draggedIndex, 1); next.splice(to, 0, item); setDraggedIndex(null); prepareEdit(); scrollTarget.current = to; save(next); }
  function paletteDrag(event: DragEvent, command: Command) { event.dataTransfer.setData("text/command", command); event.dataTransfer.effectAllowed = "copy"; }
  function dropOnProgram(event: DragEvent) { event.preventDefault(); const command = event.dataTransfer.getData("text/command"); if (palette.includes(command as Command)) addCommand(command as Command); }
  async function fail(id: number, index: number, text: string, countError = true) { if (runId.current !== id) return; setStatus("failed"); setFailedIndex(index); setActiveIndex(index); setMessage(text); if (countError) { onError(); const count = loadQuestProgress().robotFailures + 1; setFailures(count); updateQuestProgress({ robotFailures: count }); } }
  async function executeAction(action: Action, position: Position, facing: Direction, id: number, sourceIndex: number, countError: boolean) {
    setActiveIndex(sourceIndex); if (!await pause(220, id)) return null;
    if (action === "left" || action === "right") { const nextFacing = turn(facing, action); setDirection(nextFacing); if (!await pause(260, id)) return null; return { position, facing: nextFacing }; }
    const next = ahead(position, facing);
    if (!isFree(next)) { await fail(id, sourceIndex, `Блок ${sourceIndex + 1} «ВПЕРЁД» ведёт из ${cellName(position)} в препятствие. Проверь выбранную ветку.`, countError); return false; }
    setRobot(next); setVisited((current) => current.includes(keyOf(next)) ? current : [...current, keyOf(next)]); if (!await pause(300, id)) return null; return { position: next, facing };
  }
  async function runProgram(isPreview = false) {
    if (!commands.length || status === "running" || status === "success") return; const id = ++runId.current; const parsed = validateProgram(commands); let position = START; let facing: Direction = "N";
    resetRobot(); setHintOpen(false); setStatus("running"); setMessage(isPreview ? "Предпросмотр: утка тестирует программу. Ошибки не учитываются." : "Утка проверяет условия и выполняет подходящую ветку.");
    if (!parsed.actions) { await pause(250, id); await fail(id, parsed.index ?? 0, parsed.error ?? "Структура программы не распознана.", !isPreview); return; }
    let actionsDone = 0;
    while (keyOf(position) !== keyOf(SERVER) && actionsDone < 30) {
      setActiveIndex(0); if (!await pause(130, id)) return; setActiveIndex(1); if (!await pause(150, id)) return;
      let action: Action; let sourceIndex: number;
      if (isFree(ahead(position, facing))) { action = parsed.actions.first; sourceIndex = 2; }
      else {
        setActiveIndex(3); if (!await pause(150, id)) return;
        if (isFree(ahead(position, turn(facing, "right")))) { action = parsed.actions.second; sourceIndex = 4; }
        else {
          setActiveIndex(5); if (!await pause(150, id)) return;
          if (parsed.lastBranch === "else") { action = parsed.actions.third; sourceIndex = 6; }
          else if (isFree(ahead(position, turn(facing, "left")))) { action = parsed.actions.third; sourceIndex = 6; }
          else { await fail(id, 5, `В клетке ${cellName(position)} ни одно из трёх условий не подошло.`, !isPreview); return; }
        }
      }
      actionsDone += 1; const result = await executeAction(action, position, facing, id, sourceIndex, !isPreview);
      if (result === null || result === false) return; position = result.position; facing = result.facing;
    }
    if (keyOf(position) !== keyOf(SERVER)) { await fail(id, 0, "Цикл выполнил 30 действий, но утка не дошла до сервера. Проверь команды внутри условий.", !isPreview); return; }
    if (isPreview) { setActiveIndex(null); setStatus("idle"); setMessage("Предпросмотр завершён: утка добралась до сервера. Теперь запусти программу."); return; }
    setActiveIndex(null); setStatus("success"); setMessage("Алгоритм выполнен. Код доставлен на сервер."); updateQuestProgress({ task6Complete: true, currentStage: 7, robotProgram: commands }); onComplete(); await pause(650, id); if (runId.current === id) setFinalUnlocked(true);
  }
  function resetProgram() { ++runId.current; save([]); setStatus("idle"); setMessage("Программа очищена. Собери новый маршрут."); resetRobot(); }
  function showHint() { if (!hintUsed) { setHintUsed(true); onHint(); updateQuestProgress({ robotHintUsed: true }); } setHintOpen(true); }
  const nextHint = (() => { const variants = solutions.map((solution) => { let index = 0; while (index < commands.length && commands[index] === solution[index]) index += 1; return { solution, index }; }); const best = variants.sort((a, b) => b.index - a.index)[0]; if (best.index >= best.solution.length) return "Маршрут собран верно. Теперь запускай программу!"; if (best.index === 5) return "Здесь есть выбор: проверь свободный путь слева или используй блок «В остальных случаях»."; return `После верной части следующая команда — «${commandInfo[best.solution[best.index]].label}».`; })();
  const locked = status === "running" || status === "success";

  return <QuestStepShell code="ROBOT" step={6} title="Доставь код на сервер" errors={totalErrors} hints={totalHints} onExit={onExit}><section className={`robot-layout robot-program-layout robot-${status}`}>
    <div className="robot-board-panel"><div className="robot-panel-head"><span>GRID_WORLD / 6×6</span><b>{status === "running" ? "EXECUTING" : status === "success" ? "ACCESS GRANTED" : status === "failed" ? "PROGRAM STOPPED" : "ROUTE HIDDEN"}</b></div><div className="column-coordinates">{"ABCDEF".split("").map((c) => <span key={c}>{c}</span>)}</div>
      <div className="robot-board">{Array.from({ length: 36 }, (_, index) => { const col = index % 6; const row = Math.floor(index / 6); const key = `${col}-${row}`; const wall = !FREE.has(key); return <div key={key} className={`robot-cell ${wall ? "is-obstacle maze-bug" : ""} ${key === keyOf(SERVER) ? "is-server" : ""} ${visited.includes(key) ? "is-visited" : ""}`}><small>{cellName({ col, row })}</small>{wall && <div className="bug-block"><span>×</span></div>}{key === keyOf(SERVER) && <div className="server-target"><i /><i /><i /><b>SERVER</b></div>}{key === keyOf(robot) && <div className={`robot-character dir-${direction}`}><RoboDuckTop /></div>}</div>; })}</div>
      <div className="robot-board-foot"><span>&gt; start B6 / target F2</span><b>{status === "failed" ? "EXECUTION FAILED" : status === "success" ? "CODE DELIVERED" : `${visited.length - 1} CELLS PASSED`}</b></div></div>
    <div className="program-panel visual-program-panel"><span className="game-kicker">ЗАДАНИЕ 06 / VISUAL PROGRAM</span><h1>Собери код.<br /><em>Запусти утку.</em></h1><p>Собери цикл из условий и действий. Утка начинает в B6, смотрит вверх и повторяет команды, пока не окажется у сервера.</p>
      <div className="visual-program-guide"><span><b>1</b>Начни с цикла</span><span><b>2</b>Вложи условия и действия</span><span><b>3</b>Закрой оба блока</span></div>
      <div className="command-palette"><span>БЛОКИ · ПЕРЕТАЩИ ИЛИ НАЖМИ</span><div className="palette-logic">{palette.filter((command) => commandInfo[command].group === "logic").map((command) => <button type="button" key={command} draggable={!locked} onDragStart={(event) => paletteDrag(event, command)} onClick={() => addCommand(command)} disabled={locked}><b>{commandInfo[command].icon}</b><small>{commandInfo[command].label}</small><i>+</i></button>)}</div><div className="palette-actions">{palette.filter((command) => commandInfo[command].group === "action").map((command) => <button type="button" key={command} draggable={!locked} onDragStart={(event) => paletteDrag(event, command)} onClick={() => addCommand(command)} disabled={locked}><b>{commandInfo[command].icon}</b><small>{commandInfo[command].label}</small><i>+</i></button>)}</div></div>
      <div ref={programRef} className={`visual-code ${!commands.length ? "is-empty" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={dropOnProgram}><div className="visual-code-head"><span>МОЯ ПРОГРАММА</span><b>{commands.length} КОМАНД</b></div>
        {!commands.length ? <div className="visual-code-empty"><strong>ПРОГРАММА ПУСТА</strong><span>Начни с блока цикла, затем добавь условия и действия</span></div> : <ol>{commands.map((command, index) => { const indent = [2, 4, 6].includes(index) ? 2 : index > 0 && index < 8 ? 1 : 0; return <li key={`${command}-${index}`} draggable={!locked} onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); moveDragged(index); }} className={`${commandInfo[command].group === "logic" ? "is-logic" : "is-action"} indent-${indent} ${activeIndex === index ? failedIndex === index ? "is-failed" : "is-active" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{commandInfo[command].icon}</b><strong>{commandInfo[command].short}</strong><div><button onClick={() => moveCommand(index, -1)} disabled={locked || index === 0} aria-label="Переместить вверх">↑</button><button onClick={() => moveCommand(index, 1)} disabled={locked || index === commands.length - 1} aria-label="Переместить вниз">↓</button><button onClick={() => removeCommand(index)} disabled={locked} aria-label="Удалить">×</button></div></li>; })}</ol>}</div>
      <div className="program-actions visual-program-actions">{status === "failed" ? <button className="edit-program" onClick={() => { setStatus("idle"); resetRobot(); setMessage("Исправь выделенную команду и попробуй ещё раз."); }}>ИЗМЕНИТЬ ПРОГРАММУ</button> : <button className="run-program" onClick={() => void runProgram()} disabled={locked || !commands.length}>ЗАПУСТИТЬ <span>↗</span></button>}<button className="preview-program" onClick={() => void runProgram(true)} disabled={locked || !commands.length}>ПРЕДПРОСМОТР</button><button className="reset-program" onClick={resetProgram} disabled={locked || !commands.length}>ОЧИСТИТЬ</button><button className="robot-hint-button" onClick={showHint} disabled={locked}><span>?</span>ПОДСКАЗКА</button></div>
      <div className={`program-status ${status === "failed" ? "is-error" : ""}`}><span>{message}</span><b>НЕУДАЧНЫХ ЗАПУСКОВ: {failures}</b></div>
      <div className={`robot-hint-helper ${hintOpen ? "is-talking" : ""}`}><div className="duck-speech"><span>{nextHint}</span><button onClick={() => setHintOpen(false)}>СПАСИБО!</button></div><RoboDuckFace /></div>
    </div></section>
    {status === "success" && finalUnlocked && <div className="fragment-modal-backdrop"><section className="robot-success-modal" role="dialog" aria-modal="true"><div className="fragment-modal-head"><span>NODE_06 / DELIVERED</span><b>ACCESS GRANTED</b></div><div className="fragment-icon">✓</div><span>АЛГОРИТМ ВЫПОЛНЕН</span><h2>Код доставлен на сервер.</h2><p>Финальный терминал разблокирован!</p><button onClick={onFinal}>ОТКРЫТЬ ФИНАЛЬНЫЙ ТЕРМИНАЛ <span>↗</span></button></section></div>}
  </QuestStepShell>;
}
