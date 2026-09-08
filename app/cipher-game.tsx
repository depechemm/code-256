"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import QuestStepShell from "./quest-step-shell";
import RoboDuckFace from "./robo-duck-face";
import { loadQuestProgress, updateQuestProgress } from "./quest-storage";

type Props = { totalErrors: number; totalHints: number; onError: () => void; onHint: () => void; onComplete: () => void; onNext: () => void; onExit: () => void };
type DuckMessage = "dictionary" | "hint" | null;
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function CipherGame({ totalErrors, totalHints, onError, onHint, onComplete, onNext, onExit }: Props) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error" | "success">("idle");
  const [duckMessage, setDuckMessage] = useState<DuckMessage>("dictionary");
  const [duckClosing, setDuckClosing] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [dictionaryClosing, setDictionaryClosing] = useState(false);
  const dictionaryTimer = useRef<number | null>(null);
  const duckTimer = useRef<number | null>(null);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const progress = loadQuestProgress();
      setAnswer(progress.cipherAnswer);
      setHintUsed(progress.cipherHintUsed);
      if (progress.task3Complete) setStatus("success");
    }, 0);
    return () => {
      window.clearTimeout(restore);
      if (dictionaryTimer.current !== null) window.clearTimeout(dictionaryTimer.current);
      if (duckTimer.current !== null) window.clearTimeout(duckTimer.current);
    };
  }, []);

  function openDictionary() {
    if (dictionaryTimer.current !== null) window.clearTimeout(dictionaryTimer.current);
    setDuckMessage(null);
    setDictionaryClosing(false);
    setDictionaryOpen(true);
  }

  function closeDictionary() {
    if (dictionaryClosing) return;
    setDictionaryClosing(true);
    dictionaryTimer.current = window.setTimeout(() => {
      setDictionaryOpen(false);
      setDictionaryClosing(false);
      dictionaryTimer.current = null;
    }, 320);
  }

  function changeAnswer(value: string) {
    setAnswer(value);
    if (status === "error") setStatus("idle");
    updateQuestProgress({ cipherAnswer: value });
  }

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim() || status === "checking" || status === "success") return;
    setStatus("checking");
    window.setTimeout(() => {
      const normalized = answer.trim().toUpperCase();
      if (normalized === "DEBUG") {
        setAnswer(normalized);
        setStatus("success");
        updateQuestProgress({ cipherAnswer: normalized, task3Complete: true });
        onComplete();
      } else {
        setStatus("error");
        onError();
      }
    }, 550);
  }

  function requestHint() {
    if (duckTimer.current !== null) window.clearTimeout(duckTimer.current);
    setDuckClosing(false);
    if (!hintUsed) {
      setHintUsed(true);
      updateQuestProgress({ cipherHintUsed: true });
      onHint();
    }
    setDuckMessage("hint");
  }

  function closeDuckMessage() {
    if (duckClosing) return;
    setDuckClosing(true);
    duckTimer.current = window.setTimeout(() => {
      setDuckMessage(null);
      setDuckClosing(false);
      duckTimer.current = null;
    }, 440);
  }

  return <QuestStepShell code="CIPHER" step={3} title="Зашифрованное сообщение" errors={totalErrors} hints={totalHints} onExit={onExit}>
    <section className={`cipher-simple-layout cipher-simple-${status}`}>
      <div className="cipher-simple-copy">
        <span className="game-kicker">ЗАДАНИЕ 03 / RECOVER MESSAGE</span>
        <h1>Зашифрованное<br /><em>сообщение</em></h1>
        <p>Найден фрагмент инструкции, использованной для шифрования сообщения. Само исходное сообщение повреждено. Восстановите его, используя найденный алгоритм.</p>
        <div className="cipher-encrypted-card"><small>ЗАШИФРОВАННОЕ СООБЩЕНИЕ</small><strong>QSECN</strong><span>5 SYMBOLS / A–Z</span></div>
        <div className="cipher-helper-actions"><button className="bugs-hint cipher-simple-hint" type="button" onClick={requestHint} disabled={status === "success"}><span>?</span>ПОЗВАТЬ РОБО-УТКУ</button><button className={`alphabet-button ${duckMessage === "dictionary" ? "is-pointed" : ""}`} type="button" onClick={openDictionary}><span>AZ</span>СЛОВАРЬ {duckMessage === "dictionary" && <i className={`dictionary-pointer ${duckClosing ? "is-closing" : ""}`} aria-hidden="true"><span>↑</span><small>НАЖИМАТЬ СЮДА</small></i>}</button></div>
        {duckMessage !== null && <div className={`cipher-duck-message ${duckClosing ? "is-closing" : "is-visible"} ${duckMessage === "dictionary" ? "is-dictionary-intro" : ""}`} aria-live="polite"><div className="duck-speech">{duckMessage === "dictionary" ? <><span>Кря! Рядом доступен словарь букв и их позиций. Его можно открывать сколько угодно — это не считается подсказкой и не влияет на результат.</span><button type="button" onClick={closeDuckMessage} disabled={duckClosing}>ХОРОШО</button></> : <><span>В записке указан алгоритм шифрования, а восстановить нужно исходное сообщение. Чтобы отменить последовательность действий, начните с последнего выполненного действия и двигайтесь в обратном порядке.</span><button type="button" onClick={closeDuckMessage} disabled={duckClosing}>СПАСИБО!</button></>}</div><RoboDuckFace /></div>}
      </div>

      <div className="found-note-panel">
        <div className="found-note-head"><span>RECOVERED_NOTE.TXT</span><b>READ ONLY</b></div>
        <article className="found-note">
          <div className="note-tape" aria-hidden="true" />
          <span>НАЙДЕННАЯ ЗАПИСКА</span><h2>Алгоритм шифрования:</h2>
          <ol><li><b>01</b><p>Буквы на <strong>нечётных позициях</strong> сдвинуть на <strong>3 позиции вправо</strong> по английскому алфавиту.</p></li><li><b>02</b><p>Буквы на <strong>чётных позициях</strong> сдвинуть на <strong>2 позиции влево</strong> по английскому алфавиту.</p></li><li><b>03</b><p>Поменять порядок букв на обратный.</p></li><li><b>04</b><p>Первую и последнюю букву получившейся строки сдвинуть вправо на <code>N × 2 − 3</code> позиций, где <code>N</code> — количество букв в исходном сообщении.</p></li></ol>
        </article>
        <form className="cipher-answer-form" onSubmit={checkAnswer}>
          <label htmlFor="cipher-answer">РАСШИФРОВАННОЕ СООБЩЕНИЕ</label>
          <div><span>&gt;</span><input id="cipher-answer" value={answer} onChange={(event) => changeAnswer(event.target.value)} disabled={status === "success"} autoComplete="off" spellCheck={false} placeholder="Введите исходное сообщение" /><button type="submit" disabled={!answer.trim() || status === "checking" || status === "success"}>{status === "checking" ? "ПРОВЕРЯЕМ..." : "ПРОВЕРИТЬ"}<b>↗</b></button></div>
          <div className={`cipher-result-message result-${status}`} aria-live="polite"><i />{status === "error" ? <p><strong>Пока не сходится.</strong> Проверьте порядок обратных действий и расчёты.</p> : status === "success" ? <p><strong>Сообщение восстановлено.</strong> Найденное слово: <code>DEBUG</code></p> : status === "checking" ? <p><strong>Проверяем сообщение...</strong> Сверяем результат с восстановленным модулем.</p> : <p>Введите предполагаемое исходное сообщение и запустите проверку.</p>}</div>
        </form>
      </div>
    </section>

    {dictionaryOpen && <div className={`alphabet-backdrop ${dictionaryClosing ? "is-closing" : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDictionary(); }}><section className="alphabet-dialog" role="dialog" aria-modal="true" aria-labelledby="alphabet-title"><div className="alphabet-head"><div><small>REFERENCE / FREE ACCESS</small><h2 id="alphabet-title">Словарь</h2></div><button type="button" onClick={closeDictionary} aria-label="Закрыть словарь">×</button></div><p>Позиции букв в английском алфавите.</p><div className="alphabet-grid">{alphabet.map((letter, index) => <div key={letter}><strong>{letter}</strong><span>{String(index + 1).padStart(2, "0")}</span></div>)}</div><div className="alphabet-foot"><span>&gt; A = 01 / Z = 26</span><button type="button" onClick={closeDictionary}>ВЕРНУТЬСЯ К ЗАДАНИЮ</button></div></section></div>}
    {status === "success" && <div className="fragment-modal-backdrop" role="presentation"><section className="fragment-modal" role="dialog" aria-modal="true" aria-labelledby="fragment-three-title"><div className="fragment-modal-head"><span>NODE_03 / DECRYPTED</span><b>MESSAGE RECOVERED</b></div><div className="fragment-icon" aria-hidden="true">✓</div><span>ПОЛУЧЕН ФРАГМЕНТ КОДА</span><strong id="fragment-three-title">DE</strong><p>Сообщение DEBUG восстановлено. Новый фрагмент сохранён в терминале.</p><div className="fragment-modal-actions"><button type="button" onClick={onNext}>СЛЕДУЮЩИЙ УРОВЕНЬ <span>04 ↗</span></button><button type="button" onClick={onExit}>НА ГЛАВНУЮ</button></div></section></div>}
  </QuestStepShell>;
}
