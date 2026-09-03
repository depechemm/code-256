export const QUEST_TASKS = [
  { id: 1, code: "MEM", title: "Оперативная память", time: "10 мин", fragment: "CO" },
  { id: 2, code: "BUGS", title: "Распределение багов", time: "8–10 мин", fragment: "2" },
  { id: 3, code: "CIPHER", title: "Зашифрованное сообщение", time: "5–7 мин", fragment: "DE" },
  { id: 4, code: "ALGO", title: "Выполни алгоритм", time: "5–7 мин", fragment: "5" },
  { id: 5, code: "DASH", title: "Найди пять багов", time: "12–15 мин", fragment: "6" },
  { id: 6, code: "ROBOT", title: "Доставь код на сервер", time: "7–10 мин", fragment: "---" },
] as const;

export const MEMORY_ROUNDS = [3, 4, 5, 6, 7, 8] as const;
