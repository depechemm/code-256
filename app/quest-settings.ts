export const FINAL_CODE = "CODE256";

export const GOOGLE_FORM = {
  // Ссылка вида: https://docs.google.com/forms/d/e/FORM_ID/viewform
  publicUrl: "https://docs.google.com/forms/d/e/1FAIpQLSf-KR2HG17lqdxABQcoJeO04rWMkqNY3LIUJRqzIfbj7tD5MA/viewform",
  // Ссылка из Google Forms → Отправить → <> → src=".../viewform?embedded=true"
  embedUrl: "https://docs.google.com/forms/d/e/1FAIpQLSf-KR2HG17lqdxABQcoJeO04rWMkqNY3LIUJRqzIfbj7tD5MA/viewform?embedded=true",
  submitUrl: "https://docs.google.com/forms/d/e/1FAIpQLSf-KR2HG17lqdxABQcoJeO04rWMkqNY3LIUJRqzIfbj7tD5MA/formResponse",
  // Идентификаторы полей из ссылки «Получить предварительно заполненную ссылку».
  fields: {
    participant: "467980030",
    code: "1700006196",
    time: "116388531",
    errors: "1179560072",
    hints: "835036064",
  },
} as const;
