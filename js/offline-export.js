function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function normalizeChoices(question) {
  if (!Array.isArray(question.choices)) return "";
  return question.choices
    .map((choice, index) => {
      const isCorrect = Array.isArray(question.answer)
        ? question.answer.includes(index)
        : Number(question.answer) === index;
      return `<li class="${isCorrect ? "correct" : ""}">${escapeHtml(choice)}</li>`;
    })
    .join("");
}

function formatQuestion(question, index) {
  const answerMarkup =
    question.type === "mcq" || question.type === "multi"
      ? `<ul class="export-choices">${normalizeChoices(question)}</ul>`
      : question.type === "tf"
        ? `<p class="export-answer">Correct answer: ${question.answer === true ? "True" : "False"}</p>`
        : question.type === "match"
          ? `<ul class="export-choices">${(question.pairs || []).map((pair) => `<li>${escapeHtml(pair.left)} → ${escapeHtml(pair.right)}</li>`).join("")}</ul>`
          : question.type === "writing"
            ? `<p class="export-answer">Model answer: ${escapeHtml(question.modelAnswer || "Not provided")}</p>`
            : "";

  const explanationMarkup = question.explanation
    ? `<div class="export-explanation"><strong>Explanation</strong><p>${escapeHtml(question.explanation)}</p></div>`
    : "";

  return `
    <article class="export-card">
      <h3>Question ${index + 1}</h3>
      <p class="prompt">${escapeHtml(question.prompt || "")}</p>
      ${answerMarkup}
      ${explanationMarkup}
    </article>
  `;
}

export function buildOfflineQuizHtml(bank) {
  const title = escapeHtml(bank?.title || "Question Bank");
  const questionsMarkup = (bank?.questions || []).map((question, index) => formatQuestion(question, index)).join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #0f172a;
        --card: #111827;
        --text: #f8fafc;
        --muted: #cbd5e1;
        --border: #334155;
        --accent: #60a5fa;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.6;
        padding: 32px 18px;
      }
      .wrap {
        max-width: 900px;
        margin: 0 auto;
      }
      h1 {
        margin: 0 0 24px;
      }
      .export-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 18px;
      }
      .prompt {
        font-size: 1.05rem;
        font-weight: 700;
        margin: 0 0 12px;
      }
      .export-choices {
        margin: 12px 0;
        padding-left: 1.3rem;
      }
      .export-choices li.correct {
        color: var(--accent);
      }
      .export-answer {
        margin: 0;
        color: var(--muted);
        font-weight: 600;
      }
      .export-explanation {
        background: rgba(255,255,255,0.03);
        border-left: 3px solid var(--accent);
        border-radius: 8px;
        padding: 12px 14px;
        margin-top: 16px;
      }
      .export-explanation strong {
        color: var(--muted);
        display: block;
        margin-bottom: 8px;
      }
      .export-explanation p { margin: 0; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>${title}</h1>
      ${questionsMarkup}
    </div>
  </body>
</html>`;
}

export function downloadOfflineQuizHtml(bank) {
  const html = buildOfflineQuizHtml(bank);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const safeTitle = (bank?.title || "question-bank")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "question-bank";

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeTitle}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
