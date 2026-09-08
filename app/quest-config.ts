export const QUEST_TASKS = [
  { id: 1, code: "MEM", title: "Оперативная память", time: "10 мин", fragment: "CO" },
  { id: 2, code: "BUGS", title: "Распределение багов", time: "8–10 мин", fragment: "2" },
  { id: 3, code: "CIPHER", title: "Зашифрованное сообщение", time: "5–7 мин", fragment: "DE" },
  { id: 4, code: "ALGO", title: "Выполните алгоритм", time: "5–7 мин", fragment: "5" },
  { id: 5, code: "NET", title: "Восстановите соединение", time: "10–12 мин", fragment: "6" },
  { id: 6, code: "ROBOT", title: "Доставьте код на сервер", time: "7–10 мин", fragment: "" },
] as const;

export const MEMORY_ROUNDS = [3, 4, 5, 6, 7, 8] as const;
