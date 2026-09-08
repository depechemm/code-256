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
  ["while", "if_front", "forward", "else_if_left", "left", "else_if_right", "right", "end", "end"],
  ["while", "if_front", "forward", "else_if_left", "left", "else", "right", "end", "end"],
];
const keyOf = (p: Position) => `${p.col}-${p.row}`;
const turn = (f: Direction, side: "left" | "right") => DIRECTIONS[(DIRECTIONS.indexOf(f) + (side === "left" ? 3 : 1)) % 4];
const ahead = (p: Position, f: Direction) => ({ col: p.col + vectors[f].col, row: p.row + vectors[f].row });
const isFree = (p: Position) => p.col >= 0 && p.col < 6 && p.row >= 0 && p.row < 6 && FREE.has(keyOf(p));
const cellName = (p: Position) => `${String.fromCharCode(65 + p.col)}${p.row + 1}`;
function validateProgram(commands: Command[]) {
  if (commands[0] !== "while") return { error: "Первым должен стоять цикл «Повторять до сервера».", index: 0 };
  let index = 1; let conditionOpen = false; let loopClosed = false;
  while (index < commands.length) {
    const command = commands[index];
    if (isAction(command)) { index += 1; continue; }
    if (command === "if_front") {
      if (conditionOpen) return { error: "Перед новым «Если» закройте предыдущую цепочку условий.", index };
      if (!isAction(commands[index + 1])) return { error: "После условия должна стоять команда действия.", index: Math.min(index + 1, commands.length - 1) };
      conditionOpen = true; index += 2; continue;
    }
    if (isSideCondition(command) || command === "else") {
      if (!conditionOpen) return { error: `Блок «${commandInfo[command].label}» можно использовать только после «Если».`, index };
      if (!isAction(commands[index + 1])) return { error: "После условия должна стоять команда действия.", index: Math.min(index + 1, commands.length - 1) };
      index += 2; continue;
    }
    if (command === "end") {
      if (conditionOpen) { conditionOpen = false; index += 1; continue; }
      loopClosed = true;
      if (index !== commands.length - 1) return { error: "После закрытия цикла не должно быть других блоков.", index: index + 1 };
      break;
    }
    return { error: "Этот блок нельзя выполнить в текущем месте программы.", index };
  }
  if (conditionOpen) return { error: "Добавьте «КОНЕЦ», чтобы закрыть цепочку условий.", index: Math.max(0, commands.length - 1) };
  if (!loopClosed) return { error: "Добавьте «КОНЕЦ», чтобы закрыть цикл.", index: Math.max(0, commands.length - 1) };
  return { valid: true };
}
const isAction = (command?: Command): command is Action => command === "forward" || command === "left" || command === "right";
const isSideCondition = (command?: Command): command is "else_if_left" | "else_if_right" => command === "else_if_left" || command === "else_if_right";
const sideIsFree = (command: "else_if_left" | "else_if_right", position: Position, facing: Direction) => isFree(ahead(position, turn(facing, command === "else_if_left" ? "left" : "right")));

export default function RobotGame({ totalErrors, totalHints, onError, onHint, onComplete, onFinal, onExit }: Props) {
  const [commands, setCommands] = useState<Command[]>([]); const [robot, setRobot] = useState<Position>(START); const [direction, setDirection] = useState<Direction>("N");
  const [visited, setVisited] = useState([keyOf(START)]); const [activeIndex, setActiveIndex] = useState<number | null>(null); const [failedIndex, setFailedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle"); const [message, setMessage] = useState("Добавьте команды в программу и расставьте их в нужном порядке.");
  const [failures, setFailures] = useState(0); const [hintUsed, setHintUsed] = useState(false); const [hintOpen, setHintOpen] = useState(false); const [finalUnlocked, setFinalUnlocked] = useState(false);
  const [duckJumping, setDuckJumping] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null); const runId = useRef(0);
  const programRef = useRef<HTMLDivElement>(null); const scrollTarget = useRef<number | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { const p = loadQuestProgress(); const filtered = p.robotProgram.filter((item): item is Command => palette.includes(item as Command)); const restored = filtered.includes("while") ? filtered.slice(0, 9) : []; setCommands(restored); if (restored.length !== p.robotProgram.length) updateQuestProgress({ robotProgram: restored }); setFailures(p.robotFailures); setHintUsed(p.robotHintUsed); if (p.task6Complete) { setStatus("success"); setRobot(SERVER); setVisited(ROUTE); setDirection("E"); setFinalUnlocked(true); } }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => () => { runId.current += 1; }, []);
  useEffect(() => { const index = scrollTarget.current; if (index === null) return; scrollTarget.current = null; window.requestAnimationFrame(() => programRef.current?.querySelectorAll("li")[index]?.scrollIntoView({ behavior: "smooth", block: "nearest" })); }, [commands]);
  const pause = (ms: number, id: number) => new Promise<boolean>((resolve) => window.setTimeout(() => resolve(runId.current === id), ms));
  function save(next: Command[]) { setCommands(next); updateQuestProgress({ robotProgram: next }); }
  function resetRobot() { setRobot(START); setDirection("N"); setDuckJumping(false); setVisited([keyOf(START)]); setActiveIndex(null); setFailedIndex(null); }
  function prepareEdit() { if (status === "failed") { setStatus("idle"); resetRobot(); setMessage("Программа изменена. Запустите её ещё раз."); } else { setActiveIndex(null); setFailedIndex(null); } }
  function addCommand(command: Command) { if (status === "running" || status === "success" || commands.length >= 9) return; prepareEdit(); scrollTarget.current = commands.length; save([...commands, command]); }
  function removeCommand(index: number) { prepareEdit(); save(commands.filter((_, position) => position !== index)); }
  function moveCommand(index: number, shift: -1 | 1) { const target = index + shift; if (target < 0 || target >= commands.length) return; prepareEdit(); const next = [...commands]; [next[index], next[target]] = [next[target], next[index]]; scrollTarget.current = target; save(next); }
  function moveDragged(to: number) { if (draggedIndex === null || draggedIndex === to) return; const next = [...commands]; const [item] = next.splice(draggedIndex, 1); next.splice(to, 0, item); setDraggedIndex(null); prepareEdit(); scrollTarget.current = to; save(next); }
  function paletteDrag(event: DragEvent, command: Command) { event.dataTransfer.setData("text/command", command); event.dataTransfer.effectAllowed = "copy"; }
  function dropOnProgram(event: DragEvent) { event.preventDefault(); const command = event.dataTransfer.getData("text/command"); if (palette.includes(command as Command)) addCommand(command as Command); }
  async function fail(id: number, index: number, text: string, countError = true) { if (runId.current !== id) return; setStatus("failed"); setFailedIndex(index); setActiveIndex(index); setMessage(text); if (countError) { onError(); const count = loadQuestProgress().robotFailures + 1; setFailures(count); updateQuestProgress({ robotFailures: count }); } }
  async function executeAction(action: Action, position: Position, facing: Direction, id: number, sourceIndex: number, countError: boolean) {
    setActiveIndex(sourceIndex); if (!await pause(220, id)) return null;
    if (action === "left" || action === "right") { setDuckJumping(false); const nextFacing = turn(facing, action); setDirection(nextFacing); if (!await pause(260, id)) return null; return { position, facing: nextFacing }; }
    const next = ahead(position, facing);
    if (!isFree(next)) { await fail(id, sourceIndex, `Блок ${sourceIndex + 1} «ВПЕРЁД» ведёт из ${cellName(position)} в препятствие. Проверьте выбранную ветку.`, countError); return false; }
    setDuckJumping(true); setRobot(next); setVisited((current) => current.includes(keyOf(next)) ? current : [...current, keyOf(next)]); if (!await pause(300, id)) return null; setDuckJumping(false); return { position: next, facing };
  }
  async function stopPreview(id: number, index: number, text: string) { if (runId.current !== id) return; setStatus("failed"); setActiveIndex(Math.min(index, commands.length - 1)); setFailedIndex(index < commands.length ? index : null); setMessage(text); }
  async function executeProgram(countError: boolean) {
    if (!commands.length || status === "running" || status === "success") return;
    const id = ++runId.current; const stop = (index: number, text: string) => countError ? fail(id, index, text) : stopPreview(id, index, text);
    resetRobot(); setHintOpen(false); setStatus("running"); setMessage(countError ? "Утка выполняет программу буквально и проверяет каждый блок." : "Проверка: утка выполняет уже собранную часть программы. Ошибки не учитываются.");
    setActiveIndex(0); if (!await pause(160, id)) return;
    if (commands[0] !== "while") { await stop(0, "Программа не может начаться: первым должен стоять цикл «Повторять до сервера»."); return; }
    let position = START; let facing: Direction = "N"; let actionsDone = 0; let stalledCycles = 0;
    while (keyOf(position) !== keyOf(SERVER) && actionsDone < 30) {
      if (stalledCycles >= 10) { await stop(0, "Цикл повторился 10 раз, но утка не сдвинулась к серверу."); return; }
      const positionBeforeCycle = keyOf(position);
      setActiveIndex(0); if (!await pause(140, id)) return;
      let index = 1; let conditionOpen = false; let branchTaken = false; let loopClosed = false;
      while (index < commands.length) {
        const command = commands[index];
        if (isAction(command)) {
          const result = await executeAction(command, position, facing, id, index, countError);
          if (result === null || result === false) return; position = result.position; facing = result.facing; actionsDone += 1; index += 1; continue;
        }
        if (command === "if_front") {
          if (conditionOpen) { await stop(index, "Перед новым «Если» закройте предыдущую цепочку условий блоком «КОНЕЦ»."); return; }
          setActiveIndex(index); if (!await pause(180, id)) return; conditionOpen = true; branchTaken = isFree(ahead(position, facing));
          const branchAction = commands[index + 1];
          if (!isAction(branchAction)) { await stop(index + 1, "После условия нужна команда действия."); return; }
          if (branchTaken) { const result = await executeAction(branchAction, position, facing, id, index + 1, countError); if (result === null || result === false) return; position = result.position; facing = result.facing; actionsDone += 1; }
          index += 2; continue;
        }
        if (isSideCondition(command) || command === "else") {
          if (!conditionOpen) { await stop(index, `Блок «${commandInfo[command].label}» нельзя использовать без предыдущего «Если».`); return; }
          setActiveIndex(index); if (!await pause(180, id)) return;
          const branchAction = commands[index + 1];
          if (!isAction(branchAction)) { await stop(index + 1, "После условия нужна команда действия."); return; }
          const matches = command === "else" || sideIsFree(command, position, facing);
          if (!branchTaken && matches) { branchTaken = true; const result = await executeAction(branchAction, position, facing, id, index + 1, countError); if (result === null || result === false) return; position = result.position; facing = result.facing; actionsDone += 1; }
          index += 2; continue;
        }
        if (command === "end") {
          setActiveIndex(index); if (!await pause(140, id)) return;
          if (conditionOpen) { conditionOpen = false; branchTaken = false; index += 1; continue; }
          loopClosed = true;
          if (index !== commands.length - 1) { await stop(index + 1, "После закрытия цикла остались лишние блоки."); return; }
          break;
        }
        await stop(index, "Этот блок нельзя выполнить в текущем месте программы."); return;
      }
      if (conditionOpen) { await stop(Math.max(0, commands.length - 1), "Цепочка условий не закрыта. Добавьте блок «КОНЕЦ»."); return; }
      if (!loopClosed) { await stop(Math.max(0, commands.length - 1), "Цикл не закрыт. Добавьте блок «КОНЕЦ»."); return; }
      stalledCycles = keyOf(position) === positionBeforeCycle ? stalledCycles + 1 : 0;
    }
    if (keyOf(position) !== keyOf(SERVER)) { await stop(0, "Программа зациклилась, и утка не дошла до сервера. Проверьте команды движения и поворота."); return; }
    const validation = validateProgram(commands);
    if (!validation.valid) { await stop(validation.index ?? 0, `Утка дошла до сервера, но программа не завершена: ${validation.error}`); return; }
    setActiveIndex(null); setFailedIndex(null);
    if (!countError) { setStatus("idle"); setMessage("Проверка завершена: утка добралась до сервера. Программа готова к запуску."); return; }
    setStatus("success"); setMessage("Алгоритм выполнен. Код доставлен на сервер."); updateQuestProgress({ task6Complete: true, currentStage: 7, robotProgram: commands }); onComplete(); await pause(650, id); if (runId.current === id) setFinalUnlocked(true);
  }
  const previewProgram = () => executeProgram(false);
  const runProgram = () => executeProgram(true);
  function resetProgram() { ++runId.current; save([]); setStatus("idle"); setMessage("Программа очищена. Соберите новый маршрут."); resetRobot(); }
  function showHint() { if (!hintUsed) { setHintUsed(true); onHint(); updateQuestProgress({ robotHintUsed: true }); } setHintOpen(true); }
  const nextHint = (() => { const variants = solutions.map((solution) => { let index = 0; while (index < commands.length && commands[index] === solution[index]) index += 1; return { solution, index }; }); const best = variants.sort((a, b) => b.index - a.index)[0]; if (best.index >= best.solution.length) return "Маршрут собран верно. Теперь запустите программу!"; if (best.index === 3) return "После проверки пути впереди можно сначала проверить любую сторону: правую или левую."; if (best.index === 5) return `Теперь проверьте путь ${commands[3] === "else_if_left" ? "справа" : "слева"} или используйте блок «В остальных случаях».`; return `После верной части следующая команда — «${commandInfo[best.solution[best.index]].label}».`; })();
  const locked = status === "running" || status === "success";

  return <QuestStepShell code="ROBOT" step={6} title="Доставьте код на сервер" errors={totalErrors} hints={totalHints} shellClassName="robot-game-shell" onExit={onExit}><section className={`robot-layout robot-program-layout robot-${status}`}>
    <div className="robot-board-panel"><div className="robot-panel-head"><span>GRID_WORLD / 6×6</span><b>{status === "running" ? "EXECUTING" : status === "success" ? "ACCESS GRANTED" : status === "failed" ? "PROGRAM STOPPED" : "ROUTE HIDDEN"}</b></div><div className="column-coordinates">{"ABCDEF".split("").map((c) => <span key={c}>{c}</span>)}</div>
      <div className="robot-board">{Array.from({ length: 36 }, (_, index) => { const col = index % 6; const row = Math.floor(index / 6); const key = `${col}-${row}`; const wall = !FREE.has(key); return <div key={key} className={`robot-cell ${wall ? "is-obstacle maze-bug" : ""} ${key === keyOf(SERVER) ? "is-server" : ""} ${visited.includes(key) ? "is-visited" : ""}`}><small>{cellName({ col, row })}</small>{wall && <div className="bug-block"><span>×</span></div>}{key === keyOf(SERVER) && <div className="server-target"><i /><i /><i /><b>SERVER</b></div>}{key === keyOf(robot) && <div className={`robot-character dir-${direction} ${duckJumping ? "is-jumping" : ""}`}><RoboDuckTop /></div>}</div>; })}</div>
      <div className="robot-board-foot"><span>&gt; start B6 / target F2</span><b>{status === "failed" ? "EXECUTION FAILED" : status === "success" ? "CODE DELIVERED" : `${visited.length - 1} CELLS PASSED`}</b></div></div>
    <div className="program-panel visual-program-panel"><span className="game-kicker">ЗАДАНИЕ 06 / VISUAL PROGRAM</span><h1>Соберите код<br /><em>Запустите утку</em></h1><p>Система восстановлена, но код ещё нужно доставить на центральный сервер. Внутри цикла можно сразу выполнять действия или использовать условия. Нажимайте «Проверить», чтобы увидеть, как утка понимает готовую часть программы.</p>
      <div className="visual-program-guide"><span><b>1</b>Начните с цикла</span><span><b>2</b>Добавляйте действия и условия</span><span><b>3</b>Закройте открытые блоки</span></div><div className="program-block-rule"><b>УСЛОВИЕ</b><span>Для решения нужно использовать 9 блоков кода.</span></div>
      <div className="command-palette"><span>БЛОКИ · ПЕРЕТАЩИТЕ ИЛИ НАЖМИТЕ</span><div className="palette-logic">{palette.filter((command) => commandInfo[command].group === "logic").map((command) => <button type="button" key={command} draggable={!locked && commands.length < 9} onDragStart={(event) => paletteDrag(event, command)} onClick={() => addCommand(command)} disabled={locked || commands.length >= 9}><b>{commandInfo[command].icon}</b><small>{commandInfo[command].label}</small><i>+</i></button>)}</div><div className="palette-actions">{palette.filter((command) => commandInfo[command].group === "action").map((command) => <button type="button" key={command} draggable={!locked && commands.length < 9} onDragStart={(event) => paletteDrag(event, command)} onClick={() => addCommand(command)} disabled={locked || commands.length >= 9}><b>{commandInfo[command].icon}</b><small>{commandInfo[command].label}</small><i>+</i></button>)}</div></div>
      <div ref={programRef} className={`visual-code ${!commands.length ? "is-empty" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={dropOnProgram}><div className="visual-code-head"><span>МОЯ ПРОГРАММА</span><b>{commands.length} / 9 БЛОКОВ</b></div>
        {!commands.length ? <div className="visual-code-empty"><strong>ПРОГРАММА ПУСТА</strong><span>Начните с цикла, затем добавляйте действия напрямую или объединяйте их с условиями</span></div> : <ol>{commands.map((command, index) => { const previous = commands[index - 1]; const branchAction = isAction(command) && (previous === "if_front" || isSideCondition(previous) || previous === "else"); const remainingEnds = command === "end" ? commands.slice(index).filter((item) => item === "end").length : 0; const indent = index === 0 ? 0 : branchAction ? 2 : command === "end" ? remainingEnds > 1 ? 1 : 0 : 1; return <li key={`${command}-${index}`} draggable={!locked} onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); moveDragged(index); }} className={`${commandInfo[command].group === "logic" ? "is-logic" : "is-action"} indent-${indent} ${activeIndex === index ? failedIndex === index ? "is-failed" : "is-active" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{commandInfo[command].icon}</b><strong>{commandInfo[command].short}</strong><div><button onClick={() => moveCommand(index, -1)} disabled={locked || index === 0} aria-label="Переместить вверх">↑</button><button onClick={() => moveCommand(index, 1)} disabled={locked || index === commands.length - 1} aria-label="Переместить вниз">↓</button><button onClick={() => removeCommand(index)} disabled={locked} aria-label="Удалить">×</button></div></li>; })}</ol>}</div>
      <div className="program-actions visual-program-actions">{status === "failed" ? <button className="edit-program" onClick={() => { setStatus("idle"); resetRobot(); setMessage("Исправьте выделенную команду и попробуйте ещё раз."); }}>ИЗМЕНИТЬ ПРОГРАММУ</button> : <button className="run-program" onClick={() => void runProgram()} disabled={locked || !commands.length}>ЗАПУСТИТЬ <span>↗</span></button>}<button className="preview-program" onClick={() => void previewProgram()} disabled={locked || !commands.length}>ПРОВЕРИТЬ</button><button className="reset-program" onClick={resetProgram} disabled={locked || !commands.length}>ОЧИСТИТЬ</button><button className="robot-hint-button" onClick={showHint} disabled={locked}><span>?</span>ПОДСКАЗКА</button></div>
      <div className={`program-status ${status === "failed" ? "is-error" : ""}`}><span>{message}</span><b>НЕУДАЧНЫХ ЗАПУСКОВ: {failures}</b></div>
      <div className={`robot-hint-helper ${hintOpen ? "is-talking" : ""}`}><div className="duck-speech"><span>{nextHint}</span><button onClick={() => setHintOpen(false)}>СПАСИБО!</button></div><RoboDuckFace /></div>
    </div></section>
    {status === "success" && finalUnlocked && <div className="fragment-modal-backdrop"><section className="robot-success-modal" role="dialog" aria-modal="true"><div className="fragment-modal-head"><span>NODE_06 / DELIVERED</span><b>ACCESS GRANTED</b></div><div className="fragment-icon">✓</div><span>АЛГОРИТМ ВЫПОЛНЕН</span><h2>Код доставлен на сервер.</h2><p>Финальный терминал разблокирован!</p><button onClick={onFinal}>ОТКРЫТЬ ФИНАЛЬНЫЙ ТЕРМИНАЛ <span>↗</span></button></section></div>}
  </QuestStepShell>;
}
