import { FINAL_CODE, RESULT_STORAGE_MODE } from "@/app/quest-settings";
import { saveQuestResult, type QuestResult } from "@/app/lib/results-db";

export const runtime = "nodejs";

const REQUIRED_FRAGMENTS = ["CO", "2", "DE", "5", "6"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseResult(value: unknown): QuestResult | null {
  if (!isRecord(value) || value.finalCode !== FINAL_CODE || !isRecord(value.progress)) return null;
  const progress = value.progress;
  const attemptId = typeof progress.attemptId === "string" ? progress.attemptId.trim() : "";
  const participant = typeof progress.participant === "string" ? progress.participant.trim() : "";
  const fragments = Array.isArray(progress.fragments)
    ? progress.fragments.filter((fragment): fragment is string => typeof fragment === "string")
    : [];

  if (
    !attemptId || attemptId.length > 100
    || participant.length < 3 || participant.length > 200
    || !isNonNegativeInteger(progress.startedAt)
    || !isNonNegativeInteger(progress.finishedAt)
    || progress.finishedAt < progress.startedAt
    || !isNonNegativeInteger(progress.errors)
    || !isNonNegativeInteger(progress.hints)
    || progress.currentStage !== 7
    || progress.task6Complete !== true
    || progress.status !== "completed"
    || !REQUIRED_FRAGMENTS.every((fragment) => fragments.includes(fragment))
  ) return null;

  return {
    attemptId,
    participant,
    startedAt: progress.startedAt,
    finishedAt: progress.finishedAt,
    errors: progress.errors,
    hints: progress.hints,
    finalCode: FINAL_CODE,
    fragments,
    progress,
  };
}

export async function POST(request: Request) {
  if (RESULT_STORAGE_MODE !== "sqlite") {
    return Response.json({ error: "Сохранение в SQLite отключено." }, { status: 503 });
  }

  try {
    const result = parseResult(await request.json());
    if (!result) return Response.json({ error: "Некорректные данные прохождения." }, { status: 400 });

    saveQuestResult(result);
    return Response.json({ ok: true, attemptId: result.attemptId });
  } catch (error) {
    console.error("Failed to save quest result", error);
    return Response.json({ error: "Не удалось сохранить результат." }, { status: 500 });
  }
}
