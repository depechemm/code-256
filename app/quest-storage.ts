export const QUEST_STORAGE_KEY = "code256.progress.v1";

export type QuestProgress = {
  attemptId: string;
  participant: string;
  startedAt: number | null;
  currentStage: number;
  memoryRound: number;
  task1Complete: boolean;
  task2Complete: boolean;
  task3Complete: boolean;
  cipherAnswer: string;
  cipherHintUsed: boolean;
  task4Complete: boolean;
  task5Complete: boolean;
  networkRotations: Record<string, number>;
  networkHintUsed: boolean;
  task6Complete: boolean;
  robotProgram: string[];
  robotFailures: number;
  robotHintUsed: boolean;
  errors: number;
  hints: number;
  fragments: string[];
  finishedAt: number | null;
  status: "active" | "completed" | "timeout";
};

const initialProgress: QuestProgress = {
  attemptId: "",
  participant: "",
  startedAt: null,
  currentStage: 1,
  memoryRound: 0,
  task1Complete: false,
  task2Complete: false,
  task3Complete: false,
  cipherAnswer: "",
  cipherHintUsed: false,
  task4Complete: false,
  task5Complete: false,
  networkRotations: {},
  networkHintUsed: false,
  task6Complete: false,
  robotProgram: [],
  robotFailures: 0,
  robotHintUsed: false,
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
    try {
      const value: unknown = JSON.parse(stored);
      const parsed = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<QuestProgress> : {};
      const normalized: QuestProgress = {
        ...initialProgress,
        ...parsed,
        fragments: Array.isArray(parsed.fragments) ? parsed.fragments.filter((fragment): fragment is string => typeof fragment === "string") : [],
        robotProgram: Array.isArray(parsed.robotProgram) ? parsed.robotProgram.filter((line): line is string => typeof line === "string") : [],
        networkRotations: parsed.networkRotations && typeof parsed.networkRotations === "object" && !Array.isArray(parsed.networkRotations) ? parsed.networkRotations : {},
      };
      if (!Array.isArray(parsed.fragments) || !Array.isArray(parsed.robotProgram) || normalized.networkRotations !== parsed.networkRotations) localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch { localStorage.removeItem(QUEST_STORAGE_KEY); }
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
    fragments: (() => { try { const value: unknown = JSON.parse(localStorage.getItem("fragments") ?? "[]"); return Array.isArray(value) ? value.filter((fragment): fragment is string => typeof fragment === "string") : []; } catch { return []; } })(),
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
