export const QUEST_STORAGE_KEY = "code256.progress.v1";

export type QuestProgress = {
  participant: string;
  startedAt: number | null;
  currentStage: number;
  memoryRound: number;
  task1Complete: boolean;
  task2Complete: boolean;
  task3Complete: boolean;
  task4Complete: boolean;
  errors: number;
  hints: number;
  fragments: string[];
  finishedAt: number | null;
  status: "active" | "completed" | "timeout";
};

const initialProgress: QuestProgress = {
  participant: "",
  startedAt: null,
  currentStage: 1,
  memoryRound: 0,
  task1Complete: false,
  task2Complete: false,
  task3Complete: false,
  task4Complete: false,
  errors: 0,
  hints: 0,
  fragments: [],
  finishedAt: null,
  status: "active",
};

const legacyKeys = ["participant", "startedAt", "currentStage", "taskProgress", "errors", "hints", "fragments", "finishedAt", "status"];

export function loadQuestProgress(): QuestProgress {
  const stored = localStorage.getItem(QUEST_STORAGE_KEY);
  if (stored) {
    try { return { ...initialProgress, ...JSON.parse(stored) as Partial<QuestProgress> }; } catch { localStorage.removeItem(QUEST_STORAGE_KEY); }
  }

  const oldTaskProgress = JSON.parse(localStorage.getItem("taskProgress") ?? "{}") as { memoryRound?: number; task1Complete?: boolean };
  const migrated: QuestProgress = {
    ...initialProgress,
    participant: localStorage.getItem("participant") ?? "",
    startedAt: Number(localStorage.getItem("startedAt")) || null,
    currentStage: Number(localStorage.getItem("currentStage")) || 1,
    memoryRound: oldTaskProgress.memoryRound ?? 0,
    task1Complete: Boolean(oldTaskProgress.task1Complete),
    errors: Number(localStorage.getItem("errors")) || 0,
    hints: Number(localStorage.getItem("hints")) || 0,
    fragments: JSON.parse(localStorage.getItem("fragments") ?? "[]") as string[],
    finishedAt: Number(localStorage.getItem("finishedAt")) || null,
    status: localStorage.getItem("status") === "completed" ? "completed" : "active",
  };
  localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(migrated));
  legacyKeys.forEach((key) => localStorage.removeItem(key));
  return migrated;
}

export function updateQuestProgress(patch: Partial<QuestProgress>) {
  const next = { ...loadQuestProgress(), ...patch };
  localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(next));
  return next;
}
