/**
 * offline-export.js
 * Generates and downloads a self-contained, standalone offline HTML quiz.
 * Completely standalone: zero server, zero build step, zero external dependencies required.
 */

// ─── Serialization & Escaping Helpers ────────────────────────────────────────

/**
 * Escapes characters for safe embedding in HTML text and attributes.
 * @param {*} value
 * @returns {string}
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
 * Safely serializes data for embedding inside a <script type="application/json"> tag.
 * Replaces closing script tags and Unicode line terminators to prevent XSS / syntax breaks.
 * @param {*} data
 * @returns {string}
 */
function serializeJsonForScript(data) {
  return JSON.stringify(data ?? { title: "Question Bank", questions: [] })
    .replace(/<\/script/gi, "<\\/script")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// ─── Offline CSS Styles ──────────────────────────────────────────────────────

/**
 * Generates the full CSS stylesheet for the offline quiz.
 * Features dark mode, responsive layout with jump navigation sidebar,
 * smooth animations, accessibility outlines, and Arabic / RTL support.
 * @returns {string}
 */
function getOfflineStyles() {
  return `
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
      --warn-bg: rgba(240, 193, 74, 0.12);
      --radius: 14px;
      --font: "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
      --font-ar: "Noto Sans Arabic", "IBM Plex Sans", "Segoe UI", sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      --shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 17px;
      line-height: 1.6;
      min-height: 100vh;
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

    .app {
      max-width: 1020px;
      margin: 0 auto;
      padding: 1.5rem 1.25rem 4rem;
    }

    /* Top bar */
    .topbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .brand-mark {
      width: 0.8rem;
      height: 0.8rem;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--ok));
      box-shadow: 0 0 16px rgba(110, 168, 254, 0.55);
    }

    .tagline {
      margin: 0;
      color: var(--muted);
      font-size: 0.88rem;
    }

    /* Quiz Header */
    .quiz-header {
      margin-bottom: 1.5rem;
    }

    .quiz-title {
      font-size: 1.45rem;
      margin: 0 0 0.5rem;
      font-weight: 700;
      word-break: break-word;
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem 1.2rem;
      margin-bottom: 1rem;
    }

    .progress, .score-banner {
      margin: 0;
      font-size: 0.94rem;
    }

    .progress {
      color: var(--muted);
    }

    .score-banner {
      color: var(--ok);
      font-weight: 700;
      background: var(--ok-bg);
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      border: 1px solid var(--ok);
    }

    /* Controls Bar */
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1rem;
      align-items: center;
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 0.75rem 1rem;
      border-radius: var(--radius);
    }

    .segmented {
      display: flex;
      margin: 0;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: 999px;
      overflow: hidden;
      background: var(--bg-elev);
    }

    .segmented label {
      padding: 0.35rem 0.85rem;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      user-select: none;
    }

    .segmented label:has(input:checked) {
      background: var(--accent-strong);
      color: #081018;
    }

    .segmented input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .toggle {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      color: var(--muted);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
    }

    .toggle input {
      accent-color: var(--accent);
      width: 1rem;
      height: 1rem;
    }

    .controls-actions {
      margin-inline-start: auto;
    }

    /* Two-column layout with sidebar */
    .quiz-layout {
      display: grid;
      grid-template-columns: 140px minmax(0, 1fr);
      gap: 1.25rem;
      align-items: start;
    }

    @media (max-width: 768px) {
      .quiz-layout {
        grid-template-columns: 1fr;
      }
      .jump-nav {
        max-height: 220px;
      }
    }

    /* Jump navigation */
    .jump-nav {
      position: sticky;
      top: 1rem;
      z-index: 10;
      margin: 0;
      padding: 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-elev);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-height: calc(100vh - 2rem);
    }

    .jump-toolbar {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .jump-label {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .jump-stepper {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem;
    }

    .jump-step-btn {
      height: 1.9rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font: inherit;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.15s, background 0.15s;
    }

    .jump-step-btn:hover:not(:disabled) {
      border-color: var(--accent);
      background: var(--border);
    }

    .jump-step-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .jump-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.35rem;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-right: 0.2rem;
    }

    .jump-btn {
      position: relative;
      height: 2.2rem;
      min-width: 2rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font: inherit;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.15s, background 0.15s, transform 0.1s;
    }

    .jump-btn:hover, .jump-btn:focus-visible {
      border-color: var(--accent);
      outline: none;
    }

    .jump-btn.is-active {
      border-color: var(--accent-strong);
      box-shadow: 0 0 0 2px rgba(77, 141, 255, 0.4);
    }

    .jump-btn.is-answered {
      background: #243044;
      border-color: #3d4a60;
    }

    .jump-btn.is-bookmarked::after {
      content: "";
      position: absolute;
      top: 0.2rem;
      right: 0.2rem;
      width: 0.38rem;
      height: 0.38rem;
      border-radius: 50%;
      background: var(--warn);
    }

    .jump-btn.is-correct {
      border-color: var(--ok);
      background: var(--ok-bg);
      color: var(--ok);
    }

    .jump-btn.is-incorrect {
      border-color: var(--err);
      background: var(--err-bg);
      color: var(--err);
    }

    /* Question list */
    .quiz-content {
      min-width: 0;
    }

    .question-list {
      display: grid;
      gap: 1.25rem;
    }

    .question-section {
      margin: 1rem 0 0.25rem;
      color: var(--accent);
      font-size: 1.25rem;
      font-weight: 700;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.4rem;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.35rem;
      box-shadow: var(--shadow);
      scroll-margin-top: 1.5rem;
      transition: border-color 0.2s;
    }

    .question-card.is-hidden {
      display: none !important;
    }

    .question-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.85rem;
    }

    .question-kicker {
      margin: 0;
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .bookmark-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.65rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .bookmark-btn:hover {
      border-color: var(--warn);
      color: var(--warn);
    }

    .bookmark-btn[aria-pressed="true"] {
      border-color: var(--warn);
      color: var(--warn);
      background: var(--warn-bg);
    }

    .prompt {
      margin: 0 0 1rem;
      font-size: 1.15rem;
      font-weight: 600;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    /* Arabic / RTL Support */
    .dir-rtl, [dir="rtl"] {
      font-family: var(--font-ar);
      direction: rtl;
      text-align: right;
    }

    /* Images */
    .question-images, .answer-images, .choice-images {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin: 0.75rem 0;
    }

    .question-images img, .answer-images img {
      display: block;
      max-width: 100%;
      max-height: 22rem;
      height: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
      object-fit: contain;
    }

    .choice-images {
      display: inline-flex;
      margin: 0;
      vertical-align: middle;
    }

    .choice-images img {
      max-width: 10rem;
      max-height: 6rem;
      height: auto;
      border-radius: 6px;
    }

    /* Choices List */
    .choices {
      display: grid;
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .choice {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 0.9rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--bg-elev);
      cursor: pointer;
      user-select: none;
      transition: border-color 0.15s, background 0.15s;
    }

    .choice:hover {
      border-color: #445068;
    }

    .choice input {
      margin-top: 0.25rem;
      flex-shrink: 0;
      accent-color: var(--accent);
      width: 1.05rem;
      height: 1.05rem;
    }

    .choice span {
      flex: 1;
      line-height: 1.5;
    }

    .choice.correct {
      border-color: var(--ok);
      background: var(--ok-bg);
    }

    .choice.incorrect {
      border-color: var(--err);
      background: var(--err-bg);
    }

    /* Reading passage */
    .reading-text {
      margin: 0 0 1rem;
      padding: 1.1rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--bg-elev);
      white-space: pre-wrap;
      line-height: 1.7;
    }

    /* Matching pairs */
    .match-row {
      display: grid;
      grid-template-columns: 1fr minmax(10rem, 1.3fr);
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 0.65rem;
    }

    @media (max-width: 540px) {
      .match-row {
        grid-template-columns: 1fr;
      }
    }

    .match-left {
      padding: 0.6rem 0.8rem;
      background: var(--bg-elev);
      border-radius: 10px;
      border: 1px solid var(--border);
    }

    select, textarea {
      width: 100%;
      font: inherit;
      color: var(--text);
      background: var(--bg-elev);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.6rem 0.8rem;
    }

    textarea {
      min-height: 7rem;
      resize: vertical;
      font-family: var(--font-mono);
      font-size: 0.92rem;
      line-height: 1.5;
      tab-size: 4;
    }

    select:disabled, textarea:disabled, .choice input:disabled {
      opacity: 0.85;
      cursor: not-allowed;
    }

    /* Explanations & Model answers */
    .model-answer, .explanation {
      margin: 1rem 0 0;
      padding: 0.85rem 1rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--bg-elev);
      white-space: pre-wrap;
      font-size: 0.95rem;
    }

    .model-answer {
      font-family: var(--font-mono);
      font-size: 0.92rem;
    }

    .model-answer strong, .explanation strong {
      display: block;
      margin-bottom: 0.4rem;
      color: var(--muted);
      font-family: var(--font);
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* Feedback & Actions */
    .card-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .feedback {
      margin: 0;
      font-weight: 600;
      font-size: 0.92rem;
    }

    .feedback.ok { color: var(--ok); }
    .feedback.err { color: var(--err); }
    .feedback.warn { color: var(--warn); }

    .quiz-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1.5rem;
      position: sticky;
      bottom: 0;
      padding: 1rem 0 0.5rem;
      background: linear-gradient(to top, var(--bg) 80%, transparent);
      z-index: 5;
    }

    .empty-filter {
      color: var(--muted);
      text-align: center;
      padding: 2.5rem 1rem;
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      margin: 1rem 0;
    }

    /* Buttons */
    .btn {
      font: inherit;
      font-weight: 600;
      font-size: 0.92rem;
      border-radius: 999px;
      padding: 0.5rem 1.15rem;
      border: 1px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    }

    .btn-primary {
      background: var(--accent-strong);
      color: #081018;
    }

    .btn-primary:hover:not(:disabled) {
      background: #397def;
    }

    .btn-secondary {
      background: transparent;
      color: var(--text);
      border-color: var(--border);
    }

    .btn-secondary:hover:not(:disabled) {
      border-color: var(--accent);
      color: var(--accent);
    }

    .btn-ghost {
      background: transparent;
      color: var(--muted);
      padding: 0.4rem 0.8rem;
    }

    .btn-ghost:hover:not(:disabled) {
      color: var(--text);
    }

    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn:focus-visible, .bookmark-btn:focus-visible, select:focus-visible, textarea:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      html {
        scroll-behavior: auto;
      }
    }
  `;
}

// ─── Offline Client Runtime Script ───────────────────────────────────────────

/**
 * Returns the JavaScript client application embedded directly inside the offline HTML.
 * The script reads the parsed question bank from the `#quiz-data` element,
 * handles Practice and Test modes, grading, shuffling, bookmarks, jump nav, and reactive UI updates.
 * @returns {string}
 */
function getOfflineClientScript() {
  return `(function() {
  "use strict";

  const ARABIC_RE = /[\\u0600-\\u06FF]/;
  const ALLOWED_TYPES = new Set(["mcq", "multi", "tf", "match", "writing", "reading", "code", "code-writing", "numeric"]);

  const hasArabic = (text) => ARABIC_RE.test(String(text ?? ""));

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function sameSet(a, b) {
    const arrA = Array.isArray(a) ? a : [a];
    const arrB = Array.isArray(b) ? b : [b];
    if (arrA.length !== arrB.length) return false;
    const sortedA = [...arrA].sort((x, y) => x - y);
    const sortedB = [...arrB].sort((x, y) => x - y);
    return sortedA.every((val, i) => val === sortedB[i]);
  }

  function normalizeCode(val) {
    return String(val ?? "").replace(/\\s+/g, "");
  }

  function acceptedCodeAnswers(question) {
    const answers = question.acceptedAnswers ?? question.answer ?? question.modelAnswer ?? "";
    return Array.isArray(answers) ? answers : [answers];
  }

  function expectedCode(question) {
    const answers = question.acceptedAnswers ?? question.answer ?? question.modelAnswer ?? "";
    return Array.isArray(answers) ? (answers[0] ?? "") : answers;
  }

  function isScoredQuestion(question) {
    return question.type !== "writing" && question.type !== "reading";
  }

  function safeImages(val) {
    const list = Array.isArray(val) ? val : val ? [val] : [];
    return list
      .map((item) => (typeof item === "string" ? { src: item, alt: "" } : item))
      .filter((item) => item && typeof item.src === "string" && /^(https?:\\/\\/|\\/|\\.\\/|\\.\\.\\/|data:image\\/)/i.test(item.src));
  }

  function appendContent(target, value, imageClass) {
    if (!value && value !== 0) return;
    if (typeof value === "object" && !Array.isArray(value)) {
      if (value.text) target.append(document.createTextNode(String(value.text)));
      appendImages(target, value.image ?? value.images, imageClass);
      return;
    }
    target.append(document.createTextNode(String(value)));
  }

  function appendImages(target, value, className) {
    const images = safeImages(value);
    if (!images.length) return;
    const wrap = document.createElement("div");
    wrap.className = className || "question-images";
    images.forEach((img) => {
      const el = document.createElement("img");
      el.src = img.src;
      el.alt = img.alt || "";
      el.loading = "lazy";
      wrap.append(el);
    });
    target.append(wrap);
  }

  function parseBankData() {
    const dataEl = document.getElementById("quiz-data");
    if (!dataEl) throw new Error("Missing #quiz-data element.");
    const parsed = JSON.parse(dataEl.textContent);
    if (!parsed || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid question bank payload.");
    }

    const seenIds = new Set();
    const validQuestions = [];

    parsed.questions.forEach((q, index) => {
      if (!q || typeof q !== "object" || !q.id || seenIds.has(q.id)) return;
      if (!ALLOWED_TYPES.has(q.type)) return;
      if (q.prompt === undefined && q.text === undefined) return;
      seenIds.add(q.id);
      validQuestions.push({ ...q });
    });

    if (!validQuestions.length) throw new Error("The bank has no valid questions.");
    return {
      id: parsed.id || "quiz",
      title: parsed.title || "Question Bank",
      questions: validQuestions,
    };
  }

  // State Management
  const state = {
    bank: null,
    questions: [],
    mode: "practice",
    shuffleQuestions: false,
    shuffleChoices: false,
    bookmarksOnly: false,
    bookmarks: new Set(),
    answers: new Map(),
    revealed: new Set(),
    submitted: false,
    score: null,
    activeId: null,
  };

  const els = {};
  let observer = null;

  function prepareQuestions() {
    let list = state.bank.questions.map((q) => ({ ...q }));

    if (state.shuffleQuestions) {
      const groups = new Map();
      list.forEach((q) => {
        const key = q.group ?? q.section ?? ("item:" + q.id);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(q);
      });
      list = shuffle([...groups.values()]).flat();
    }

    return list.map((q) => {
      const item = { ...q };
      if (item.type === "mcq" || item.type === "multi") {
        const indices = (item.choices || []).map((_, i) => i);
        item.choiceOrder = state.shuffleChoices ? shuffle(indices) : indices;
      } else if (item.type === "tf") {
        item.tfOptions = state.shuffleChoices ? shuffle([true, false]) : [true, false];
      } else if (item.type === "match") {
        let rights;
        if (Array.isArray(item.options)) {
          rights = item.options.map((opt, i) => ({ index: i, text: opt }));
        } else {
          rights = (item.pairs || []).map((p, idx) => ({ index: idx, text: p.right }));
          if (Array.isArray(item.distractors)) {
            item.distractors.forEach((d, di) => {
              rights.push({ index: (item.pairs || []).length + di, text: d });
            });
          }
        }
        item.shuffledRights = state.shuffleChoices ? shuffle(rights) : rights;
      }
      return item;
    });
  }

  function gradeQuestion(q) {
    const ans = state.answers.get(q.id);
    if (q.type === "reading") return { answered: false, correct: null };
    if (q.type === "writing") return { answered: Boolean(ans && String(ans).trim()), correct: null };
    if (q.type === "numeric") {
      const raw = typeof ans === "string" ? ans.trim() : (ans !== undefined && ans !== null ? String(ans).trim() : "");
      const answered = raw.length > 0;
      if (!answered) return { answered: false, correct: false };
      const accepted = (q.acceptedAnswers ?? [q.answer]).map(String);
      const textMatch = accepted.some((a) => a.trim().toLowerCase() === raw.toLowerCase());
      if (textMatch) return { answered: true, correct: true };
      const num = parseFloat(raw);
      const numMatch = !isNaN(num) && accepted.some((a) => {
        const target = parseFloat(a);
        return !isNaN(target) && Math.abs(num - target) < 1e-3;
      });
      return { answered: true, correct: numMatch };
    }
    if (q.type === "code" || q.type === "code-writing") {
      const answered = typeof ans === "string" && ans.trim().length > 0;
      const correct = answered && acceptedCodeAnswers(q).some((exp) => normalizeCode(ans) === normalizeCode(exp));
      return { answered, correct };
    }
    if (ans === undefined || ans === null || (Array.isArray(ans) && ans.some((v) => v === "" || v === undefined))) {
      return { answered: false, correct: false };
    }
    if (q.type === "mcq") {
      const isCorrect = Array.isArray(q.answer)
        ? q.answer.includes(ans)
        : (q.acceptedAnswers ? q.acceptedAnswers.includes(ans) : ans === q.answer);
      return { answered: true, correct: isCorrect };
    }
    if (q.type === "tf") {
      return { answered: true, correct: ans === q.answer };
    }
    if (q.type === "multi") {
      const expected = Array.isArray(q.answer) ? q.answer : [q.answer];
      return { answered: true, correct: sameSet(ans, expected) };
    }
    if (q.type === "match") {
      const pairs = q.pairs || [];
      const ok = pairs.every((p, idx) => {
        const selectedIdx = Number(ans[idx]);
        if (!Number.isInteger(selectedIdx) || selectedIdx < 0) return false;
        const opt = (q.shuffledRights || []).find((o) => o.index === selectedIdx);
        const selRight = opt ? opt.text : (pairs[selectedIdx] ? pairs[selectedIdx].right : undefined);
        const expectedRight = p.right;
        const valA = typeof selRight === "object" ? selRight.text : selRight;
        const valB = typeof expectedRight === "object" ? expectedRight.text : expectedRight;
        if (valA !== undefined && valA === valB) return true;
        if (Array.isArray(p.acceptedMatches) && p.acceptedMatches.includes(valA)) return true;
        return false;
      });
      return { answered: true, correct: ok };
    }
    return { answered: false, correct: false };
  }

  function isQuestionLocked(q) {
    return state.submitted || (state.mode === "practice" && state.revealed.has(q.id));
  }

  function renderJumpNav() {
    els.jumpGrid.innerHTML = "";
    const visibleQuestions = state.questions.filter((q) => !state.bookmarksOnly || state.bookmarks.has(q.id));

    visibleQuestions.forEach((q, visibleIdx) => {
      const originalIdx = state.questions.findIndex((item) => item.id === q.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jump-btn";
      btn.textContent = String(originalIdx + 1);
      btn.title = "Question " + (originalIdx + 1);

      if (state.activeId === q.id) btn.classList.add("is-active");
      if (gradeQuestion(q).answered) btn.classList.add("is-answered");
      if (state.bookmarks.has(q.id)) btn.classList.add("is-bookmarked");

      if (isQuestionLocked(q) || state.submitted) {
        const result = gradeQuestion(q);
        if (isScoredQuestion(q)) {
          if (result.correct) btn.classList.add("is-correct");
          else if (result.answered || state.submitted) btn.classList.add("is-incorrect");
        }
      }

      btn.addEventListener("click", () => jumpToQuestion(q.id));
      els.jumpGrid.append(btn);
    });

    const activeVisibleIdx = visibleQuestions.findIndex((q) => q.id === state.activeId);
    if (els.jumpPrev) els.jumpPrev.disabled = activeVisibleIdx <= 0;
    if (els.jumpNext) els.jumpNext.disabled = activeVisibleIdx === -1 || activeVisibleIdx >= visibleQuestions.length - 1;
  }

  function jumpToQuestion(id) {
    const card = document.getElementById("question-" + id);
    if (!card) return;
    state.activeId = id;
    renderJumpNav();
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function moveStepper(delta) {
    const visible = state.questions.filter((q) => !state.bookmarksOnly || state.bookmarks.has(q.id));
    if (!visible.length) return;
    const curIdx = visible.findIndex((q) => q.id === state.activeId);
    const nextIdx = Math.max(0, Math.min(visible.length - 1, (curIdx === -1 ? 0 : curIdx) + delta));
    jumpToQuestion(visible[nextIdx].id);
  }

  function renderQuestionCard(q, idx) {
    const card = document.createElement("article");
    card.className = "card question-card";
    card.id = "question-" + q.id;
    card.dataset.id = q.id;

    if (state.bookmarksOnly && !state.bookmarks.has(q.id)) {
      card.classList.add("is-hidden");
    }

    const locked = isQuestionLocked(q);
    const result = (locked || state.submitted) ? gradeQuestion(q) : null;

    // Header
    const top = document.createElement("div");
    top.className = "question-top";

    const kicker = document.createElement("p");
    kicker.className = "question-kicker";
    kicker.textContent = (q.section ? q.section + " · " : "") + "Question " + (idx + 1);

    const bookmark = document.createElement("button");
    bookmark.type = "button";
    bookmark.className = "bookmark-btn";
    const isMarked = state.bookmarks.has(q.id);
    bookmark.setAttribute("aria-pressed", isMarked ? "true" : "false");
    bookmark.textContent = isMarked ? "★ Bookmarked" : "☆ Bookmark";
    bookmark.addEventListener("click", () => {
      if (state.bookmarks.has(q.id)) state.bookmarks.delete(q.id);
      else state.bookmarks.add(q.id);
      render();
    });

    top.append(kicker, bookmark);
    card.append(top);

    // Reading passage
    if (q.type === "reading") {
      const reading = document.createElement("div");
      reading.className = "reading-text";
      const text = q.text || q.prompt || "";
      reading.textContent = text;
      if (hasArabic(text)) {
        reading.dir = "rtl";
        reading.classList.add("dir-rtl");
      }
      card.append(reading);
    } else {
      const prompt = document.createElement("p");
      prompt.className = "prompt";
      appendContent(prompt, q.prompt);
      if (hasArabic(q.prompt)) {
        prompt.dir = "rtl";
        prompt.classList.add("dir-rtl");
      }
      card.append(prompt);
    }

    appendImages(card, q.image ?? q.images);

    // Options / Answers Body
    const currentAns = state.answers.get(q.id);

    if (q.type === "mcq") {
      const list = document.createElement("ul");
      list.className = "choices";
      (q.choiceOrder || []).forEach((origIdx) => {
        const label = q.choices[origIdx];
        const item = document.createElement("li");
        const lbl = document.createElement("label");
        lbl.className = "choice";

        if (locked || state.submitted) {
          const isExpected = Array.isArray(q.answer)
            ? q.answer.includes(origIdx)
            : (q.acceptedAnswers ? q.acceptedAnswers.includes(origIdx) : origIdx === q.answer);
          if (isExpected) lbl.classList.add("correct");
          else if (currentAns === origIdx && result && !result.correct) lbl.classList.add("incorrect");
        }

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "answer-" + q.id;
        input.value = String(origIdx);
        input.checked = currentAns === origIdx;
        input.disabled = locked || state.submitted;
        input.addEventListener("change", () => {
          state.answers.set(q.id, origIdx);
          renderJumpNav();
          updateProgress();
        });

        const span = document.createElement("span");
        appendContent(span, label, "choice-images");
        if (hasArabic(label)) {
          lbl.dir = "rtl";
          lbl.classList.add("dir-rtl");
        }

        lbl.append(input, span);
        item.append(lbl);
        list.append(item);
      });
      card.append(list);
    } else if (q.type === "tf") {
      const list = document.createElement("ul");
      list.className = "choices";
      (q.tfOptions || [true, false]).forEach((val) => {
        const item = document.createElement("li");
        const lbl = document.createElement("label");
        lbl.className = "choice";

        if (locked || state.submitted) {
          if (val === q.answer) lbl.classList.add("correct");
          else if (currentAns === val && result && !result.correct) lbl.classList.add("incorrect");
        }

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "answer-" + q.id;
        input.value = String(val);
        input.checked = currentAns === val;
        input.disabled = locked || state.submitted;
        input.addEventListener("change", () => {
          state.answers.set(q.id, val);
          renderJumpNav();
          updateProgress();
        });

        const span = document.createElement("span");
        span.textContent = val ? "True" : "False";

        lbl.append(input, span);
        item.append(lbl);
        list.append(item);
      });
      card.append(list);
    } else if (q.type === "multi") {
      const list = document.createElement("ul");
      list.className = "choices";
      const selSet = new Set(Array.isArray(currentAns) ? currentAns : []);
      const expSet = new Set(Array.isArray(q.answer) ? q.answer : [q.answer]);

      (q.choiceOrder || []).forEach((origIdx) => {
        const label = q.choices[origIdx];
        const item = document.createElement("li");
        const lbl = document.createElement("label");
        lbl.className = "choice";

        if (locked || state.submitted) {
          if (expSet.has(origIdx)) lbl.classList.add("correct");
          else if (selSet.has(origIdx)) lbl.classList.add("incorrect");
        }

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = selSet.has(origIdx);
        input.disabled = locked || state.submitted;
        input.addEventListener("change", () => {
          const next = new Set(Array.isArray(state.answers.get(q.id)) ? state.answers.get(q.id) : []);
          if (input.checked) next.add(origIdx);
          else next.delete(origIdx);
          state.answers.set(q.id, [...next]);
          renderJumpNav();
          updateProgress();
        });

        const span = document.createElement("span");
        appendContent(span, label, "choice-images");
        if (hasArabic(label)) {
          lbl.dir = "rtl";
          lbl.classList.add("dir-rtl");
        }

        lbl.append(input, span);
        item.append(lbl);
        list.append(item);
      });
      card.append(list);
    } else if (q.type === "match") {
      const wrap = document.createElement("div");
      const pairs = q.pairs || [];
      const userMatches = Array.isArray(currentAns) ? currentAns : pairs.map(() => "");

      pairs.forEach((pair, pairIdx) => {
        const row = document.createElement("div");
        row.className = "match-row";

        const left = document.createElement("div");
        left.className = "match-left";
        appendContent(left, pair.left, "choice-images");
        if (hasArabic(pair.left)) {
          left.dir = "rtl";
          left.classList.add("dir-rtl");
        }

        const select = document.createElement("select");
        select.disabled = locked || state.submitted;
        select.innerHTML = '<option value="">Select a match</option>';

        (q.shuffledRights || []).forEach((r) => {
          const opt = document.createElement("option");
          opt.value = String(r.index);
          opt.textContent = typeof r.text === "object" ? (r.text.text || "") : String(r.text);
          select.append(opt);
        });

        select.value = userMatches[pairIdx] !== undefined ? String(userMatches[pairIdx]) : "";

        if (locked || state.submitted) {
          const selIdx = Number(userMatches[pairIdx]);
          const opt = (q.shuffledRights || []).find((o) => o.index === selIdx);
          const selRight = opt ? opt.text : (pairs[selIdx] ? pairs[selIdx].right : undefined);
          const valA = typeof selRight === "object" ? selRight.text : selRight;
          const valB = typeof pair.right === "object" ? pair.right.text : pair.right;
          const isOk = (valA !== undefined && valA === valB)
            || (Array.isArray(pair.acceptedMatches) && pair.acceptedMatches.includes(valA));
          select.style.borderColor = isOk ? "var(--ok)" : "var(--err)";
        }

        select.addEventListener("change", () => {
          const next = [...(state.answers.get(q.id) || pairs.map(() => ""))];
          next[pairIdx] = select.value === "" ? "" : Number(select.value);
          state.answers.set(q.id, next);
          renderJumpNav();
          updateProgress();
        });

        row.append(left, select);
        wrap.append(row);
      });
      card.append(wrap);
    } else if (q.type === "numeric") {
      const hint = document.createElement("p");
      hint.className = "writing-hint";
      hint.textContent = q.hint ?? "Enter a numeric value (e.g. 121.6).";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "numeric-answer";
      input.value = currentAns || "";
      input.placeholder = "Enter your answer...";
      input.disabled = locked || state.submitted;
      if (locked || state.submitted) {
        input.classList.add(result && result.correct ? "correct" : "incorrect");
      }
      input.addEventListener("input", () => {
        state.answers.set(q.id, input.value);
        renderJumpNav();
        updateProgress();
      });
      card.append(hint, input);

      if (locked || state.submitted) {
        const model = document.createElement("div");
        model.className = "model-answer";
        const heading = document.createElement("strong");
        heading.textContent = "Correct answer:";
        const ansDisplay = q.answerText ?? (Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers[0] : q.answer);
        model.append(heading, document.createTextNode(" " + String(ansDisplay ?? "")));
        card.append(model);
      }
    } else if (q.type === "writing" || q.type === "code" || q.type === "code-writing") {
      const isCode = q.type !== "writing";
      const area = document.createElement("textarea");
      area.placeholder = isCode ? "Write your code here..." : "Write your answer here...";
      area.value = currentAns || "";
      if (isCode) {
        area.setAttribute("autocapitalize", "off");
        area.setAttribute("autocorrect", "off");
        area.spellcheck = false;
      }
      area.disabled = locked || state.submitted;
      area.addEventListener("input", () => {
        state.answers.set(q.id, area.value);
        renderJumpNav();
        updateProgress();
      });
      card.append(area);
    }

    // Explanations & Model Answers
    if (locked || state.submitted) {
      if (q.explanation) {
        const exp = document.createElement("div");
        exp.className = "explanation";
        exp.innerHTML = "<strong>Explanation</strong>";
        appendContent(exp, q.explanation);
        appendImages(exp, q.explanationImages, "answer-images");
        if (hasArabic(q.explanation)) {
          exp.dir = "rtl";
          exp.classList.add("dir-rtl");
        }
        card.append(exp);
      }

      if (q.type === "writing" && q.modelAnswer) {
        const model = document.createElement("div");
        model.className = "model-answer";
        model.innerHTML = "<strong>Model Answer</strong>";
        appendContent(model, q.modelAnswer);
        appendImages(model, q.modelAnswerImages ?? q.answerImages, "answer-images");
        if (hasArabic(q.modelAnswer)) {
          model.dir = "rtl";
          model.classList.add("dir-rtl");
        }
        card.append(model);
      }

      if ((q.type === "code" || q.type === "code-writing") && (q.answer || q.modelAnswer || q.acceptedAnswers)) {
        const model = document.createElement("div");
        model.className = "model-answer";
        const heading = document.createElement("strong");
        heading.textContent = "Expected Code";
        model.append(heading, document.createTextNode(expectedCode(q)));
        card.append(model);
      }
    }

    // Bottom Card Actions & Feedback
    const actions = document.createElement("div");
    actions.className = "card-actions";

    if (state.mode === "practice" && !state.submitted && q.type !== "reading") {
      const checkBtn = document.createElement("button");
      checkBtn.type = "button";
      checkBtn.className = "btn btn-secondary";
      checkBtn.textContent = "Check";
      checkBtn.disabled = locked;
      checkBtn.addEventListener("click", () => {
        const g = gradeQuestion(q);
        if (!g.answered && q.type !== "writing") {
          fb.textContent = "Choose an answer first.";
          fb.className = "feedback warn";
          return;
        }
        state.revealed.add(q.id);
        render();
      });
      actions.append(checkBtn);
    }

    const fb = document.createElement("p");
    fb.className = "feedback";
    if (locked || state.submitted) {
      if (q.type === "writing") {
        fb.textContent = state.submitted ? "Writing is self-graded." : "Model answer shown — grade this one yourself.";
        fb.classList.add("warn");
      } else if (result) {
        fb.textContent = result.correct ? "Correct." : (state.submitted ? "Incorrect." : "Not quite — see correct answer above.");
        fb.classList.add(result.correct ? "ok" : "err");
      }
    } else {
      fb.hidden = true;
    }
    actions.append(fb);

    card.append(actions);
    return card;
  }

  function updateProgress() {
    const answered = state.questions.filter((q) => gradeQuestion(q).answered).length;
    els.progress.textContent = state.questions.length + " questions · " + answered + " answered · " + state.bookmarks.size + " bookmarked";

    if (state.submitted && state.score) {
      els.score.hidden = false;
      els.score.textContent = state.score.total === 0
        ? "Submitted — no auto-scored items."
        : "Score: " + state.score.correct + " / " + state.score.total + " (" + state.score.percent + "%)";
    } else {
      els.score.hidden = true;
    }
  }

  function observeQuestions() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = visible.target.dataset.id;
      if (id && id !== state.activeId) {
        state.activeId = id;
        renderJumpNav();
      }
    }, { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] });

    document.querySelectorAll(".question-card").forEach((c) => observer.observe(c));
  }

  function render() {
    updateProgress();
    els.btnSubmit.hidden = state.mode !== "test" || state.submitted;

    const frag = document.createDocumentFragment();
    let prevSection = null;

    state.questions.forEach((q, idx) => {
      if (q.section && q.section !== prevSection) {
        const secHeading = document.createElement("h2");
        secHeading.className = "question-section";
        secHeading.textContent = q.section;
        frag.append(secHeading);
        prevSection = q.section;
      }
      frag.append(renderQuestionCard(q, idx));
    });

    els.questionList.replaceChildren(frag);
    renderJumpNav();

    const visibleCount = state.questions.filter((q) => !state.bookmarksOnly || state.bookmarks.has(q.id)).length;
    els.emptyFilter.hidden = visibleCount > 0;

    observeQuestions();
  }

  function restart(fullShuffle) {
    if (fullShuffle) {
      state.questions = prepareQuestions();
    }
    state.answers.clear();
    state.revealed.clear();
    state.submitted = false;
    state.score = null;
    state.activeId = state.questions[0]?.id || null;
    render();
  }

  function submitTest() {
    state.submitted = true;
    const scored = state.questions.filter(isScoredQuestion);
    const correct = scored.filter((q) => gradeQuestion(q).correct).length;
    const total = scored.length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 100;
    state.score = { correct, total, percent };
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function init() {
    try {
      state.bank = parseBankData();
      state.questions = prepareQuestions();
      state.activeId = state.questions[0]?.id || null;

      els.questionList = document.getElementById("questions");
      els.jumpGrid = document.getElementById("jump-grid");
      els.progress = document.getElementById("progress");
      els.score = document.getElementById("score");
      els.btnSubmit = document.getElementById("btn-submit");
      els.btnRestart = document.getElementById("btn-restart");
      els.emptyFilter = document.getElementById("empty");
      els.jumpPrev = document.getElementById("jump-prev");
      els.jumpNext = document.getElementById("jump-next");
      els.shuffleQ = document.getElementById("shuffle-questions");
      els.shuffleC = document.getElementById("shuffle-choices");
      els.bookmarksOnly = document.getElementById("bookmarks-only");

      document.querySelectorAll('input[name="mode"]').forEach((input) => {
        input.addEventListener("change", () => {
          state.mode = input.value;
          restart(false);
        });
      });

      els.shuffleQ.addEventListener("change", (e) => {
        state.shuffleQuestions = e.target.checked;
        restart(true);
      });

      els.shuffleC.addEventListener("change", (e) => {
        state.shuffleChoices = e.target.checked;
        restart(true);
      });

      els.bookmarksOnly.addEventListener("change", (e) => {
        state.bookmarksOnly = e.target.checked;
        render();
      });

      if (els.jumpPrev) els.jumpPrev.addEventListener("click", () => moveStepper(-1));
      if (els.jumpNext) els.jumpNext.addEventListener("click", () => moveStepper(1));
      els.btnSubmit.addEventListener("click", submitTest);
      els.btnRestart.addEventListener("click", () => restart(true));

      window.getProcessedQuestionData = () => state.questions.map((q, idx) => ({
        number: idx + 1,
        id: q.id,
        type: q.type,
        prompt: typeof q.prompt === "object" ? String(q.prompt?.text ?? "") : String(q.prompt ?? q.text ?? ""),
        question: q,
      }));

      render();
    } catch (err) {
      console.error("[offline-quiz] Init failed:", err);
      const app = document.querySelector(".app");
      if (app) {
        app.innerHTML = '<div class="card" style="margin-top:2rem;text-align:center;"><h2>Could not load questions</h2><p>' + escapeHtml(err.message) + '</p></div>';
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Builds a fully self-contained offline quiz HTML document string from a question bank.
 * @param {object} bank - Question bank containing `title` and `questions`
 * @returns {string} Standalone HTML document string
 */
export function buildOfflineQuizHtml(bank) {
  const title = escapeHtml(bank?.title || "Question Bank");
  const jsonPayload = serializeJsonForScript(bank);
  const styles = getOfflineStyles();
  const clientScript = getOfflineClientScript();

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
    <style>${styles}</style>
  </head>
  <body>
    <div class="app">
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>Question Bank</span>
        </div>
        <p class="tagline">Standalone interactive quiz — Practice or Test mode</p>
      </header>

      <main class="view" aria-labelledby="quiz-title">
        <header class="quiz-header">
          <h1 id="quiz-title" class="quiz-title">${title}</h1>
          <div class="meta-row">
            <p id="progress" class="progress" role="status" aria-live="polite"></p>
            <p id="score" class="score-banner" role="status" aria-live="polite" hidden></p>
          </div>
          <form class="controls" id="quiz-controls" onsubmit="return false;">
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
            <div class="controls-actions">
              <button type="button" id="btn-restart" class="btn btn-ghost" title="Reset all answers and re-shuffle">↺ Restart</button>
            </div>
          </form>
        </header>

        <div class="quiz-layout">
          <nav id="jump-nav" class="jump-nav" aria-label="Jump to question">
            <div class="jump-toolbar">
              <p class="jump-label">Questions</p>
              <label class="toggle">
                <input type="checkbox" id="bookmarks-only" />
                Bookmarks
              </label>
              <div class="jump-stepper" aria-label="Move between questions">
                <button type="button" id="jump-prev" class="jump-step-btn" aria-label="Previous question">‹</button>
                <button type="button" id="jump-next" class="jump-step-btn" aria-label="Next question">›</button>
              </div>
            </div>
            <div id="jump-grid" class="jump-grid"></div>
          </nav>

          <section class="quiz-content" aria-labelledby="quiz-title">
            <div id="questions" class="question-list"></div>
            <p id="empty" class="empty-filter" role="status" hidden>No bookmarked questions match your filter.</p>
            <div class="quiz-actions">
              <button type="button" id="btn-submit" class="btn btn-primary" hidden>Submit test</button>
            </div>
          </section>
        </div>
      </main>
    </div>

    <!-- Embedded Question Bank Data -->
    <script id="quiz-data" type="application/json">${jsonPayload}</script>

    <!-- Quiz Engine Runtime -->
    <script>${clientScript}</script>
  </body>
</html>`;
}

/**
 * Builds the offline quiz HTML and triggers a browser download.
 * @param {object} bank - Question bank object
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
