import { downloadOfflineQuizHtml } from "./offline-export.js";

const STORAGE_KEYS = {
  shuffleQuestions: "qb-shuffle-questions",
  shuffleChoices: "qb-shuffle-choices",
  mode: "qb-mode",
  bookmarksOnly: "qb-bookmarks-only",
};

const ARABIC_RE = /[\u0600-\u06FF]/;

const els = {
  home: document.getElementById("view-home"),
  quiz: document.getElementById("view-quiz"),
  bankList: document.getElementById("bank-list"),
  homeStatus: document.getElementById("home-status"),
  title: document.getElementById("quiz-title"),
  progress: document.getElementById("progress"),
  scoreBanner: document.getElementById("score-banner"),
  list: document.getElementById("question-list"),
  jumpGrid: document.getElementById("jump-grid"),
  emptyFilter: document.getElementById("empty-filter"),
  btnBack: document.getElementById("btn-back"),
  btnSubmit: document.getElementById("btn-submit"),
  btnExport: document.getElementById("btn-export-html"),
  shuffleQuestions: document.getElementById("shuffle-questions"),
  shuffleChoices: document.getElementById("shuffle-choices"),
  bookmarksOnly: document.getElementById("bookmarks-only"),
};

const state = {
  banks: [],
  bank: null,
  questions: [],
  mode: readStored(STORAGE_KEYS.mode, "practice"),
  shuffleQuestions: readStoredBool(STORAGE_KEYS.shuffleQuestions, false),
  shuffleChoices: readStoredBool(STORAGE_KEYS.shuffleChoices, false),
  bookmarksOnly: readStoredBool(STORAGE_KEYS.bookmarksOnly, false),
  bookmarks: new Set(),
  answers: {},
  revealed: {},
  submitted: false,
  score: null,
  activeId: null,
};

let observer = null;

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readStoredBool(key, fallback) {
  const value = readStored(key, null);
  if (value === null) return fallback;
  return value === "1";
}

function persist(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function bookmarkStorageKey(bankId) {
  return `qb-bookmarks:${bankId}`;
}

function loadBookmarks(bankId) {
  try {
    const raw = localStorage.getItem(bookmarkStorageKey(bankId));
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function saveBookmarks() {
  if (!state.bank) return;
  persist(bookmarkStorageKey(state.bank.id), JSON.stringify([...state.bookmarks]));
}

function hasArabic(text) {
  return ARABIC_RE.test(String(text ?? ""));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((value, i) => value === right[i]);
}

function isScoredType(type) {
  return type !== "writing";
}

function prepareQuestion(question, shuffleChoices) {
  const prepared = {
    ...question,
    choices: question.choices ? [...question.choices] : undefined,
    pairs: question.pairs ? question.pairs.map((pair) => ({ ...pair })) : undefined,
  };

  if (prepared.type === "mcq" || prepared.type === "multi") {
    const order = shuffleChoices ? shuffle(range(prepared.choices.length)) : range(prepared.choices.length);
    prepared.choiceOrder = order;
    prepared.displayChoices = order.map((i) => prepared.choices[i]);
  }

  if (prepared.type === "tf") {
    const options = [
      { value: true, label: "True" },
      { value: false, label: "False" },
    ];
    prepared.displayChoices = shuffleChoices ? shuffle(options) : options;
  }

  if (prepared.type === "match") {
    const rights = prepared.pairs.map((pair, i) => ({ originalIndex: i, text: pair.right }));
    prepared.rightOptions = shuffleChoices ? shuffle(rights) : rights;
  }

  return prepared;
}

function prepareAttempt(bank) {
  let questions = bank.questions.map((question) => ({ ...question }));
  if (state.shuffleQuestions) questions = shuffle(questions);
  return questions.map((question) => prepareQuestion(question, state.shuffleChoices));
}

function setView(name) {
  const home = name === "home";
  els.home.hidden = !home;
  els.quiz.hidden = home;
}

function showHomeError(message) {
  els.homeStatus.hidden = false;
  els.homeStatus.textContent = message;
}

async function loadBanks() {
  const response = await fetch("./data/banks.json");
  if (!response.ok) throw new Error("Could not load the bank list.");
  const data = await response.json();
  state.banks = data.banks ?? data;
}

function renderHome() {
  setView("home");
  els.bankList.innerHTML = "";
  state.banks.forEach((bank) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(bank.title)}</strong><span class="count">Open this set</span>`;
    button.addEventListener("click", () => openBank(bank));
    item.append(button);
    els.bankList.append(item);
  });
}

function exportCurrentBank() {
  if (!state.bank) return;
  downloadOfflineQuizHtml(state.bank);
}

async function openBank(meta) {
  const response = await fetch(`./data/${meta.file}`);
  if (!response.ok) {
    showHomeError(`Could not load ${meta.title}.`);
    return;
  }
  const bank = await response.json();
  startAttempt({ ...bank, file: meta.file, title: bank.title || meta.title });
}

function startAttempt(bank) {
  state.bank = bank;
  state.questions = prepareAttempt(bank);
  state.answers = {};
  state.revealed = {};
  state.submitted = false;
  state.score = null;
  state.bookmarks = loadBookmarks(bank.id);
  state.activeId = state.questions[0]?.id ?? null;
  els.title.textContent = bank.title;
  setView("quiz");
  renderQuiz();
}

function userAnswer(question) {
  return state.answers[question.id];
}

function setUserAnswer(question, value) {
  state.answers[question.id] = value;
  updateJumpNav();
  updateProgress();
}

function isAnswered(question) {
  return gradeQuestion(question).answered;
}

function gradeQuestion(question) {
  const answer = userAnswer(question);
  if (question.type === "writing") {
    return { scored: false, correct: null, answered: Boolean(String(answer ?? "").trim()) };
  }
  if (answer === undefined || answer === null || (Array.isArray(answer) && answer.some((item) => item === null || item === undefined || item === ""))) {
    return { scored: true, correct: false, answered: false };
  }
  if (question.type === "mcq") return { scored: true, correct: answer === question.answer, answered: true };
  if (question.type === "tf") return { scored: true, correct: answer === question.answer, answered: true };
  if (question.type === "multi") {
    const expected = Array.isArray(question.answer) ? question.answer : [question.answer];
    return { scored: true, correct: sameSet(answer, expected), answered: true };
  }
  if (question.type === "match") {
    const ok = question.pairs.every((_, i) => Number(answer[i]) === i);
    return { scored: true, correct: ok, answered: true };
  }
  return { scored: true, correct: false, answered: false };
}

function computeScore() {
  const scored = state.questions.filter((question) => isScoredType(question.type));
  const correct = scored.filter((question) => gradeQuestion(question).correct).length;
  return { correct, total: scored.length };
}

function questionIsLocked(question) {
  return state.submitted || Boolean(state.revealed[question.id] && state.mode === "practice");
}

function visibleQuestions() {
  if (!state.bookmarksOnly) return state.questions.map((question, index) => ({ question, index }));
  return state.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => state.bookmarks.has(question.id));
}

function updateProgress() {
  const answered = state.questions.filter(isAnswered).length;
  const bookmarked = state.questions.filter((question) => state.bookmarks.has(question.id)).length;
  els.progress.textContent = `${state.questions.length} questions · ${answered} answered · ${bookmarked} bookmarked`;
  if (state.submitted && state.score) {
    els.scoreBanner.hidden = false;
    els.scoreBanner.textContent = `Score: ${state.score.correct} / ${state.score.total} (writing items excluded)`;
  } else {
    els.scoreBanner.hidden = true;
  }
}

function jumpClass(question) {
  const classes = ["jump-btn"];
  if (state.activeId === question.id) classes.push("is-active");
  if (isAnswered(question)) classes.push("is-answered");
  if (state.bookmarks.has(question.id)) classes.push("is-bookmarked");
  const locked = questionIsLocked(question);
  if (locked || state.submitted) {
    const result = gradeQuestion(question);
    if (question.type === "writing") {
      /* no correct/incorrect */
    } else if (result.correct) classes.push("is-correct");
    else if (result.answered || state.submitted) classes.push("is-incorrect");
  }
  return classes.join(" ");
}

function updateJumpNav() {
  const items = visibleQuestions();
  els.jumpGrid.innerHTML = "";
  items.forEach(({ question, index }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = jumpClass(question);
    button.textContent = String(index + 1);
    button.title = state.bookmarks.has(question.id) ? `Question ${index + 1} (bookmarked)` : `Question ${index + 1}`;
    button.addEventListener("click", () => jumpTo(question.id));
    els.jumpGrid.append(button);
  });
  els.emptyFilter.hidden = !(state.bookmarksOnly && items.length === 0);
}

function jumpTo(id) {
  const card = document.getElementById(`question-${id}`);
  if (!card) return;
  state.activeId = id;
  updateJumpNav();
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyVisibility() {
  state.questions.forEach((question) => {
    const card = document.getElementById(`question-${question.id}`);
    if (!card) return;
    const show = !state.bookmarksOnly || state.bookmarks.has(question.id);
    card.classList.toggle("is-hidden", !show);
  });
  updateJumpNav();
  els.emptyFilter.hidden = !(state.bookmarksOnly && visibleQuestions().length === 0);
}

function renderQuiz() {
  updateProgress();
  els.btnSubmit.hidden = state.mode === "practice" || state.submitted;
  els.list.innerHTML = "";
  state.questions.forEach((question, index) => {
    const article = document.createElement("article");
    article.className = "card question-card";
    article.id = `question-${question.id}`;
    article.dataset.id = question.id;
    if (state.bookmarksOnly && !state.bookmarks.has(question.id)) {
      article.classList.add("is-hidden");
    }
    renderQuestionCard(article, question, index);
    els.list.append(article);
  });
  updateJumpNav();
  observeQuestions();
}

function renderQuestionCard(article, question, index) {
  article.innerHTML = "";
  const locked = questionIsLocked(question);
  const result = locked || state.submitted ? gradeQuestion(question) : null;

  const top = document.createElement("div");
  top.className = "question-top";
  const kicker = document.createElement("p");
  kicker.className = "question-kicker";
  kicker.textContent = `Question ${index + 1}`;
  const bookmark = document.createElement("button");
  bookmark.type = "button";
  bookmark.className = "bookmark-btn";
  const marked = state.bookmarks.has(question.id);
  bookmark.setAttribute("aria-pressed", marked ? "true" : "false");
  bookmark.textContent = marked ? "★ Bookmarked" : "☆ Bookmark";
  bookmark.addEventListener("click", () => toggleBookmark(question.id));
  top.append(kicker, bookmark);
  article.append(top);

  const prompt = document.createElement("p");
  prompt.className = "prompt";
  prompt.textContent = question.prompt;
  if (hasArabic(question.prompt)) {
    prompt.dir = "rtl";
    prompt.classList.add("dir-rtl");
  }
  article.append(prompt);

  if (question.type === "mcq" || question.type === "tf") renderSingleChoice(article, question, locked, result);
  if (question.type === "multi") renderMulti(article, question, locked, result);
  if (question.type === "match") renderMatch(article, question, locked, result);
  if (question.type === "writing") renderWriting(article, question, locked);

  if ((locked || state.submitted) && question.explanation) {
    const explanation = document.createElement("p");
    explanation.className = "explanation";
    explanation.innerHTML = `<strong>Explanation</strong>${escapeHtml(question.explanation)}`;
    if (hasArabic(question.explanation)) {
      explanation.dir = "rtl";
      explanation.classList.add("dir-rtl");
    }
    article.append(explanation);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";
  if (state.mode === "practice" && !state.submitted) {
    const check = document.createElement("button");
    check.type = "button";
    check.className = "btn btn-secondary";
    check.textContent = "Check";
    check.disabled = locked;
    check.addEventListener("click", () => checkQuestion(question, index));
    actions.append(check);
  }
  const feedback = document.createElement("p");
  feedback.className = "feedback";
  const message = feedbackMessage(question, result);
  if (message) {
    feedback.classList.add(message.kind);
    feedback.textContent = message.text;
  } else {
    feedback.hidden = true;
  }
  actions.append(feedback);
  article.append(actions);
}

function feedbackMessage(question, result) {
  if (state.mode === "practice" && state.revealed[question.id] && result) {
    if (question.type === "writing") return { kind: "warn", text: "Model answer shown — grade this one yourself." };
    return result.correct
      ? { kind: "ok", text: "Correct." }
      : { kind: "err", text: "Not quite — the correct answer is highlighted." };
  }
  if (state.submitted && result) {
    if (question.type === "writing") return { kind: "warn", text: "Not counted in the numeric score." };
    return result.correct ? { kind: "ok", text: "Correct." } : { kind: "err", text: "Incorrect." };
  }
  return null;
}

function choiceClass(question, originalIndex, locked, result) {
  if (!locked && !state.submitted) return "choice";
  const answer = userAnswer(question);
  if (question.type === "mcq") {
    if (originalIndex === question.answer) return "choice correct";
    if (answer === originalIndex && result && !result.correct) return "choice incorrect";
  }
  if (question.type === "tf") {
    const value = originalIndex;
    if (value === question.answer) return "choice correct";
    if (answer === value && result && !result.correct) return "choice incorrect";
  }
  if (question.type === "multi") {
    const expected = new Set(question.answer);
    const selected = new Set(answer ?? []);
    if (expected.has(originalIndex)) return "choice correct";
    if (selected.has(originalIndex) && !expected.has(originalIndex)) return "choice incorrect";
  }
  return "choice";
}

function renderSingleChoice(host, question, locked, result) {
  const list = document.createElement("ul");
  list.className = "choices";
  const name = `q-${question.id}`;

  if (question.type === "mcq") {
    question.displayChoices.forEach((label, displayIndex) => {
      const originalIndex = question.choiceOrder[displayIndex];
      list.append(choiceRow({
        name,
        type: "radio",
        label,
        checked: userAnswer(question) === originalIndex,
        disabled: locked || state.submitted,
        className: choiceClass(question, originalIndex, locked, result),
        onChange: () => setUserAnswer(question, originalIndex),
      }));
    });
  } else {
    question.displayChoices.forEach((option) => {
      list.append(choiceRow({
        name,
        type: "radio",
        label: option.label,
        checked: userAnswer(question) === option.value,
        disabled: locked || state.submitted,
        className: choiceClass(question, option.value, locked, result),
        onChange: () => setUserAnswer(question, option.value),
      }));
    });
  }

  host.append(list);
}

function renderMulti(host, question, locked, result) {
  const list = document.createElement("ul");
  list.className = "choices";
  const selected = new Set(userAnswer(question) ?? []);

  question.displayChoices.forEach((label, displayIndex) => {
    const originalIndex = question.choiceOrder[displayIndex];
    list.append(choiceRow({
      name: `q-${question.id}`,
      type: "checkbox",
      label,
      checked: selected.has(originalIndex),
      disabled: locked || state.submitted,
      className: choiceClass(question, originalIndex, locked, result),
      onChange: (event) => {
        const next = new Set(userAnswer(question) ?? []);
        if (event.target.checked) next.add(originalIndex);
        else next.delete(originalIndex);
        setUserAnswer(question, [...next]);
      },
    }));
  });

  host.append(list);
}

function choiceRow({ name, type, label, checked, disabled, className, onChange }) {
  const item = document.createElement("li");
  const row = document.createElement("label");
  row.className = className;
  if (hasArabic(label)) {
    row.dir = "rtl";
    row.classList.add("dir-rtl");
  }
  const input = document.createElement("input");
  input.type = type;
  input.name = name;
  input.checked = checked;
  input.disabled = disabled;
  input.addEventListener("change", onChange);
  const text = document.createElement("span");
  text.textContent = label;
  row.append(input, text);
  item.append(row);
  return item;
}

function renderMatch(host, question, locked) {
  const wrap = document.createElement("div");
  const current = userAnswer(question) ?? question.pairs.map(() => "");

  question.pairs.forEach((pair, leftIndex) => {
    const row = document.createElement("div");
    row.className = "match-row";
    const left = document.createElement("div");
    left.className = "match-left";
    left.textContent = pair.left;
    if (hasArabic(pair.left)) {
      left.dir = "rtl";
      left.classList.add("dir-rtl");
    }
    const select = document.createElement("select");
    select.disabled = locked || state.submitted;
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Select a match";
    select.append(blank);
    question.rightOptions.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = String(option.originalIndex);
      opt.textContent = option.text;
      select.append(opt);
    });
    select.value = current[leftIndex] === "" || current[leftIndex] === undefined ? "" : String(current[leftIndex]);
    if (locked || state.submitted) {
      const ok = Number(current[leftIndex]) === leftIndex;
      select.classList.add(ok ? "correct" : "incorrect");
      row.classList.add(ok ? "correct" : "incorrect");
    }
    select.addEventListener("change", () => {
      const next = [...(userAnswer(question) ?? question.pairs.map(() => ""))];
      next[leftIndex] = select.value === "" ? "" : Number(select.value);
      setUserAnswer(question, next);
    });
    row.append(left, select);
    wrap.append(row);
  });

  host.append(wrap);
}

function renderWriting(host, question, locked) {
  const hint = document.createElement("p");
  hint.className = "writing-hint";
  hint.textContent = "Writing is not auto-scored. Compare your text with the model answer after Check or Submit.";
  const area = document.createElement("textarea");
  area.value = userAnswer(question) ?? "";
  area.disabled = locked || state.submitted;
  area.addEventListener("input", () => setUserAnswer(question, area.value));
  host.append(hint, area);

  if (locked || state.submitted) {
    const model = document.createElement("p");
    model.className = "model-answer";
    model.innerHTML = `<strong>Model answer</strong>${escapeHtml(question.modelAnswer)}`;
    if (hasArabic(question.modelAnswer)) {
      model.dir = "rtl";
      model.classList.add("dir-rtl");
    }
    host.append(model);
  }
}

function toggleBookmark(id) {
  if (state.bookmarks.has(id)) state.bookmarks.delete(id);
  else state.bookmarks.add(id);
  saveBookmarks();
  const question = state.questions.find((item) => item.id === id);
  const index = state.questions.findIndex((item) => item.id === id);
  const article = document.getElementById(`question-${id}`);
  if (question && article) renderQuestionCard(article, question, index);
  applyVisibility();
  updateProgress();
}

function checkQuestion(question, index) {
  const article = document.getElementById(`question-${question.id}`);
  if (question.type !== "writing") {
    const result = gradeQuestion(question);
    if (!result.answered) {
      const feedback = article.querySelector(".feedback");
      feedback.hidden = false;
      feedback.className = "feedback warn";
      feedback.textContent = "Choose an answer first.";
      return;
    }
  }
  state.revealed[question.id] = true;
  renderQuestionCard(article, question, index);
  updateJumpNav();
}

function submitTest() {
  state.submitted = true;
  state.score = computeScore();
  renderQuiz();
}

function observeQuestions() {
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = visible.target.dataset.id;
      if (id && id !== state.activeId) {
        state.activeId = id;
        updateJumpNav();
      }
    },
    { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] },
  );
  els.list.querySelectorAll(".question-card").forEach((card) => observer.observe(card));
}

function bindControls() {
  els.shuffleQuestions.checked = state.shuffleQuestions;
  els.shuffleChoices.checked = state.shuffleChoices;
  els.bookmarksOnly.checked = state.bookmarksOnly;
  document.querySelectorAll('input[name="mode"]').forEach((input) => {
    input.checked = input.value === state.mode;
    input.addEventListener("change", () => {
      state.mode = input.value;
      persist(STORAGE_KEYS.mode, state.mode);
      if (state.bank) startAttempt(state.bank);
    });
  });
  els.shuffleQuestions.addEventListener("change", () => {
    state.shuffleQuestions = els.shuffleQuestions.checked;
    persist(STORAGE_KEYS.shuffleQuestions, state.shuffleQuestions ? "1" : "0");
    if (state.bank) startAttempt(state.bank);
  });
  els.shuffleChoices.addEventListener("change", () => {
    state.shuffleChoices = els.shuffleChoices.checked;
    persist(STORAGE_KEYS.shuffleChoices, state.shuffleChoices ? "1" : "0");
    if (state.bank) startAttempt(state.bank);
  });
  els.bookmarksOnly.addEventListener("change", () => {
    state.bookmarksOnly = els.bookmarksOnly.checked;
    persist(STORAGE_KEYS.bookmarksOnly, state.bookmarksOnly ? "1" : "0");
    if (state.bank) applyVisibility();
  });
  els.btnBack.addEventListener("click", () => {
    state.bank = null;
    renderHome();
  });
  els.btnSubmit.addEventListener("click", submitTest);
  if (els.btnExport) {
    els.btnExport.addEventListener("click", exportCurrentBank);
  }
}

async function init() {
  bindControls();
  try {
    await loadBanks();
    renderHome();
  } catch (error) {
    showHomeError(error.message || "Could not load banks.");
  }
}

init();
