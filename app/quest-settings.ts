export const FINAL_CODE = "CODE256";

export type ResultStorageMode = "local" | "sqlite";

export const RESULT_STORAGE_MODE: ResultStorageMode =
  process.env.NEXT_PUBLIC_RESULT_STORAGE_MODE?.trim().toLowerCase() === "local"
    ? "local"
    : "sqlite";
