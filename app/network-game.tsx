"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import QuestStepShell from "./quest-step-shell";
import RoboDuckFace from "./robo-duck-face";
import { loadQuestProgress, updateQuestProgress } from "./quest-storage";

type Direction = "N" | "E" | "S" | "W";
type TileKind = "client" | "router" | "server" | "straight" | "corner" | "tee";
type Tile = { key: string; col: number; row: number; kind: TileKind; links: Direction[] };
type Status = "ready" | "sending" | "failed" | "success";
type Props = { totalErrors: number; totalHints: number; onError: () => void; onHint: () => void; onComplete: () => void; onNext: () => void; onExit: () => void };

const TILES: Tile[] = [
  { key: "1-0", col: 1, row: 0, kind: "tee", links: ["W", "E", "S"] },
  { key: "3-0", col: 3, row: 0, kind: "corner", links: ["E", "S"] },
  { key: "4-0", col: 4, row: 0, kind: "corner", links: ["W", "S"] },
  { key: "0-5", col: 0, row: 5, kind: "client", links: ["E"] },
  { key: "1-5", col: 1, row: 5, kind: "straight", links: ["W", "E"] },
  { key: "2-5", col: 2, row: 5, kind: "corner", links: ["W", "N"] },
  { key: "2-4", col: 2, row: 4, kind: "corner", links: ["S", "W"] },
  { key: "1-4", col: 1, row: 4, kind: "straight", links: ["E", "W"] },
  { key: "0-4", col: 0, row: 4, kind: "corner", links: ["E", "N"] },
  { key: "0-3", col: 0, row: 3, kind: "straight", links: ["S", "N"] },
  { key: "0-2", col: 0, row: 2, kind: "corner", links: ["S", "E"] },
  { key: "1-2", col: 1, row: 2, kind: "straight", links: ["W", "E"] },
  { key: "2-2", col: 2, row: 2, kind: "straight", links: ["W", "E"] },
  { key: "3-2", col: 3, row: 2, kind: "router", links: ["W", "S", "N"] },
  { key: "3-3", col: 3, row: 3, kind: "straight", links: ["N", "S"] },
  { key: "3-4", col: 3, row: 4, kind: "corner", links: ["N", "E"] },
  { key: "4-4", col: 4, row: 4, kind: "straight", links: ["W", "E"] },
  { key: "5-4", col: 5, row: 4, kind: "corner", links: ["W", "N"] },
  { key: "5-3", col: 5, row: 3, kind: "straight", links: ["S", "N"] },
  { key: "5-2", col: 5, row: 2, kind: "corner", links: ["S", "W"] },
  { key: "4-2", col: 4, row: 2, kind: "corner", links: ["E", "N"] },
  { key: "4-1", col: 4, row: 1, kind: "tee", links: ["N", "S", "E"] },
  { key: "5-1", col: 5, row: 1, kind: "server", links: ["W"] },
  { key: "1-1", col: 1, row: 1, kind: "straight", links: ["N", "S"] },
  { key: "2-1", col: 2, row: 1, kind: "straight", links: ["N", "S"] },
  { key: "3-1", col: 3, row: 1, kind: "straight", links: ["N", "S"] },
];
const TILE_MAP = new Map(TILES.map((tile) => [tile.key, tile]));
const DIRS: Direction[] = ["N", "E", "S", "W"];
const VECTOR: Record<Direction, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const OPPOSITE: Record<Direction, Direction> = { N: "S", E: "W", S: "N", W: "E" };
const CLIENT = "0-5"; const ROUTER = "3-2"; const SERVER = "5-1";

function randomRotations() {
  return Object.fromEntries(TILES.map((tile, index) => [tile.key, (index + 1 + Math.floor(Math.random() * 3)) % 4]));
}
function rotatedLinks(tile: Tile, rotations: Record<string, number>) {
  const amount = rotations[tile.key] ?? 0;
  return tile.links.map((direction) => DIRS[(DIRS.indexOf(direction) + amount) % 4]);
}
function connectedNeighbors(key: string, rotations: Record<string, number>) {
  const tile = TILE_MAP.get(key); if (!tile) return [];
  return rotatedLinks(tile, rotations).flatMap((direction) => {
    const [dx, dy] = VECTOR[direction]; const next = TILE_MAP.get(`${tile.col + dx}-${tile.row + dy}`);
    return next && rotatedLinks(next, rotations).includes(OPPOSITE[direction]) ? [next.key] : [];
  });
}
function hasOpenExit(key: string, rotations: Record<string, number>) {
  const tile = TILE_MAP.get(key); if (!tile) return false;
  return rotatedLinks(tile, rotations).some((direction) => {
    const [dx, dy] = VECTOR[direction]; const next = TILE_MAP.get(`${tile.col + dx}-${tile.row + dy}`);
    return !next || !rotatedLinks(next, rotations).includes(OPPOSITE[direction]);
  });
}
function analyzeNetwork(rotations: Record<string, number>) {
  const visited = new Set([CLIENT]); const waves: string[][] = [[CLIENT]]; let frontier = [CLIENT];
  while (frontier.length) {
    const nextWave: string[] = [];
    for (const key of frontier) for (const next of connectedNeighbors(key, rotations)) if (!visited.has(next)) { visited.add(next); nextWave.push(next); }
    if (!nextWave.length) break; waves.push(nextWave); frontier = nextWave;
  }
  const leakingCells = [...visited].filter((key) => hasOpenExit(key, rotations));
  const reachesRouter = visited.has(ROUTER); const reachesServer = visited.has(SERVER);
  return { success: reachesRouter && reachesServer && !leakingCells.length, leak: Boolean(leakingCells.length), leakingCells, waves };
}

export default function NetworkGame({ totalErrors, totalHints, onError, onHint, onComplete, onNext, onExit }: Props) {
  const [rotations, setRotations] = useState<Record<string, number>>({}); const [status, setStatus] = useState<Status>("ready");
  const [packetCells, setPacketCells] = useState<string[]>([]); const [traced, setTraced] = useState<string[]>([]); const [leakingCells, setLeakingCells] = useState<string[]>([]); const [hintUsed, setHintUsed] = useState(false);
  const [hintMode, setHintMode] = useState<"closed" | "shown">("closed"); const [message, setMessage] = useState("Поверните элементы и восстановите маршрут через ROUTER.");
  const [rewardVisible, setRewardVisible] = useState(false);
  const runId = useRef(0);
  useEffect(() => { const timer = window.setTimeout(() => { const progress = loadQuestProgress(); const saved = progress.networkRotations; const savedMatchesBoard = Object.keys(saved).length === TILES.length && TILES.every((tile) => Number.isInteger(saved[tile.key])); const initial = savedMatchesBoard ? saved : randomRotations(); setRotations(initial); setHintUsed(progress.networkHintUsed); if (!savedMatchesBoard) updateQuestProgress({ networkRotations: initial }); if (progress.task5Complete) { setStatus("success"); setMessage("Соединение восстановлено."); setRewardVisible(true); } }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => () => { runId.current += 1; }, []);
  const cells = useMemo(() => Array.from({ length: 36 }, (_, index) => `${index % 6}-${Math.floor(index / 6)}`), []);
  const pause = (ms: number, id: number) => new Promise<boolean>((resolve) => window.setTimeout(() => resolve(runId.current === id), ms));
  function rotateTile(key: string) { if (status === "sending" || status === "success") return; setStatus("ready"); setTraced([]); setPacketCells([]); setLeakingCells([]); setMessage("Конфигурация изменена. Можно отправлять пакет."); setRotations((current) => { const next = { ...current, [key]: ((current[key] ?? 0) + 1) % 4 }; updateQuestProgress({ networkRotations: next }); return next; }); }
  async function sendPacket() {
    if (status === "sending" || status === "success" || !Object.keys(rotations).length) return; const id = ++runId.current; const result = analyzeNetwork(rotations); setStatus("sending"); setHintMode("closed"); setTraced([]); setLeakingCells([]); setMessage("Пакет отправлен. Сигнал проходит по всей подключённой сети…");
    for (const wave of result.waves) { const visibleWave = result.success ? wave : wave.filter((key) => key !== SERVER); if (!visibleWave.length) continue; setPacketCells(visibleWave); setTraced((current) => Array.from(new Set([...current, ...visibleWave]))); if (!await pause(180, id)) return; }
    setPacketCells([]);
    if (!result.success) { setStatus("failed"); setLeakingCells(result.leakingCells); setMessage(result.leak ? "Пакет потерян: в подключённой сети остался открытый выход. Замкните все ответвления и контуры." : "Пакет потерян. Сеть не соединяет CLIENT, ROUTER и SERVER в единый контур."); onError(); return; }
    setStatus("success"); setMessage("Соединение восстановлено. Пакет успешно доставлен на центральный сервер."); updateQuestProgress({ task5Complete: true, currentStage: 6, fragments: Array.from(new Set([...loadQuestProgress().fragments, "6"])) }); onComplete(); await pause(420, id); if (runId.current === id) setRewardVisible(true);
  }
  function showHint() { if (!hintUsed) { setHintUsed(true); onHint(); updateQuestProgress({ networkHintUsed: true }); } setHintMode("shown"); }

  return <QuestStepShell code="NET" step={5} title="Восстановите соединение" errors={totalErrors} hints={totalHints} onExit={onExit}>
    <section className={`network-layout network-${status}`}>
      <div className="network-copy"><span className="game-kicker">ЗАДАНИЕ 05 / NETWORK REPAIR</span><h1>Восстановите<br /><em>соединение</em></h1><p><b>Часть сетевой инфраструктуры повреждена.</b> Поворачивайте элементы сети так, чтобы пакет прошёл от CLIENT через обязательный узел ROUTER к SERVER.</p>
        <div className="network-rules"><div><span>01</span><p>Нажатие поворачивает элемент на 90°. Повороты не считаются ошибками.</p></div><div><span>02</span><p>Сигнал идёт по всем веткам. Каждый выход и контур должен быть замкнут, иначе пакет потеряется.</p></div></div>
        <button className="bugs-hint" type="button" onClick={showHint} disabled={status === "sending" || status === "success"}><span>?</span>ПОЗВАТЬ РОБО-УТКУ</button>
        <div className={`network-duck-helper ${hintMode === "shown" ? "is-talking" : ""}`}><div className="duck-speech"><span>Начните с CLIENT и проверьте, куда может идти соединение из каждой следующей клетки. Не забудьте: маршрут должен пройти через ROUTER.</span><button onClick={() => setHintMode("closed")}>СПАСИБО!</button></div><RoboDuckFace /></div>
      </div>
      <div className="network-console"><div className="network-head"><span>NETWORK_TOPOLOGY / 6×6</span><b>{status === "sending" ? "PACKET IN TRANSIT" : status === "success" ? "ONLINE" : "CONNECTION LOST"}</b></div>
        <div className="network-board" aria-label="Сетевое поле шесть на шесть">{cells.map((key) => { const tile = TILE_MAP.get(key); const rotation = rotations[key] ?? 0; const hinted = hintMode === "shown" && [CLIENT, ROUTER, SERVER].includes(key); return <div className={`network-cell ${tile ? "has-tile" : ""} ${hinted ? "is-hint" : ""} ${traced.includes(key) ? "is-traced" : ""} ${leakingCells.includes(key) ? "is-leaking" : ""}`} key={key}>{tile && <button type="button" onClick={() => rotateTile(key)} disabled={status === "sending" || status === "success"} aria-label={`Повернуть элемент ${tile.kind}`} style={{ "--rotation": `${rotation * 90}deg` } as CSSProperties}><Pipe links={tile.links} /><strong>{tile.kind === "client" ? "CLIENT" : tile.kind === "router" ? "ROUTER" : tile.kind === "server" ? "SERVER" : ""}</strong></button>}{packetCells.includes(key) && <i className="network-packet" aria-label="Пакет" />}</div>; })}</div>
        <div className={`network-message message-${status}`} aria-live="polite"><span>{message}</span><b>{status === "success" ? "ACCESS RESTORED" : "CLIENT → ROUTER → SERVER"}</b></div><button className="send-packet" type="button" onClick={() => void sendPacket()} disabled={status === "sending" || status === "success"}>ОТПРАВИТЬ ПАКЕТ <span>↗</span></button>
      </div>
    </section>
    {status === "success" && rewardVisible && <div className="fragment-modal-backdrop"><section className="fragment-modal" role="dialog" aria-modal="true"><div className="fragment-modal-head"><span>NODE_05 / ONLINE</span><b>PACKET DELIVERED</b></div><div className="fragment-icon">✓</div><span>ПОЛУЧЕН ФРАГМЕНТ КОДА</span><strong>6</strong><p>Соединение восстановлено. Фрагмент сохранён в терминале.</p><div className="fragment-modal-actions"><button onClick={onNext}>СЛЕДУЮЩИЙ УРОВЕНЬ <span>06 ↗</span></button><button onClick={onExit}>НА ГЛАВНУЮ</button></div></section></div>}
  </QuestStepShell>;
}

function Pipe({ links }: { links: Direction[] }) {
  return <span className="network-pipe" aria-hidden="true"><i className="pipe-core" />{links.map((direction) => <i className={`pipe-arm arm-${direction}`} key={direction} />)}</span>;
}
