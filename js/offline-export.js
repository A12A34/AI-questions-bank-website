function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serializeBank(bank) {
  return JSON.stringify(bank ?? { title: "Question Bank", questions: [] })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function buildOfflineQuizHtml(bank) {
  const title = escapeHtml(bank?.title || "Question Bank");
  const data = serializeBank(bank);

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
        --correct: #34d399;
        --incorrect: #fb7185;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.6;
        padding: 24px 18px 48px;
      }
      .wrap { max-width: 920px; margin: 0 auto; }
      header { border-bottom: 1px solid var(--border); margin-bottom: 20px; padding-bottom: 18px; }
      h1 { margin: 0 0 16px; }
      .controls { display: flex; flex-wrap: wrap; gap: 12px 18px; align-items: center; }
      label, button { font: inherit; }
      button { cursor: pointer; }
      .btn, .choice, select, textarea {
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--card);
        color: var(--text);
      }
      .btn { padding: 8px 12px; }
      .btn-primary { background: var(--accent); border-color: var(--accent); color: #07111f; font-weight: 700; }
      .btn:disabled { cursor: not-allowed; opacity: .55; }
      .status { color: var(--muted); margin: 12px 0; }
      .question-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 16px;
        scroll-margin-top: 16px;
      }
      .question-card.is-hidden { display: none; }
      .question-top { display: flex; justify-content: space-between; gap: 12px; }
      .question-number { color: var(--muted); font-weight: 700; margin: 0; }
      .bookmark { background: transparent; border: 0; color: var(--accent); padding: 0; }
      .prompt { font-size: 1.08rem; font-weight: 700; margin: 10px 0 14px; white-space: pre-wrap; }
      .choices { display: grid; gap: 8px; list-style: none; margin: 0; padding: 0; }
      .choice { display: block; padding: 10px 12px; white-space: pre-wrap; }
      .choice input { margin-right: 8px; }
      .choice.correct { border-color: var(--correct); color: var(--correct); }
      .choice.incorrect { border-color: var(--incorrect); color: var(--incorrect); }
      .match-row { display: flex; align-items: center; gap: 12px; margin: 8px 0; }
      .match-row span { flex: 1; }
      select { padding: 8px; flex: 1; }
      textarea {
        display: block;
        min-height: 120px;
        padding: 10px;
        resize: vertical;
        width: 100%;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: 0.95rem;
        line-height: 1.5;
        tab-size: 4;
      }
      .actions { align-items: center; display: flex; gap: 12px; margin-top: 14px; }
      .feedback { font-weight: 700; margin: 0; }
      .feedback.ok { color: var(--correct); }
      .feedback.err { color: var(--incorrect); }
      .feedback.warn, .explanation, .model-answer { color: var(--muted); }
      .explanation, .model-answer { border-left: 3px solid var(--accent); margin: 16px 0 0; padding: 8px 12px; white-space: pre-wrap; }
      .model-answer:not([dir="rtl"]) { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
      .explanation strong, .model-answer strong { display: block; color: var(--text); font-family: Arial, sans-serif; }
      .submit-actions { display: flex; justify-content: flex-end; margin-top: 18px; }
      .empty { color: var(--muted); text-align: center; }
      @media (max-width: 600px) {
        .match-row { align-items: stretch; flex-direction: column; gap: 4px; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <header>
        <h1>${title}</h1>
        <p id="progress" class="status"></p>
        <p id="score" class="status" hidden></p>
        <div class="controls">
          <label><input type="radio" name="mode" value="practice" checked> Practice</label>
          <label><input type="radio" name="mode" value="test"> Test</label>
          <label><input type="checkbox" id="shuffle-questions"> Shuffle questions</label>
          <label><input type="checkbox" id="shuffle-choices"> Shuffle choices</label>
          <label><input type="checkbox" id="bookmarks-only"> Bookmarks only</label>
        </div>
      </header>
      <main id="questions"></main>
      <p id="empty" class="empty" hidden>No bookmarked questions yet.</p>
      <div class="submit-actions">
        <button type="button" id="submit" class="btn btn-primary" hidden>Submit test</button>
      </div>
    </div>
    <script>
      const bank = ${data};
      const state = {
        mode: "practice",
        shuffleQuestions: false,
        shuffleChoices: false,
        bookmarksOnly: false,
        questions: [],
        answers: new Map(),
        revealed: new Set(),
        bookmarks: new Set(),
        submitted: false,
        score: null
      };

      const $ = (selector) => document.querySelector(selector);
      const questionsHost = $("#questions");
      const shuffle = (items) => {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      };
      const isWriting = (question) => question.type === "writing";
      const isLocked = (question) => state.submitted || state.revealed.has(question.id);
      const answerFor = (question) => state.answers.get(question.id);
      const sameSet = (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).every((value, i) => value === [...b].sort((x, y) => x - y)[i]);

      function prepareQuestions() {
        let questions = (bank.questions || []).map((question) => ({ ...question }));
        if (state.shuffleQuestions) questions = shuffle(questions);
        return questions.map((question) => {
          const prepared = { ...question };
          if (question.type === "mcq" || question.type === "multi") {
            prepared.order = state.shuffleChoices
              ? shuffle(question.choices.map((_, index) => index))
              : question.choices.map((_, index) => index);
          }
          if (question.type === "tf") {
            prepared.options = state.shuffleChoices ? shuffle([true, false]) : [true, false];
          }
          if (question.type === "match") {
            prepared.rights = state.shuffleChoices
              ? shuffle(question.pairs.map((pair, index) => ({ index, text: pair.right })))
              : question.pairs.map((pair, index) => ({ index, text: pair.right }));
          }
          return prepared;
        });
      }

      function grade(question) {
        const answer = answerFor(question);
        if (isWriting(question)) return { answered: Boolean(String(answer || "").trim()), correct: null };
        if (answer === undefined || answer === null || (Array.isArray(answer) && answer.some((value) => value === ""))) {
          return { answered: false, correct: false };
        }
        if (question.type === "mcq" || question.type === "tf") return { answered: true, correct: answer === question.answer };
        if (question.type === "multi") return { answered: true, correct: sameSet(answer, Array.isArray(question.answer) ? question.answer : [question.answer]) };
        if (question.type === "match") return { answered: true, correct: question.pairs.every((_, index) => Number(answer[index]) === index) };
        return { answered: false, correct: false };
      }

      function choiceClass(question, originalIndex, result) {
        if (!isLocked(question)) return "choice";
        if (question.type === "multi") {
          const selected = new Set(answerFor(question) || []);
          const expected = new Set(Array.isArray(question.answer) ? question.answer : [question.answer]);
          if (expected.has(originalIndex)) return "choice correct";
          if (selected.has(originalIndex)) return "choice incorrect";
        }
        if (originalIndex === question.answer) return "choice correct";
        if ((answerFor(question) === originalIndex) && result && !result.correct) return "choice incorrect";
        return "choice";
      }

      function makeChoice(question, label, value, type, result) {
        const item = document.createElement("label");
        item.className = choiceClass(question, value, result);
        const input = document.createElement("input");
        input.type = type;
        input.name = "answer-" + question.id;
        input.value = String(value);
        const selected = answerFor(question) || [];
        input.checked = type === "checkbox" ? selected.includes(value) : answerFor(question) === value;
        input.disabled = isLocked(question);
        input.addEventListener("change", () => {
          if (type === "checkbox") {
            const next = [...(answerFor(question) || [])];
            const position = next.indexOf(value);
            if (input.checked && position === -1) next.push(value);
            if (!input.checked && position !== -1) next.splice(position, 1);
            state.answers.set(question.id, next);
          } else {
            state.answers.set(question.id, value);
          }
          render();
        });
        item.append(input, document.createTextNode(label));
        return item;
      }

      function renderQuestion(question, index) {
        const card = document.createElement("article");
        card.className = "question-card";
        card.id = "question-" + question.id;
        if (state.bookmarksOnly && !state.bookmarks.has(question.id)) card.classList.add("is-hidden");
        const top = document.createElement("div");
        top.className = "question-top";
        const number = document.createElement("p");
        number.className = "question-number";
        number.textContent = "Question " + (index + 1);
        const bookmark = document.createElement("button");
        bookmark.type = "button";
        bookmark.className = "bookmark";
        bookmark.textContent = state.bookmarks.has(question.id) ? "★ Bookmarked" : "☆ Bookmark";
        bookmark.addEventListener("click", () => {
          if (state.bookmarks.has(question.id)) state.bookmarks.delete(question.id);
          else state.bookmarks.add(question.id);
          render();
        });
        top.append(number, bookmark);
        card.append(top);
        const prompt = document.createElement("p");
        prompt.className = "prompt";
        prompt.textContent = question.prompt || "";
        card.append(prompt);
        const result = isLocked(question) ? grade(question) : null;

        if (question.type === "mcq" || question.type === "multi") {
          const choices = document.createElement("div");
          choices.className = "choices";
          question.order.forEach((originalIndex) => choices.append(makeChoice(question, question.choices[originalIndex], originalIndex, question.type === "multi" ? "checkbox" : "radio", result)));
          card.append(choices);
        } else if (question.type === "tf") {
          const choices = document.createElement("div");
          choices.className = "choices";
          question.options.forEach((value) => choices.append(makeChoice(question, value ? "True" : "False", value, "radio", result)));
          card.append(choices);
        } else if (question.type === "match") {
          const wrap = document.createElement("div");
          question.pairs.forEach((pair, pairIndex) => {
            const row = document.createElement("label");
            row.className = "match-row";
            const left = document.createElement("span");
            left.textContent = pair.left;
            const select = document.createElement("select");
            select.innerHTML = '<option value="">Select a match</option>';
            question.rights.forEach((right) => {
              const option = document.createElement("option");
              option.value = right.index;
              option.textContent = right.text;
              select.append(option);
            });
            const current = answerFor(question) || question.pairs.map(() => "");
            select.value = current[pairIndex] === undefined ? "" : String(current[pairIndex]);
            select.disabled = isLocked(question);
            select.addEventListener("change", () => {
              const next = [...(answerFor(question) || question.pairs.map(() => ""))];
              next[pairIndex] = select.value;
              state.answers.set(question.id, next);
              render();
            });
            row.append(left, select);
            wrap.append(row);
          });
          card.append(wrap);
        } else if (isWriting(question)) {
          const area = document.createElement("textarea");
          area.placeholder = "Write your answer here...";
          area.value = answerFor(question) || "";
          area.disabled = isLocked(question);
          area.addEventListener("input", () => state.answers.set(question.id, area.value));
          card.append(area);
        }

        if (isLocked(question)) {
          if (question.explanation) {
            const explanation = document.createElement("div");
            explanation.className = "explanation";
            const heading = document.createElement("strong");
            heading.textContent = "Explanation";
            explanation.append(heading, document.createTextNode(question.explanation));
            card.append(explanation);
          }
          if (isWriting(question) && question.modelAnswer) {
            const model = document.createElement("div");
            model.className = "model-answer";
            const heading = document.createElement("strong");
            heading.textContent = "Model answer";
            model.append(heading, document.createTextNode(question.modelAnswer));
            card.append(model);
          }
        }

        const actions = document.createElement("div");
        actions.className = "actions";
        if (state.mode === "practice" && !state.submitted) {
          const check = document.createElement("button");
          check.type = "button";
          check.className = "btn";
          check.textContent = "Check";
          check.addEventListener("click", () => {
            const current = grade(question);
            if (!current.answered && !isWriting(question)) {
              feedback.textContent = "Choose an answer first.";
              feedback.className = "feedback warn";
              return;
            }
            state.revealed.add(question.id);
            render();
          });
          actions.append(check);
        }
        const feedback = document.createElement("p");
        feedback.className = "feedback";
        if (isLocked(question)) {
          feedback.textContent = isWriting(question)
            ? (state.submitted ? "Not counted in the numeric score." : "Model answer shown — grade this one yourself.")
            : result.correct ? "Correct." : (state.submitted ? "Incorrect." : "Not quite — the correct answer is highlighted.");
          feedback.classList.add(isWriting(question) ? "warn" : result.correct ? "ok" : "err");
        }
        actions.append(feedback);
        card.append(actions);
        return card;
      }

      function render() {
        const answered = state.questions.filter((question) => grade(question).answered).length;
        $("#progress").textContent = state.questions.length + " questions · " + answered + " answered · " + state.bookmarks.size + " bookmarked";
        $("#submit").hidden = state.mode !== "test" || state.submitted;
        $("#score").hidden = !state.submitted;
        if (state.submitted) {
          $("#score").textContent =
            state.score.total === 0
              ? "Submitted — writing questions are self-graded against the model answers."
              : "Score: " + state.score.correct + " / " + state.score.total + " (writing items excluded)";
        }
        questionsHost.replaceChildren(...state.questions.map(renderQuestion));
        $("#empty").hidden = !(state.bookmarksOnly && state.questions.every((question) => !state.bookmarks.has(question.id)));
      }

      function restart() {
        state.questions = prepareQuestions();
        state.answers.clear();
        state.revealed.clear();
        state.submitted = false;
        state.score = null;
        render();
      }

      document.querySelectorAll('input[name="mode"]').forEach((input) => input.addEventListener("change", () => {
        state.mode = input.value;
        restart();
      }));
      $("#shuffle-questions").addEventListener("change", (event) => { state.shuffleQuestions = event.target.checked; restart(); });
      $("#shuffle-choices").addEventListener("change", (event) => { state.shuffleChoices = event.target.checked; restart(); });
      $("#bookmarks-only").addEventListener("change", (event) => { state.bookmarksOnly = event.target.checked; render(); });
      $("#submit").addEventListener("click", () => {
        state.submitted = true;
        const scored = state.questions.filter((question) => !isWriting(question));
        state.score = { correct: scored.filter((question) => grade(question).correct).length, total: scored.length };
        render();
      });
      state.questions = prepareQuestions();
      render();
    </script>
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
