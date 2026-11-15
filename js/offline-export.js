// ─── Serialization helpers ───────────────────────────────────────────────────

/**
 * Escapes a value for safe embedding in HTML attribute values and text nodes.
 * @param {*} value - The value to escape.
 * @returns {string} HTML-escaped string.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Serializes a question bank object to a JSON string safe for embedding in
 * an HTML `<script>` block (escapes characters that could break the context).
 * @param {object|null|undefined} bank - The question bank to serialize.
 * @returns {string} A JSON string safe for embedding in HTML.
 */
function serializeBank(bank) {
  return JSON.stringify(bank ?? { title: "Question Bank", questions: [] })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

/**
 * Returns the full `<style>…</style>` block used by the offline quiz page.
 * @returns {string} A `<style>` element string containing all quiz CSS.
 */
function buildOfflineCss() {
  return `<style>
      :root {
        --bg: #0e1117;
        --bg-elev: #161b24;
        --surface: #1c2330;
        --border: #2c3545;
        --text: #f2f5fa;
        --muted: #9aa6b8;
        --accent: #6ea8fe;
        --accent-strong: #4d8dff;
        --ok: #3dd68c;
        --ok-bg: rgba(61, 214, 140, 0.12);
        --err: #ff7b7b;
        --err-bg: rgba(255, 123, 123, 0.12);
        --warn: #f0c14a;
        --radius: 14px;
        --font: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
        --font-ar: "Noto Sans Arabic", "IBM Plex Sans", "Segoe UI", sans-serif;
        --shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
      }
      *, *::before, *::after { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: var(--font);
        font-size: 18px;
        line-height: 1.6;
        min-height: 100%;
        padding: 1.5rem 1.25rem 4rem;
        background-image:
          radial-gradient(1200px 500px at 10% -10%, rgba(77, 141, 255, 0.12), transparent 50%),
          radial-gradient(800px 400px at 100% 0%, rgba(61, 214, 140, 0.06), transparent 45%);
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .app { max-width: 800px; margin: 0 auto; }
      .topbar {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem 1rem;
        margin-bottom: 1.75rem;
      }
      .brand { display: flex; align-items: center; gap: 0.55rem; font-weight: 700; letter-spacing: 0.02em; }
      .brand-mark {
        width: 0.7rem;
        height: 0.7rem;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--accent), var(--ok));
        box-shadow: 0 0 16px rgba(110, 168, 254, 0.55);
      }
      .tagline, .progress, .score-banner { margin: 0; color: var(--muted); font-size: 0.92rem; }
      .quiz-header { margin-bottom: 1.15rem; }
      .quiz-header-row { display: flex; align-items: center; gap: 0.75rem; }
      .quiz-title { min-width: 0; margin: 0; font-size: 1.25rem; overflow-wrap: anywhere; }
      .meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; margin: 0.65rem 0 0.9rem; }
      .score-banner { color: var(--ok); font-weight: 600; }
      .controls { display: flex; flex-wrap: wrap; gap: 0.75rem 1.1rem; align-items: center; }
      .segmented {
        display: flex;
        gap: 0;
        margin: 0;
        padding: 0;
        border: 1px solid var(--border);
        border-radius: 999px;
        overflow: hidden;
        background: var(--bg-elev);
      }
      .segmented label { padding: 0.35rem 0.85rem; font-size: 0.92rem; cursor: pointer; }
      .segmented input { margin-inline-end: 0.35rem; }
      .toggle { display: flex; align-items: center; gap: 0.4rem; color: var(--muted); font-size: 0.92rem; cursor: pointer; }
      .question-list { display: grid; gap: 1.15rem; }
      .question-card { scroll-margin-top: 1.5rem; }
      .question-card.is-hidden { display: none; }
      .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1.2rem 1.25rem 1.3rem;
        box-shadow: var(--shadow);
      }
      .question-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.75rem; }
      .question-kicker {
        margin: 0;
        color: var(--muted);
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .bookmark-btn {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.7rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: transparent;
        color: var(--muted);
        font: inherit;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }
      .bookmark-btn[aria-pressed="true"] { border-color: var(--warn); color: var(--warn); background: rgba(240, 193, 74, 0.1); }
      .prompt { margin: 0 0 1rem; font-size: 1.15rem; font-weight: 600; white-space: pre-wrap; }
      .dir-rtl, .dir-rtl .prompt, .choice.dir-rtl, .model-answer.dir-rtl, .explanation.dir-rtl {
        font-family: var(--font-ar);
        direction: rtl;
        text-align: right;
      }
      .choices { display: grid; gap: 0.55rem; margin: 0; padding: 0; list-style: none; }
      .choice {
        display: flex;
        align-items: flex-start;
        gap: 0.65rem;
        padding: 0.7rem 0.8rem;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--bg-elev);
        cursor: pointer;
        white-space: pre-wrap;
      }
      .choice:hover, .choice:focus-within { border-color: #445068; }
      .choice.correct { border-color: var(--ok); background: var(--ok-bg); }
      .choice.incorrect { border-color: var(--err); background: var(--err-bg); }
      .choice input { margin-top: 0.35rem; flex-shrink: 0; }
      .choice span { flex: 1; }
      .question-images, .answer-images, .choice-images { display: flex; flex-wrap: wrap; gap: 0.65rem; margin: 0.7rem 0; }
      .question-images img, .answer-images img { display: block; max-width: 100%; max-height: 24rem; height: auto; border: 1px solid var(--border); border-radius: 10px; object-fit: contain; }
      .choice-images { align-items: center; display: inline-flex; margin: 0; vertical-align: middle; }
      .choice-images img { max-width: 12rem; max-height: 7rem; height: auto; border-radius: 6px; }
      .reading-text {
        margin: 0 0 1rem;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--bg-elev);
        white-space: pre-wrap;
      }
      .match-row { display: grid; grid-template-columns: 1fr minmax(10rem, 1.2fr); gap: 0.65rem; align-items: center; margin-bottom: 0.65rem; }
      .match-left { padding: 0.55rem 0.7rem; background: var(--bg-elev); border-radius: 10px; border: 1px solid var(--border); }
      select, textarea { width: 100%; font: inherit; color: var(--text); background: var(--bg-elev); border: 1px solid var(--border); border-radius: 10px; padding: 0.55rem 0.7rem; }
      textarea { min-height: 8rem; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 0.95rem; line-height: 1.5; tab-size: 4; }
      select:disabled, textarea:disabled, .choice input:disabled { opacity: 0.85; }
      .model-answer, .explanation { margin: 0.9rem 0 0; padding: 0.75rem 0.85rem; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-elev); white-space: pre-wrap; }
      .model-answer:not(.dir-rtl) { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 0.95rem; line-height: 1.5; }
      .model-answer strong, .explanation strong { display: block; margin-bottom: 0.3rem; color: var(--muted); font-family: var(--font); font-size: 0.85rem; letter-spacing: 0.04em; text-transform: uppercase; }
      .card-actions { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.95rem; }
      .feedback { margin: 0.9rem 0 0; font-weight: 600; }
      .feedback.ok { color: var(--ok); }
      .feedback.err { color: var(--err); }
      .feedback.warn { color: var(--warn); }
      .quiz-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.15rem; position: sticky; bottom: 0; padding: 0.75rem 0 0.2rem; background: linear-gradient(to top, var(--bg) 70%, transparent); }
      .empty-filter { color: var(--muted); margin: 0 0 1rem; }
      .load-error { color: var(--err); margin: 0; }
      .btn { font: inherit; font-weight: 600; border-radius: 999px; padding: 0.55rem 1.05rem; border: 1px solid transparent; cursor: pointer; }
      .btn-secondary { background: transparent; color: var(--text); border-color: var(--accent); }
      .btn-primary { background: var(--accent-strong); color: #081018; }
      .btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .btn:hover:not(:disabled), .btn:focus-visible, .bookmark-btn:focus-visible, .choice:has(input:focus-visible), select:focus-visible, textarea:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
      @media (max-width: 560px) {
        .quiz-header-row { align-items: flex-start; flex-direction: column; }
        .match-row { grid-template-columns: 1fr; }
        .quiz-actions { flex-wrap: wrap; }
      }
      @media (prefers-reduced-motion: reduce) {
        html { scroll-behavior: auto; }
      }
    </style>`;
}

// ─── Runtime script ──────────────────────────────────────────────────────────

/**
 * Returns the full `<script>…</script>` block containing the offline quiz
 * runtime logic, with the serialized bank data embedded.
 * @param {string} dataLiteral - JSON.stringify'd serialized bank string to
 *   embed as the argument to `parseQuestionData(…)`.
 * @returns {string} A `<script>` element string.
 */
function buildOfflineRuntimeScript(dataLiteral) {
  return `<script>
      const logPrefix = "[offline-quiz]";
      const logger = {
        info: (...args) => console.info(logPrefix, ...args),
        warn: (...args) => console.warn(logPrefix, ...args),
        error: (...args) => console.error(logPrefix, ...args),
      };
      const allowedTypes = new Set(["mcq", "multi", "tf", "match", "writing", "reading", "code", "code-writing"]);
      const questionHasContent = (question) => question.prompt !== undefined || question.text !== undefined;
      const cloneQuestion = (question) => ({
        ...question,
        choices: Array.isArray(question.choices) ? [...question.choices] : question.choices,
        pairs: Array.isArray(question.pairs) ? question.pairs.map((pair) => ({ ...pair })) : question.pairs,
      });
      function parseQuestionData(source) {
        logger.info("Loading question data.");
        try {
          const parsed = typeof source === "string" ? JSON.parse(source) : source;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("The question bank must be an object.");
          }
          if (!Array.isArray(parsed.questions)) {
            throw new Error("The question bank must contain a questions array.");
          }
          const questions = [];
          const seenIds = new Set();
          parsed.questions.forEach((question, index) => {
            if (!question || typeof question !== "object" || Array.isArray(question)) {
              logger.warn("Skipping invalid question at index", index);
              return;
            }
            if (typeof question.id !== "string" || !question.id.trim()) {
              logger.warn("Skipping question without a valid id at index", index);
              return;
            }
            if (seenIds.has(question.id)) {
              logger.warn("Skipping duplicate question id", question.id);
              return;
            }
            if (!allowedTypes.has(question.type)) {
              logger.warn("Skipping question with unsupported type", question.id, question.type);
              return;
            }
            if (!questionHasContent(question)) {
              logger.warn("Skipping question without prompt or text", question.id);
              return;
            }
            if ((question.type === "mcq" || question.type === "multi") && !Array.isArray(question.choices)) {
              logger.warn("Skipping choice question without choices", question.id);
              return;
            }
            if (question.type === "match" && !Array.isArray(question.pairs)) {
              logger.warn("Skipping match question without pairs", question.id);
              return;
            }
            seenIds.add(question.id);
            questions.push(cloneQuestion(question));
          });
          if (!questions.length) {
            throw new Error("The question bank contains no valid questions.");
          }
          const result = {
            id: typeof parsed.id === "string" ? parsed.id : "",
            title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Question Bank",
            questions,
          };
          logger.info("Loaded", questions.length, "valid questions.");
          return result;
        } catch (error) {
          logger.error("Question data loading failed.", error);
          const wrapped = new Error("Unable to load the question data.");
          wrapped.cause = error;
          throw wrapped;
        }
      }
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
      let bank;
      const imageSources = (value) => (Array.isArray(value) ? value : value ? [value] : [])
        .map((item) => typeof item === "string" ? { src: item, alt: "" } : item)
        .filter((item) => item && typeof item.src === "string" && /^(https?:\/\/|\/|\.\/|\.\.\/|data:image\/)/i.test(item.src));
      const appendImages = (host, value, className = "question-images") => {
        const images = imageSources(value);
        if (!images.length) return;
        const wrap = document.createElement("div");
        wrap.className = className;
        images.forEach((image) => {
          const element = document.createElement("img");
          element.src = image.src;
          element.alt = image.alt || "";
          element.loading = "lazy";
          wrap.append(element);
        });
        host.append(wrap);
      };
      const appendContent = (host, value, imageClass = "question-images") => {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          if (value.text) host.append(document.createTextNode(String(value.text)));
          appendImages(host, value.image ?? value.images, imageClass);
          return;
        }
        host.append(document.createTextNode(String(value ?? "")));
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
      const isReading = (question) => question.type === "reading";
      const isCode = (question) => question.type === "code" || question.type === "code-writing";
      const hasArabic = (value) => /[\u0600-\u06FF]/.test(String(value ?? ""));
      const setDirection = (element, value) => {
        if (hasArabic(value)) {
          element.dir = "rtl";
          element.classList.add("dir-rtl");
        }
      };
      const expectedCode = (question) => {
        const answers = question.acceptedAnswers ?? question.answer ?? question.modelAnswer ?? "";
        return Array.isArray(answers) ? answers[0] ?? "" : answers;
      };
      const acceptedCodeAnswers = (question) => {
        const answers = question.acceptedAnswers ?? question.answer ?? question.modelAnswer ?? "";
        return Array.isArray(answers) ? answers : [answers];
      };
      const normalizeCode = (value) => String(value ?? "").replace(/\s+/g, "");
      const matchValue = (value) => typeof value === "object" && value !== null ? value.text ?? "" : value;
      const isLocked = (question) => state.submitted || state.revealed.has(question.id);
      const answerFor = (question) => state.answers.get(question.id);
      const sameSet = (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).every((value, i) => value === [...b].sort((x, y) => x - y)[i]);

      function prepareQuestions() {
        let questions = (bank.questions || []).map((question) => ({ ...question }));
        if (state.shuffleQuestions) {
          const groups = new Map();
          questions.forEach((question) => {
            const group = question.group ?? question.section;
            const key = group ? "group:" + group : "question:" + question.id;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(question);
          });
          questions = shuffle([...groups.values()]).flat();
        }
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
        if (isReading(question)) return { answered: false, correct: null };
        if (isWriting(question)) return { answered: Boolean(String(answer || "").trim()), correct: null };
        if (isCode(question)) return {
          answered: typeof answer === "string" && answer.length > 0,
          correct: typeof answer === "string"
            && acceptedCodeAnswers(question).some((expected) => normalizeCode(answer) === normalizeCode(expected))
        };
        if (answer === undefined || answer === null || (Array.isArray(answer) && answer.some((value) => value === ""))) {
          return { answered: false, correct: false };
        }
        if (question.type === "mcq" || question.type === "tf") return { answered: true, correct: answer === question.answer };
        if (question.type === "multi") return { answered: true, correct: sameSet(answer, Array.isArray(question.answer) ? question.answer : [question.answer]) };
        if (question.type === "match") {
          return {
            answered: true,
            correct: question.pairs.every((pair, index) => {
              const selectedIndex = Number(answer[index]);
              return Number.isInteger(selectedIndex)
                && selectedIndex >= 0
                && selectedIndex < question.pairs.length
                && matchValue(question.pairs[selectedIndex].right) === matchValue(pair.right);
            }),
          };
        }
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
        const item = document.createElement("li");
        const choice = document.createElement("label");
        choice.className = choiceClass(question, value, result);
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
        const content = document.createElement("span");
        appendContent(content, label, "choice-images");
        setDirection(choice, label);
        choice.append(input, content);
        item.append(choice);
        return item;
      }

      function renderQuestion(question, index) {
        const card = document.createElement("article");
        card.className = "card question-card";
        card.id = "question-" + question.id;
        card.dataset.id = question.id;
        if (state.bookmarksOnly && !state.bookmarks.has(question.id)) card.classList.add("is-hidden");
        const top = document.createElement("header");
        top.className = "question-top";
        const number = document.createElement("p");
        number.className = "question-kicker";
        number.textContent = "Question " + (index + 1);
        const bookmark = document.createElement("button");
        bookmark.type = "button";
        bookmark.className = "bookmark-btn";
        bookmark.setAttribute("aria-pressed", state.bookmarks.has(question.id) ? "true" : "false");
        bookmark.textContent = state.bookmarks.has(question.id) ? "★ Bookmarked" : "☆ Bookmark";
        bookmark.addEventListener("click", () => {
          if (state.bookmarks.has(question.id)) state.bookmarks.delete(question.id);
          else state.bookmarks.add(question.id);
          render();
        });
        top.append(number, bookmark);
        card.append(top);
        if (!isReading(question)) {
          const prompt = document.createElement("p");
          prompt.className = "prompt";
          appendContent(prompt, question.prompt || "");
          setDirection(prompt, question.prompt);
          card.append(prompt);
        }
        appendImages(card, question.image ?? question.images);
        const result = isLocked(question) ? grade(question) : null;

        if (question.type === "mcq" || question.type === "multi") {
          const choices = document.createElement("ul");
          choices.className = "choices";
          question.order.forEach((originalIndex) => choices.append(makeChoice(question, question.choices[originalIndex], originalIndex, question.type === "multi" ? "checkbox" : "radio", result)));
          card.append(choices);
        } else if (question.type === "tf") {
          const choices = document.createElement("ul");
          choices.className = "choices";
          question.options.forEach((value) => choices.append(makeChoice(question, value ? "True" : "False", value, "radio", result)));
          card.append(choices);
        } else if (question.type === "match") {
          const wrap = document.createElement("div");
          question.pairs.forEach((pair, pairIndex) => {
            const row = document.createElement("div");
            row.className = "match-row";
            const left = document.createElement("span");
            left.className = "match-left";
            appendContent(left, pair.left, "choice-images");
            const select = document.createElement("select");
            select.setAttribute("aria-label", "Match for item " + (pairIndex + 1));
            select.innerHTML = '<option value="">Select a match</option>';
            question.rights.forEach((right) => {
              const option = document.createElement("option");
              option.value = right.index;
              option.textContent = typeof right.text === "object" ? right.text.text || "" : right.text;
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
        } else if (isWriting(question) || isCode(question)) {
          const area = document.createElement("textarea");
          area.placeholder = isCode(question) ? "Write your code here..." : "Write your answer here...";
          area.value = answerFor(question) || "";
          if (isCode(question)) {
            area.setAttribute("autocapitalize", "off");
            area.setAttribute("autocorrect", "off");
            area.spellcheck = false;
          }
          area.disabled = isLocked(question);
          area.addEventListener("input", () => state.answers.set(question.id, area.value));
          card.append(area);
        } else if (isReading(question)) {
          const reading = document.createElement("section");
          reading.className = "reading-text";
          reading.dir = "rtl";
          reading.textContent = question.text || question.prompt || "";
          reading.setAttribute("aria-label", "Reading passage");
          setDirection(reading, reading.textContent);
          card.append(reading);
        }

        if (isLocked(question)) {
          if (question.explanation) {
            const explanation = document.createElement("aside");
            explanation.className = "explanation";
            explanation.setAttribute("aria-label", "Explanation");
            const heading = document.createElement("strong");
            heading.textContent = "Explanation";
            explanation.append(heading);
            appendContent(explanation, question.explanation);
            appendImages(explanation, question.explanationImages, "answer-images");
            setDirection(explanation, question.explanation);
            card.append(explanation);
          }
          if (isWriting(question) && question.modelAnswer) {
            const model = document.createElement("aside");
            model.className = "model-answer";
            model.setAttribute("aria-label", "Model answer");
            const heading = document.createElement("strong");
            heading.textContent = "Model answer";
            model.append(heading);
            appendContent(model, question.modelAnswer);
            appendImages(model, question.modelAnswerImages ?? question.answerImages, "answer-images");
            setDirection(model, question.modelAnswer);
            card.append(model);
          }
          if (isCode(question)) {
            const model = document.createElement("aside");
            model.className = "model-answer";
            model.setAttribute("aria-label", "Correct code");
            const heading = document.createElement("strong");
            heading.textContent = "Correct code";
            model.append(heading, document.createTextNode(expectedCode(question)));
            card.append(model);
          }
        }

        const actions = document.createElement("footer");
        actions.className = "card-actions";
        if (state.mode === "practice" && !state.submitted && !isReading(question)) {
          const check = document.createElement("button");
          check.type = "button";
          check.className = "btn btn-secondary";
          check.textContent = "Check";
          check.disabled = isLocked(question);
          check.addEventListener("click", () => {
            const current = grade(question);
            if (!current.answered && !isWriting(question) && !isReading(question)) {
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
        feedback.setAttribute("aria-live", "polite");
        if (isLocked(question)) {
          feedback.textContent = isWriting(question)
            ? (state.submitted ? "Not counted in the numeric score." : "Model answer shown — grade this one yourself.")
            : result.correct ? "Correct." : (state.submitted ? "Incorrect." : "Not quite — the correct answer is highlighted.");
          feedback.classList.add(isWriting(question) ? "warn" : result.correct ? "ok" : "err");
        } else {
          feedback.hidden = true;
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
              ? "Submitted — no automatically scored questions."
              : "Score: " + state.score.correct + " / " + state.score.total + " (writing items excluded)";
        }
        const fragment = document.createDocumentFragment();
        state.questions.forEach((question, index) => fragment.append(renderQuestion(question, index)));
        questionsHost.replaceChildren(fragment);
        $("#empty").hidden = !(state.bookmarksOnly && state.questions.every((question) => !state.bookmarks.has(question.id)));
      }

      function getProcessedQuestionData() {
        return state.questions.map((question, index) => ({
          number: index + 1,
          id: question.id,
          type: question.type,
          prompt: typeof question.prompt === "object"
            ? String(question.prompt?.text ?? "")
            : String(question.prompt ?? question.text ?? ""),
          question,
        }));
      }

      function showLoadError(error) {
        logger.error("Rendering question data failed.", error);
        $("#progress").textContent = "Question data could not be loaded.";
        $("#progress").className = "progress load-error";
        $("#empty").hidden = true;
        const message = document.createElement("p");
        message.className = "load-error";
        message.setAttribute("role", "alert");
        message.textContent = "This quiz could not be loaded. Please download it again.";
        questionsHost.replaceChildren(message);
      }

      function restart() {
        if (!bank) {
          logger.warn("Ignoring quiz restart because question data is unavailable.");
          return;
        }
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
      $("#quiz-controls").addEventListener("submit", (event) => event.preventDefault());
      $("#shuffle-questions").addEventListener("change", (event) => { state.shuffleQuestions = event.target.checked; restart(); });
      $("#shuffle-choices").addEventListener("change", (event) => { state.shuffleChoices = event.target.checked; restart(); });
      $("#bookmarks-only").addEventListener("change", (event) => { state.bookmarksOnly = event.target.checked; render(); });
      $("#submit").addEventListener("click", () => {
        state.submitted = true;
        const scored = state.questions.filter((question) => !isWriting(question) && !isReading(question));
        state.score = { correct: scored.filter((question) => grade(question).correct).length, total: scored.length };
        render();
      });
      try {
        bank = parseQuestionData(${dataLiteral});
        state.questions = prepareQuestions();
        if (!state.questions.length) throw new Error("No questions are available after processing.");
        window.getProcessedQuestionData = getProcessedQuestionData;
        render();
      } catch (error) {
        showLoadError(error);
      }
    <\/script>`;
}

// ─── HTML shell ──────────────────────────────────────────────────────────────

/**
 * Returns the full HTML document string for the offline quiz page.
 * @param {string} title - The HTML-escaped quiz title for `<title>` and `<h1>`.
 * @param {string} cssContent - The pre-built `<style>…</style>` block.
 * @param {string} scriptContent - The pre-built `<script>…</script>` block.
 * @returns {string} A complete `<!DOCTYPE html>` document string.
 */
function buildOfflineHtmlShell(title, cssContent, scriptContent) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    ${cssContent}
  </head>
  <body>
    <div class="app">
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>Question Bank</span>
        </div>
        <p class="tagline">Practice or test — standalone interactive quiz</p>
      </header>

      <main class="view" aria-labelledby="quiz-title">
        <header class="quiz-header">
          <div class="quiz-header-row">
            <h1 id="quiz-title" class="quiz-title">${title}</h1>
          </div>
          <div class="meta-row">
            <p id="progress" class="progress" role="status" aria-live="polite"></p>
            <p id="score" class="score-banner" role="status" aria-live="polite" hidden></p>
          </div>
          <form class="controls" id="quiz-controls">
            <fieldset class="segmented">
              <legend class="sr-only">Quiz mode</legend>
              <label>
                <input type="radio" name="mode" value="practice" checked />
                Practice
              </label>
              <label>
                <input type="radio" name="mode" value="test" />
                Test
              </label>
            </fieldset>
            <label class="toggle">
              <input type="checkbox" id="shuffle-questions" />
              Shuffle questions
            </label>
            <label class="toggle">
              <input type="checkbox" id="shuffle-choices" />
              Shuffle choices
            </label>
            <label class="toggle">
              <input type="checkbox" id="bookmarks-only" />
              Bookmarks only
            </label>
          </form>
        </header>

        <section class="quiz-content" aria-labelledby="questions-heading">
          <h2 id="questions-heading" class="sr-only">Questions</h2>
          <div id="questions" class="question-list"></div>
          <p id="empty" class="empty-filter" role="status" hidden>No bookmarked questions yet.</p>
          <div class="quiz-actions">
            <button type="button" id="submit" class="btn btn-primary" hidden>Submit test</button>
          </div>
        </section>
      </main>
    </div>
    ${scriptContent}
  </body>
</html>`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Builds a fully self-contained offline quiz HTML document string from a
 * question bank object.
 * @param {object} bank - The question bank (must have `title` and `questions`).
 * @returns {string} A complete HTML document string ready to be saved as a
 *   `.html` file.
 */
export function buildOfflineQuizHtml(bank) {
  const title = escapeHtml(bank?.title || "Question Bank");
  const data = serializeBank(bank);
  const dataLiteral = JSON.stringify(data);

  const cssContent = buildOfflineCss();
  const scriptContent = buildOfflineRuntimeScript(dataLiteral);
  return buildOfflineHtmlShell(title, cssContent, scriptContent);
}

/**
 * Generates the offline quiz HTML for a question bank and immediately triggers
 * a browser download of the resulting `.html` file.
 * @param {object} bank - The question bank (must have `title` and `questions`).
 */
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
