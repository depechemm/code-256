import "server-only";

import { mkdirSync } from "node:fs";
import { isAbsolute, dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type QuestResult = {
  attemptId: string;
  participant: string;
  startedAt: number;
  finishedAt: number;
  errors: number;
  hints: number;
  finalCode: string;
  fragments: string[];
  progress: Record<string, unknown>;
};

let database: DatabaseSync | null = null;

const SCHEMA_VERSION = 3;
const RESULTS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS quest_results (
    attempt_id TEXT PRIMARY KEY,
    participant TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER NOT NULL,
    errors INTEGER NOT NULL,
    hints INTEGER NOT NULL,
    saved_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX IF NOT EXISTS quest_results_rating
    ON quest_results(started_at, finished_at, errors, hints);
`;

function getDatabase() {
  if (database) return database;

  const configuredPath = process.env.SQLITE_PATH?.trim() || "data/code256.sqlite";
  const databasePath = isAbsolute(configuredPath)
    ? configuredPath
    : resolve(process.cwd(), configuredPath);

  mkdirSync(dirname(databasePath), { recursive: true });
  database = new DatabaseSync(databasePath, { timeout: 5_000 });
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const versionRow = database.prepare("PRAGMA user_version").get() as { user_version: number };
  if (versionRow.user_version < SCHEMA_VERSION) {
    database.exec(`
      DROP TABLE IF EXISTS quest_results;
      ${RESULTS_SCHEMA}
      PRAGMA user_version = ${SCHEMA_VERSION};
    `);
  } else {
    database.exec(RESULTS_SCHEMA);
  }

  return database;
}

export function saveQuestResult(result: QuestResult) {
  const statement = getDatabase().prepare(`
    INSERT INTO quest_results (
      attempt_id,
      participant,
      started_at,
      finished_at,
      errors,
      hints,
      saved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(attempt_id) DO NOTHING
  `);

  return statement.run(
    result.attemptId,
    result.participant,
    result.startedAt,
    result.finishedAt,
    result.errors,
    result.hints,
    Date.now(),
  );
}
