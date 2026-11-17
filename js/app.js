import { downloadOfflineQuizHtml } from "./offline-export.js";

const STORAGE_KEYS = {
  shuffleQuestions: "qb-shuffle-questions",
  shuffleChoices: "qb-shuffle-choices",
  mode: "qb-mode",
  bookmarksOnly: "qb-bookmarks-only",
  folderConfig: "qb-folder-config",
  progress: "qb-progress",
  feedback: "qb-feedback",
  users: "qb-users",
  session: "qb-session",
  authoredQuizzes: "qb-authored-quizzes",
  activity: "qb-activity",
};

const ARABIC_RE = /[\u0600-\u06FF]/;
const SUBJECT_FOLDERS = ["ML", "DL", "IoT", "Arabic", "Islamic Studies", "Math", "Biology", "GRD", "phyisics", "chemistry"];
const DEFAULT_FOLDER_PERMISSION = "public";
const FEEDBACK_CATEGORIES = {
  bug: "Bug or error",
  content: "Question/content issue",
  feature: "Feature request",
  usability: "Usability",
  other: "Other",
};
const FEEDBACK_PRIORITIES = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};
const FEEDBACK_PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

const els = {
  home: document.getElementById("view-home"),
  quiz: document.getElementById("view-quiz"),
  bankList: document.getElementById("bank-list"),
  manageFolders: document.getElementById("btn-manage-folders"),
  closeFolderManager: document.getElementById("btn-close-folder-manager"),
  folderManager: document.getElementById("folder-manager"),
  folderManagerList: document.getElementById("folder-manager-list"),
  addFolder: document.getElementById("btn-add-folder"),
  feedback: document.getElementById("feedback-panel"),
  feedbackForm: document.getElementById("feedback-form"),
  feedbackMessage: document.getElementById("feedback-message"),
  feedbackCategory: document.getElementById("feedback-category"),
  feedbackPriority: document.getElementById("feedback-priority"),
  feedbackStatus: document.getElementById("feedback-status"),
  feedbackFilter: document.getElementById("feedback-filter"),
  feedbackList: document.getElementById("feedback-list"),
  feedbackButton: document.getElementById("btn-feedback"),
  closeFeedback: document.getElementById("btn-close-feedback"),
  exportFeedback: document.getElementById("btn-export-feedback"),
  accountBar: document.getElementById("account-bar"),
  createQuiz: document.getElementById("btn-create-quiz"),
  creator: document.getElementById("quiz-creator"),
  closeCreator: document.getElementById("btn-close-creator"),
  quizForm: document.getElementById("quiz-form"),
  quizFormTitle: document.getElementById("quiz-form-title"),
  quizFormSubject: document.getElementById("quiz-form-subject"),
  quizFormGrade: document.getElementById("quiz-form-grade"),
  quizFormDifficulty: document.getElementById("quiz-form-difficulty"),
  quizFormDescription: document.getElementById("quiz-form-description"),
  quizFormPinnedText: document.getElementById("quiz-form-pinned-text"),
  quizFormPinnedImages: document.getElementById("quiz-form-pinned-images"),
  quizFormPinnedVideos: document.getElementById("quiz-form-pinned-videos"),
  quizFormQuestions: document.getElementById("quiz-form-questions"),
  quizFormStatus: document.getElementById("quiz-form-status"),
  search: document.getElementById("quiz-search"),
  searchStatus: document.getElementById("quiz-search-status"),
  adminButton: document.getElementById("btn-admin"),
  admin: document.getElementById("admin-dashboard"),
  closeAdmin: document.getElementById("btn-close-admin"),
  adminQuizList: document.getElementById("admin-quiz-list"),
  activityList: document.getElementById("activity-list"),
  authDialog: document.getElementById("auth-dialog"),
  authForm: document.getElementById("auth-form"),
  authTitle: document.getElementById("auth-title"),
  authNameLabel: document.getElementById("auth-name-label"),
  authName: document.getElementById("auth-name"),
  authEmail: document.getElementById("auth-email"),
  authPassword: document.getElementById("auth-password"),
  authStatus: document.getElementById("auth-status"),
  authSubmit: document.getElementById("auth-submit"),
  authSwitch: document.getElementById("auth-switch"),
  homeStatus: document.getElementById("home-status"),
  title: document.getElementById("quiz-title"),
  progress: document.getElementById("progress"),
  scoreBanner: document.getElementById("score-banner"),
  timer: document.getElementById("timer"),
  list: document.getElementById("question-list"),
  jumpNav: document.getElementById("jump-nav"),
  jumpGrid: document.getElementById("jump-grid"),
  jumpPrev: document.getElementById("jump-prev"),
  jumpNext: document.getElementById("jump-next"),
  pinnedReference: document.getElementById("pinned-reference"),
  pinnedReferenceContent: document.getElementById("pinned-reference-content"),
  emptyFilter: document.getElementById("empty-filter"),
  btnBack: document.getElementById("btn-back"),
  btnSubmit: document.getElementById("btn-submit"),
  btnNextTimed: document.getElementById("btn-next-timed"),
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
  folders: [],
  folderAssignments: {},
  timedIndex: 0,
  timedSeconds: 20,
  timerId: null,
  user: null,
  authMode: "login",
  authoredQuizzes: [],
  searchTerm: "",
};

let observer = null;
let jumpButtons = new Map();
let visibleJumpIds = [];
let lastActiveId = null;

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function loadFolderConfig() {
  const defaults = SUBJECT_FOLDERS.map((name) => ({ name, permission: DEFAULT_FOLDER_PERMISSION }));
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.folderConfig);
    if (!raw) return defaults;
    const saved = JSON.parse(raw);
    const folders = Array.isArray(saved) ? saved : saved.folders;
    if (!Array.isArray(folders)) return defaults;
    const valid = folders.filter((folder) => folder && typeof folder.name === "string" && folder.name.trim());
    state.folderAssignments = saved.assignments && typeof saved.assignments === "object" ? saved.assignments : {};
    return valid.length ? valid : defaults;
  } catch {
    return defaults;
  }
}

function saveFolderConfig() {
  persist(STORAGE_KEYS.folderConfig, JSON.stringify({
    folders: state.folders,
    assignments: state.folderAssignments,
  }));
}

function visibleFolders() {
  return state.folders.filter((folder) => folder.permission !== "private");
}

function folderForBank(bank) {
  const assignedName = state.folderAssignments[bank.id] || bank.subject;
  const configured = state.folders.find((folder) => folder.name === assignedName);
  return configured ? configured.name : "GRD";
}

function folderNames() {
  return state.folders.map((folder) => folder.name);
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

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadAccountState() {
  const users = readJson(STORAGE_KEYS.users, []);
  if (!users.some((user) => user.role === "admin")) {
    users.push({
      email: "admin@quiz.local",
      name: "Quiz Administrator",
      passwordHash: await hashPassword("admin123"),
      role: "admin",
      createdAt: new Date().toISOString(),
    });
    saveJson(STORAGE_KEYS.users, users);
  }
  state.authoredQuizzes = readJson(STORAGE_KEYS.authoredQuizzes, []);
  const sessionEmail = readStored(STORAGE_KEYS.session, "");
  state.user = users.find((user) => user.email === sessionEmail) ?? null;
}

function logActivity(type, detail) {
  const activity = readJson(STORAGE_KEYS.activity, []);
  activity.unshift({
    type,
    detail,
    email: state.user?.email ?? "visitor",
    at: new Date().toISOString(),
  });
  saveJson(STORAGE_KEYS.activity, activity.slice(0, 100));
}

function isAdmin() {
  return state.user?.role === "admin";
}

function renderAccountBar() {
  els.accountBar.innerHTML = "";
  if (!state.user) {
    const login = document.createElement("button");
    login.type = "button";
    login.className = "btn btn-secondary btn-small";
    login.textContent = "Log in";
    login.addEventListener("click", () => openAuth("login"));
    const register = document.createElement("button");
    register.type = "button";
    register.className = "btn btn-ghost btn-small";
    register.textContent = "Register";
    register.addEventListener("click", () => openAuth("register"));
    els.accountBar.append(login, register);
  } else {
    const name = document.createElement("span");
    name.textContent = `Signed in as ${state.user.name || state.user.email}`;
    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "btn btn-ghost btn-small";
    logout.textContent = "Log out";
    logout.addEventListener("click", logoutUser);
    els.accountBar.append(name, logout);
  }
  els.createQuiz.hidden = !state.user;
  els.adminButton.hidden = !isAdmin();
}

function openAuth(mode) {
  state.authMode = mode;
  els.authTitle.textContent = mode === "login" ? "Log in" : "Create your account";
  els.authNameLabel.hidden = mode === "login";
  els.authSubmit.textContent = mode === "login" ? "Log in" : "Register";
  els.authSwitch.textContent = mode === "login" ? "Create an account" : "I already have an account";
  els.authStatus.textContent = "";
  els.authForm.reset();
  els.authDialog.showModal();
  els.authEmail.focus();
}

async function submitAuth() {
  const email = els.authEmail.value.trim().toLowerCase();
  const password = els.authPassword.value;
  const name = els.authName.value.trim();
  if (!email || password.length < 6 || (state.authMode === "register" && !name)) {
    els.authStatus.textContent = state.authMode === "login"
      ? "Enter a valid email and a password of at least 6 characters."
      : "Enter your name, email, and a password of at least 6 characters.";
    return;
  }
  const users = readJson(STORAGE_KEYS.users, []);
  if (state.authMode === "register") {
    if (users.some((user) => user.email === email)) {
      els.authStatus.textContent = "An account with that email already exists.";
      return;
    }
    const user = { email, name, passwordHash: await hashPassword(password), role: "user", createdAt: new Date().toISOString() };
    users.push(user);
    saveJson(STORAGE_KEYS.users, users);
    state.user = user;
    persist(STORAGE_KEYS.session, email);
    logActivity("registered", "Created an account");
  } else {
    const user = users.find((candidate) => candidate.email === email);
    if (!user || user.passwordHash !== await hashPassword(password)) {
      els.authStatus.textContent = "Email or password is incorrect.";
      return;
    }
    state.user = user;
    persist(STORAGE_KEYS.session, email);
    logActivity("logged-in", "Logged in");
  }
  els.authDialog.close();
  renderAccountBar();
  renderHome();
}

function logoutUser() {
  if (state.user) logActivity("logged-out", "Logged out");
  localStorage.removeItem(STORAGE_KEYS.session);
  state.user = null;
  els.creator.hidden = true;
  els.admin.hidden = true;
  renderAccountBar();
  renderHome();
}

function allQuizMetadata() {
  const approved = state.authoredQuizzes
    .filter((quiz) => quiz.status === "approved")
    .map((quiz) => ({ ...quiz, authored: true, file: null }));
  return [...state.banks.filter((bank) => !bank.authored), ...approved];
}

function loadFeedback() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.feedback);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items)
      ? items.filter((item) => item && typeof item.message === "string" && FEEDBACK_CATEGORIES[item.category])
      : [];
  } catch {
    return [];
  }
}

function saveFeedback(items) {
  try {
    localStorage.setItem(STORAGE_KEYS.feedback, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function showFeedbackStatus(message, isError = false) {
  els.feedbackStatus.hidden = false;
  els.feedbackStatus.textContent = message;
  els.feedbackStatus.classList.toggle("error", isError);
}

function renderFeedbackReview() {
  const filter = els.feedbackFilter.value;
  const feedback = loadFeedback()
    .filter((item) => filter === "all" || item.category === filter)
    .sort((left, right) => {
      const priorityDifference = (FEEDBACK_PRIORITY_ORDER[left.priority] ?? 3) - (FEEDBACK_PRIORITY_ORDER[right.priority] ?? 3);
      return priorityDifference || String(right.createdAt).localeCompare(String(left.createdAt));
    });
  els.feedbackList.innerHTML = "";
  if (!feedback.length) {
    const empty = document.createElement("p");
    empty.className = "feedback-empty";
    empty.textContent = "No saved feedback matches this filter.";
    els.feedbackList.append(empty);
    return;
  }
  feedback.forEach((item) => {
    const article = document.createElement("article");
    article.className = "feedback-item";
    const header = document.createElement("div");
    header.className = "feedback-item-header";
    const badges = document.createElement("div");
    const category = document.createElement("span");
    category.className = "feedback-badge";
    category.textContent = FEEDBACK_CATEGORIES[item.category];
    const priority = document.createElement("span");
    priority.className = `feedback-badge priority-${item.priority}`;
    priority.textContent = FEEDBACK_PRIORITIES[item.priority] ?? "Medium";
    badges.append(category, priority);
    const meta = document.createElement("span");
    meta.className = "feedback-item-meta";
    const date = new Date(item.createdAt);
    meta.textContent = `${item.rating}/5 · ${Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString()}`;
    header.append(badges, meta);
    const message = document.createElement("p");
    message.className = "feedback-item-message";
    message.textContent = item.message;
    article.append(header, message);
    els.feedbackList.append(article);
  });
}

function submitFeedback(event) {
  event.preventDefault();
  const message = els.feedbackMessage.value.trim();
  if (!message) {
    showFeedbackStatus("Please enter your feedback.", true);
    return;
  }
  const rating = Number(new FormData(els.feedbackForm).get("feedback-rating"));
  const item = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    category: els.feedbackCategory.value,
    priority: els.feedbackPriority.value,
    rating: rating >= 1 && rating <= 5 ? rating : 3,
    createdAt: new Date().toISOString(),
  };
  const feedback = loadFeedback();
  feedback.push(item);
  if (!saveFeedback(feedback)) {
    showFeedbackStatus("Could not save feedback in this browser. Please try again.", true);
    return;
  }
  els.feedbackForm.reset();
  els.feedbackPriority.value = "medium";
  document.querySelector('input[name="feedback-rating"][value="3"]').checked = true;
  showFeedbackStatus("Thanks — your feedback was saved.");
  renderFeedbackReview();
}

function exportFeedback() {
  const feedback = loadFeedback();
  if (!feedback.length) {
    showFeedbackStatus("There is no saved feedback to download.", true);
    return;
  }
  const blob = new Blob([JSON.stringify(feedback, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `question-bank-feedback-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
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

function imageSources(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .map((item) => typeof item === "string" ? { src: item, alt: "" } : item)
    .filter((item) => item && typeof item.src === "string" && item.src.trim())
    .map((item) => ({ src: item.src.trim(), alt: String(item.alt ?? "") }));
}

function isSafeImageSource(src) {
  return /^(https?:\/\/|\/|\.\/|\.\.\/|data:image\/)/i.test(src);
}

function isSafeMediaSource(src) {
  return /^(https?:\/\/|\/|\.\/|\.\.\/|data:video\/)/i.test(String(src ?? ""));
}

function appendImages(host, value, className = "question-images") {
  const images = imageSources(value).filter((image) => isSafeImageSource(image.src));
  if (!images.length) return;
  const wrap = document.createElement("div");
  wrap.className = className;
  images.forEach((image) => {
    const element = document.createElement("img");
    element.src = image.src;
    element.alt = image.alt;
    element.loading = "lazy";
    wrap.append(element);
  });
  host.append(wrap);
}

function renderPinnedReference(bank) {
  const reference = bank?.pinnedReferences;
  if (!els.pinnedReference || !els.pinnedReferenceContent) return;
  els.pinnedReferenceContent.innerHTML = "";
  els.pinnedReference.hidden = true;
  if (!reference) return;

  if (reference.text) {
    const text = document.createElement("div");
    text.className = "pinned-reference-text";
    text.textContent = String(reference.text);
    els.pinnedReferenceContent.append(text);
  }

  imageSources(reference.images ?? reference.image)
    .filter((image) => isSafeImageSource(image.src))
    .forEach((image) => {
      const figure = document.createElement("figure");
      figure.className = "pinned-reference-media";
      const imageElement = document.createElement("img");
      imageElement.src = image.src;
      imageElement.alt = image.alt;
      imageElement.loading = "lazy";
      figure.append(imageElement);
      els.pinnedReferenceContent.append(figure);
    });

  const videos = Array.isArray(reference.videos) ? reference.videos : reference.video ? [reference.video] : [];
  videos.forEach((item) => {
    const video = typeof item === "string" ? { src: item } : item;
    if (!video || !isSafeMediaSource(video.src)) return;
    const wrapper = document.createElement("figure");
    wrapper.className = "pinned-reference-media";
    const videoElement = document.createElement("video");
    videoElement.src = video.src;
    videoElement.controls = true;
    videoElement.preload = "metadata";
    videoElement.title = String(video.title ?? "Pinned reference video");
    wrapper.append(videoElement);
    els.pinnedReferenceContent.append(wrapper);
  });

  els.pinnedReference.hidden = !els.pinnedReferenceContent.childElementCount;
}

function appendContent(host, value, imageClass = "question-images") {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (value.text) {
      const text = document.createElement("span");
      text.textContent = String(value.text);
      host.append(text);
    }
    appendImages(host, value.image ?? value.images, imageClass);
    return;
  }
  const text = document.createElement("span");
  text.textContent = String(value ?? "");
  host.append(text);
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
  return type !== "writing" && type !== "reading";
}

function isCodeQuestion(question) {
  return question.type === "code" || question.type === "code-writing";
}

function expectedCode(question) {
  const answers = question.acceptedAnswers ?? question.answer ?? question.modelAnswer ?? "";
  return Array.isArray(answers) ? answers[0] ?? "" : answers;
}

function acceptedCodeAnswers(question) {
  const answers = question.acceptedAnswers ?? question.answer ?? question.modelAnswer ?? "";
  return Array.isArray(answers) ? answers : [answers];
}

function normalizeCode(value) {
  return String(value ?? "").replace(/\s+/g, "");
}

function matchValue(value) {
  return typeof value === "object" && value !== null ? value.text ?? "" : value;
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
    let rights;
    if (Array.isArray(prepared.options)) {
      rights = prepared.options.map((opt, i) => ({ originalIndex: i, text: opt }));
    } else {
      rights = prepared.pairs.map((pair, i) => ({ originalIndex: i, text: pair.right }));
      if (Array.isArray(prepared.distractors)) {
        prepared.distractors.forEach((d, di) => {
          rights.push({ originalIndex: prepared.pairs.length + di, text: d });
        });
      }
    }
    prepared.rightOptions = shuffleChoices ? shuffle(rights) : rights;
  }

  return prepared;
}

function prepareAttempt(bank) {
  let questions = bank.questions.map((question) => ({ ...question }));
  if (state.shuffleQuestions) {
    const groups = [];
    const groupIndexes = new Map();
    questions.forEach((question) => {
      const group = question.group ?? question.section;
      const key = group ? `group:${group}` : `question:${question.id}`;
      if (!groupIndexes.has(key)) {
        groupIndexes.set(key, groups.length);
        groups.push([]);
      }
      groups[groupIndexes.get(key)].push(question);
    });
    questions = shuffle(groups).flat();
  }
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
  const response = await fetch(`./data/banks.json?ts=${Date.now()}`);
  if (!response.ok) throw new Error("Could not load the bank list.");
  const data = await response.json();
  state.banks = data.banks ?? data;
}

function renderHome() {
  setView("home");
  els.bankList.innerHTML = "";
  const search = state.searchTerm.trim().toLocaleLowerCase();
  const banks = allQuizMetadata().filter((bank) => {
    if (!search) return true;
    return [bank.title, bank.description, bank.subject, bank.gradeLevel, bank.difficulty, bank.authorName]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .includes(search);
  });
  els.searchStatus.textContent = search ? `${banks.length} matching quiz${banks.length === 1 ? "" : "zes"} found.` : `${banks.length} quizzes available.`;
  const folders = new Map(visibleFolders().map((folder) => [folder.name, []]));
  banks.forEach((bank) => {
    const subject = folderForBank(bank);
    if (!folders.has(subject)) folders.set(subject, []);
    folders.get(subject).push(bank);
  });

  [...folders.entries()].filter(([, folderBanks]) => folderBanks.length).forEach(([subject, banks]) => {
      const folder = document.createElement("details");
      folder.className = "bank-folder";
      folder.open = false;

      const summary = document.createElement("summary");
      summary.innerHTML = `<span class="folder-name">${escapeHtml(subject)}</span><span class="folder-count">${banks.length} ${banks.length === 1 ? "quiz" : "quizzes"}</span>`;
      folder.append(summary);

      const list = document.createElement("div");
      list.className = "folder-quizzes";
      banks
        .sort((left, right) => left.title.localeCompare(right.title))
        .forEach((bank) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "quiz-link";
          const metadata = [bank.gradeLevel, bank.difficulty].filter(Boolean).join(" · ");
          const attempts = getProgress(bank.id);
          const history = attempts.length
            ? ` · ${attempts.length} attempt${attempts.length === 1 ? "" : "s"} · best ${Math.max(...attempts.map((attempt) => attempt.percent))}%`
            : "";
          button.innerHTML = `<strong>${escapeHtml(bank.title)}</strong><span class="count">${escapeHtml((metadata || "Open this set") + history)}</span>`;
          button.addEventListener("click", () => openBank(bank));
          list.append(button);
        });
      folder.append(list);
      els.bankList.append(folder);
    });
  if (!banks.length) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.textContent = "No quizzes match your search.";
    els.bankList.append(empty);
  }
}

function renderFolderManager() {
  els.folderManagerList.innerHTML = "";
  state.folders.forEach((folder) => {
    const row = document.createElement("div");
    row.className = "folder-manager-row";
    const name = document.createElement("strong");
    name.textContent = folder.name;
    const actions = document.createElement("div");
    actions.className = "folder-manager-actions";

    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "btn btn-ghost";
    rename.textContent = "Rename";
    rename.addEventListener("click", () => renameFolder(folder.name));

    const permission = document.createElement("select");
    permission.setAttribute("aria-label", `Permission for ${folder.name}`);
    permission.innerHTML = '<option value="public">Everyone</option><option value="private">Private</option>';
    permission.value = folder.permission === "private" ? "private" : "public";
    permission.addEventListener("change", () => {
      folder.permission = permission.value;
      saveFolderConfig();
      renderFolderManager();
      renderHome();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-ghost";
    remove.textContent = "Delete";
    remove.disabled = state.banks.some((bank) => folderForBank(bank) === folder.name);
    remove.title = remove.disabled ? "Move all quizzes out before deleting this folder" : "Delete folder";
    remove.addEventListener("click", () => deleteFolder(folder.name));

    actions.append(rename, permission, remove);
    row.append(name, actions);
    els.folderManagerList.append(row);
  });
  renderMoveControls();
}

function renderMoveControls() {
  state.banks.forEach((bank) => {
    const existing = document.getElementById(`move-${bank.id}`);
    if (existing) existing.remove();
  });
  state.banks.forEach((bank) => {
    const row = document.createElement("div");
    row.className = "folder-manager-row";
    const title = document.createElement("span");
    title.textContent = bank.title;
    const select = document.createElement("select");
    select.id = `move-${bank.id}`;
    select.setAttribute("aria-label", `Folder for ${bank.title}`);
    folderNames().forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      option.selected = folderForBank(bank) === name;
      select.append(option);
    });
    select.addEventListener("change", () => {
      state.folderAssignments[bank.id] = select.value;
      saveFolderConfig();
      renderHome();
      renderFolderManager();
    });
    row.append(title, select);
    els.folderManagerList.append(row);
  });
}

function addFolder() {
  const name = window.prompt("New folder name:");
  if (!name?.trim()) return;
  const normalized = name.trim();
  if (folderNames().some((folder) => folder.toLowerCase() === normalized.toLowerCase())) {
    window.alert("A folder with that name already exists.");
    return;
  }
  state.folders.push({ name: normalized, permission: DEFAULT_FOLDER_PERMISSION });
  saveFolderConfig();
  renderFolderManager();
  renderHome();
}

function renameFolder(oldName) {
  const nextName = window.prompt("Rename folder:", oldName);
  if (!nextName?.trim() || nextName.trim() === oldName) return;
  const normalized = nextName.trim();
  if (folderNames().some((folder) => folder.toLowerCase() === normalized.toLowerCase())) {
    window.alert("A folder with that name already exists.");
    return;
  }
  state.folders.find((folder) => folder.name === oldName).name = normalized;
  state.banks.forEach((bank) => {
    if (folderForBank(bank) === oldName) state.folderAssignments[bank.id] = normalized;
  });
  saveFolderConfig();
  renderFolderManager();
  renderHome();
}

function deleteFolder(name) {
  if (state.banks.some((bank) => folderForBank(bank) === name)) return;
  state.folders = state.folders.filter((folder) => folder.name !== name);
  saveFolderConfig();
  renderFolderManager();
  renderHome();
}

function exportCurrentBank() {
  if (!state.bank) return;
  downloadOfflineQuizHtml(state.bank);
}

async function openBank(meta) {
  if (meta.authored) {
    logActivity("opened-quiz", `Opened ${meta.title}`);
    startAttempt(meta);
    return;
  }
  const response = await fetch(`./data/${meta.file}`);
  if (!response.ok) {
    showHomeError(`Could not load ${meta.title}.`);
    return;
  }
  const bank = await response.json();
  startAttempt({ ...bank, file: meta.file, title: bank.title || meta.title });
}

function showFormStatus(message, isError = false) {
  els.quizFormStatus.textContent = message;
  els.quizFormStatus.classList.toggle("error", isError);
}

function submitQuiz(event) {
  event.preventDefault();
  if (!state.user) {
    showFormStatus("Log in before submitting a quiz.", true);
    return;
  }
  let questions;
  try {
    questions = JSON.parse(els.quizFormQuestions.value);
  } catch {
    showFormStatus("Questions must be valid JSON.", true);
    return;
  }
  if (!Array.isArray(questions) || !questions.length || questions.some((question) => !question || !question.type || !question.prompt && question.type !== "reading")) {
    showFormStatus("Add at least one valid question with a type and prompt.", true);
    return;
  }
  const quiz = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: els.quizFormTitle.value.trim(),
    subject: els.quizFormSubject.value.trim(),
    gradeLevel: els.quizFormGrade.value.trim() || "Mixed",
    difficulty: els.quizFormDifficulty.value,
    description: els.quizFormDescription.value.trim(),
    pinnedReferences: {
      text: els.quizFormPinnedText.value.trim(),
      images: els.quizFormPinnedImages.value.split(/\r?\n/).map((src) => src.trim()).filter(Boolean),
      videos: els.quizFormPinnedVideos.value.split(/\r?\n/).map((src) => src.trim()).filter(Boolean),
    },
    questions: questions.map((question, index) => ({ ...question, id: question.id || `q${index + 1}` })),
    author: state.user.email,
    authorName: state.user.name,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  if (!quiz.title || !quiz.subject) {
    showFormStatus("Title and subject are required.", true);
    return;
  }
  if (!quiz.pinnedReferences.text && !quiz.pinnedReferences.images.length && !quiz.pinnedReferences.videos.length) {
    delete quiz.pinnedReferences;
  }
  state.authoredQuizzes.push(quiz);
  if (!saveJson(STORAGE_KEYS.authoredQuizzes, state.authoredQuizzes)) {
    state.authoredQuizzes.pop();
    showFormStatus("Could not save this quiz in browser storage.", true);
    return;
  }
  logActivity("submitted-quiz", `Submitted ${quiz.title} for approval`);
  els.quizForm.reset();
  els.creator.hidden = true;
  showFormStatus("");
  renderHome();
  window.alert("Your quiz was submitted for admin approval.");
}

function renderAdminDashboard() {
  els.adminQuizList.innerHTML = "";
  const pending = state.authoredQuizzes.filter((quiz) => quiz.status === "pending");
  if (!pending.length) {
    const empty = document.createElement("p");
    empty.className = "feedback-empty";
    empty.textContent = "No quizzes are waiting for review.";
    els.adminQuizList.append(empty);
  }
  pending.forEach((quiz) => {
    const row = document.createElement("article");
    row.className = "admin-item";
    const info = document.createElement("div");
    info.innerHTML = `<strong>${escapeHtml(quiz.title)}</strong><span>${escapeHtml(quiz.subject)} · ${quiz.questions.length} question${quiz.questions.length === 1 ? "" : "s"} · by ${escapeHtml(quiz.authorName || quiz.author)}</span>`;
    const actions = document.createElement("div");
    const approve = document.createElement("button");
    approve.type = "button";
    approve.className = "btn btn-primary btn-small";
    approve.textContent = "Approve";
    approve.addEventListener("click", () => moderateQuiz(quiz.id, "approved"));
    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "btn btn-ghost btn-small";
    reject.textContent = "Reject";
    reject.addEventListener("click", () => moderateQuiz(quiz.id, "rejected"));
    actions.append(approve, reject);
    row.append(info, actions);
    els.adminQuizList.append(row);
  });
  els.activityList.innerHTML = "";
  readJson(STORAGE_KEYS.activity, []).slice(0, 25).forEach((item) => {
    const row = document.createElement("p");
    const date = new Date(item.at);
    row.textContent = `${Number.isNaN(date.getTime()) ? item.at : date.toLocaleString()} · ${item.email} · ${item.detail}`;
    els.activityList.append(row);
  });
}

function moderateQuiz(id, status) {
  const quiz = state.authoredQuizzes.find((item) => item.id === id);
  if (!quiz) return;
  quiz.status = status;
  saveJson(STORAGE_KEYS.authoredQuizzes, state.authoredQuizzes);
  logActivity(status === "approved" ? "approved-quiz" : "rejected-quiz", `${status === "approved" ? "Approved" : "Rejected"} ${quiz.title}`);
  renderAdminDashboard();
  renderHome();
}

function startAttempt(bank) {
  stopTimedTimer();
  state.bank = bank;
  state.questions = prepareAttempt(bank);
  state.answers = {};
  state.revealed = {};
  state.submitted = false;
  state.score = null;
  state.bookmarks = loadBookmarks(bank.id);
  state.activeId = state.questions[0]?.id ?? null;
  state.timedIndex = 0;
  state.timedSeconds = 20;
  els.title.textContent = bank.title;
  renderPinnedReference(bank);
  setView("quiz");
  renderQuiz();
}

function getProgress(bankId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.progress}:${bankId}`);
    const attempts = raw ? JSON.parse(raw) : [];
    return Array.isArray(attempts) ? attempts.filter((attempt) => Number.isFinite(attempt.percent)) : [];
  } catch {
    return [];
  }
}

function saveProgress() {
  if (!state.bank || !state.score || state.score.total === 0) return;
  const attempts = getProgress(state.bank.id);
  attempts.push({
    date: new Date().toISOString(),
    correct: state.score.correct,
    total: state.score.total,
    percent: Math.round((state.score.correct / state.score.total) * 100),
    mode: state.mode,
  });
  persist(`${STORAGE_KEYS.progress}:${state.bank.id}`, JSON.stringify(attempts.slice(-50)));
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
  if (question.type === "reading") {
    return { scored: false, correct: null, answered: false };
  }
  if (question.type === "writing") {
    return { scored: false, correct: null, answered: Boolean(String(answer ?? "").trim()) };
  }
  if (isCodeQuestion(question)) {
    return {
      scored: true,
      correct: typeof answer === "string"
        && acceptedCodeAnswers(question).some((expected) => normalizeCode(answer) === normalizeCode(expected)),
      answered: typeof answer === "string" && answer.length > 0,
    };
  }
  if (question.type === "numeric") {
    const raw = typeof answer === "string" ? answer.trim() : (answer !== undefined && answer !== null ? String(answer).trim() : "");
    const answered = raw.length > 0;
    if (!answered) return { scored: true, correct: false, answered: false };
    const accepted = (question.acceptedAnswers ?? [question.answer]).map(String);
    const textMatch = accepted.some((a) => a.trim().toLowerCase() === raw.toLowerCase());
    if (textMatch) return { scored: true, correct: true, answered: true };
    const num = parseFloat(raw);
    const numMatch = !isNaN(num) && accepted.some((a) => {
      const target = parseFloat(a);
      return !isNaN(target) && Math.abs(num - target) < 1e-3;
    });
    return { scored: true, correct: numMatch, answered: true };
  }
  if (answer === undefined || answer === null || (Array.isArray(answer) && answer.some((item) => item === null || item === undefined || item === ""))) {
    return { scored: true, correct: false, answered: false };
  }
  if (question.type === "mcq") {
    const isCorrect = Array.isArray(question.answer)
      ? question.answer.includes(answer)
      : (question.acceptedAnswers ? question.acceptedAnswers.includes(answer) : answer === question.answer);
    return { scored: true, correct: isCorrect, answered: true };
  }
  if (question.type === "tf") return { scored: true, correct: answer === question.answer, answered: true };
  if (question.type === "multi") {
    const expected = Array.isArray(question.answer) ? question.answer : [question.answer];
    return { scored: true, correct: sameSet(answer, expected), answered: true };
  }
  if (question.type === "match") {
    const ok = question.pairs.every((pair, i) => {
      const selectedIndex = Number(answer[i]);
      if (!Number.isInteger(selectedIndex) || selectedIndex < 0) return false;
      const opt = question.rightOptions?.find((o) => o.originalIndex === selectedIndex);
      const selectedText = matchValue(opt ? opt.text : (question.pairs[selectedIndex] ? question.pairs[selectedIndex].right : undefined));
      const expectedText = matchValue(pair.right);
      if (selectedText !== undefined && selectedText === expectedText) return true;
      if (Array.isArray(pair.acceptedMatches) && pair.acceptedMatches.includes(selectedText)) return true;
      return false;
    });
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
    els.scoreBanner.textContent =
      state.score.total === 0
        ? "Submitted — writing questions are self-graded against the model answers."
        : `Score: ${state.score.correct} / ${state.score.total} (writing items excluded)`;
    if (state.score.total > 0) {
      const attempts = getProgress(state.bank.id);
      const best = Math.max(...attempts.map((attempt) => attempt.percent), Math.round((state.score.correct / state.score.total) * 100));
      const previous = attempts.at(-1);
      els.scoreBanner.textContent += ` · Best: ${best}%${previous ? ` · Previous: ${previous.percent}%` : ""}`;
    }
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
  visibleJumpIds = items.map(({ question }) => question.id);
  jumpButtons = new Map();
  els.jumpGrid.innerHTML = "";
  items.forEach(({ question, index }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = jumpClass(question);
    button.textContent = String(index + 1);
    button.title = state.bookmarks.has(question.id) ? `Question ${index + 1} (bookmarked)` : `Question ${index + 1}`;
    button.addEventListener("click", () => jumpTo(question.id));
    jumpButtons.set(question.id, button);
    els.jumpGrid.append(button);
  });
  refreshJumpNav();
}

function refreshJumpNav() {
  visibleQuestions().forEach(({ question }) => {
    const button = jumpButtons.get(question.id);
    if (button) button.className = jumpClass(question);
  });
  const visibleItems = visibleJumpIds.length;
  const activeIndex = visibleJumpIds.indexOf(state.activeId);
  els.emptyFilter.hidden = !(state.bookmarksOnly && visibleItems === 0);
  if (els.jumpPrev) els.jumpPrev.disabled = activeIndex <= 0;
  if (els.jumpNext) els.jumpNext.disabled = activeIndex === -1 || activeIndex >= visibleItems - 1;
  lastActiveId = state.activeId;
}

function refreshActiveJumpNav() {
  [lastActiveId, state.activeId].forEach((id) => {
    if (!id) return;
    const question = state.questions.find((item) => item.id === id);
    const button = jumpButtons.get(id);
    if (question && button) button.className = jumpClass(question);
  });
  const visibleItems = visibleJumpIds.length;
  const activeIndex = visibleJumpIds.indexOf(state.activeId);
  if (els.jumpPrev) els.jumpPrev.disabled = activeIndex <= 0;
  if (els.jumpNext) els.jumpNext.disabled = activeIndex === -1 || activeIndex >= visibleItems - 1;
  lastActiveId = state.activeId;
}

function moveActiveQuestion(step) {
  if (!visibleJumpIds.length) return;
  const currentIndex = visibleJumpIds.indexOf(state.activeId);
  const fallbackIndex = step > 0 ? -1 : visibleJumpIds.length;
  const nextIndex = Math.min(Math.max((currentIndex === -1 ? fallbackIndex : currentIndex) + step, 0), visibleJumpIds.length - 1);
  jumpTo(visibleJumpIds[nextIndex]);
}

function jumpTo(id) {
  const card = document.getElementById(`question-${id}`);
  if (!card) return;
  state.activeId = id;
  refreshActiveJumpNav();
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyVisibility() {
  state.questions.forEach((question) => {
    const card = document.getElementById(`question-${question.id}`);
    if (!card) return;
    const show = !state.bookmarksOnly || state.bookmarks.has(question.id);
    card.classList.toggle("is-hidden", !show);
  });
  const visibleIds = visibleQuestions().map(({ question }) => question.id);
  if (visibleIds.length && !visibleIds.includes(state.activeId)) {
    state.activeId = visibleIds[0];
  }
  updateJumpNav();
}

function renderQuiz() {
  updateProgress();
  els.btnSubmit.hidden = state.mode !== "test" || state.submitted;
  els.btnNextTimed.hidden = state.mode !== "timed" || state.submitted;
  els.timer.hidden = state.mode !== "timed" || state.submitted;
  els.jumpNav.hidden = state.mode === "timed";
  els.list.innerHTML = "";
  const questions = state.mode === "timed"
    ? state.questions.slice(state.timedIndex, state.timedIndex + 1)
    : state.questions;
  let previousSection = null;
  questions.forEach((question, index) => {
    const actualIndex = state.mode === "timed" ? state.timedIndex : index;
    if (question.section && question.section !== previousSection) {
      const heading = document.createElement("h2");
      heading.className = "question-section";
      heading.textContent = question.section;
      els.list.append(heading);
      previousSection = question.section;
    }
    const article = document.createElement("article");
    article.className = "card question-card";
    article.id = `question-${question.id}`;
    article.dataset.id = question.id;
    if (state.bookmarksOnly && !state.bookmarks.has(question.id)) {
      article.classList.add("is-hidden");
    }
    renderQuestionCard(article, question, actualIndex);
    els.list.append(article);
  });
  updateJumpNav();
  observeQuestions();
  if (state.mode === "timed" && !state.submitted) {
    els.btnNextTimed.textContent = state.timedIndex === state.questions.length - 1 ? "Finish" : "Next question";
    startTimedTimer();
  }
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

  if (question.type !== "reading") {
    const prompt = document.createElement("p");
    prompt.className = "prompt";
    appendContent(prompt, question.prompt);
    if (hasArabic(question.prompt)) {
      prompt.dir = "rtl";
      prompt.classList.add("dir-rtl");
    }
    article.append(prompt);
  }
  appendImages(article, question.image ?? question.images);

  if (question.type === "mcq" || question.type === "tf") renderSingleChoice(article, question, locked, result);
  if (question.type === "multi") renderMulti(article, question, locked, result);
  if (question.type === "match") renderMatch(article, question, locked, result);
  if (question.type === "writing") renderWriting(article, question, locked);
  if (question.type === "reading") renderReading(article, question);
  if (question.type === "numeric") renderNumeric(article, question, locked, result);
  if (isCodeQuestion(question)) renderCode(article, question, locked, result);

  if ((locked || state.submitted) && question.explanation) {
    const explanation = document.createElement("p");
    explanation.className = "explanation";
    const heading = document.createElement("strong");
    heading.textContent = "Explanation";
    explanation.append(heading);
    appendContent(explanation, question.explanation);
    appendImages(explanation, question.explanationImages, "answer-images");
    if (hasArabic(question.explanation)) {
      explanation.dir = "rtl";
      explanation.classList.add("dir-rtl");
    }
    article.append(explanation);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";
  if (state.mode === "practice" && !state.submitted && question.type !== "reading") {
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

function renderReading(host, question) {
  const reading = document.createElement("div");
  reading.className = "reading-text";
  reading.textContent = question.text || question.prompt || "";
  if (hasArabic(reading.textContent)) {
    reading.dir = "rtl";
    reading.classList.add("dir-rtl");
  }
  host.append(reading);
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
    const isExpected = Array.isArray(question.answer)
      ? question.answer.includes(originalIndex)
      : (question.acceptedAnswers ? question.acceptedAnswers.includes(originalIndex) : originalIndex === question.answer);
    if (isExpected) return "choice correct";
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
  const labelText = typeof label === "object" ? label.text ?? "" : label;
  if (hasArabic(labelText)) {
    row.dir = "rtl";
    row.classList.add("dir-rtl");
  }
  const input = document.createElement("input");
  input.type = type;
  input.name = name;
  input.checked = checked;
  input.disabled = disabled;
  input.addEventListener("change", onChange);
  const content = document.createElement("span");
  appendContent(content, label, "choice-images");
  row.append(input, content);
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
    appendContent(left, pair.left, "choice-images");
    if (hasArabic(typeof pair.left === "object" ? pair.left.text : pair.left)) {
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
      opt.textContent = typeof option.text === "object" ? option.text.text ?? "" : option.text;
      select.append(opt);
    });
    select.value = current[leftIndex] === "" || current[leftIndex] === undefined ? "" : String(current[leftIndex]);
    if (locked || state.submitted) {
      const selectedIndex = Number(current[leftIndex]);
      const opt = question.rightOptions?.find((o) => o.originalIndex === selectedIndex);
      const selectedText = matchValue(opt ? opt.text : (question.pairs[selectedIndex] ? question.pairs[selectedIndex].right : undefined));
      const expectedText = matchValue(pair.right);
      const ok = (selectedText !== undefined && selectedText === expectedText)
        || (Array.isArray(pair.acceptedMatches) && pair.acceptedMatches.includes(selectedText));
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
    const heading = document.createElement("strong");
    heading.textContent = "Model answer";
    model.append(heading);
    appendContent(model, question.modelAnswer);
    appendImages(model, question.modelAnswerImages ?? question.answerImages, "answer-images");
    if (hasArabic(question.modelAnswer)) {
      model.dir = "rtl";
      model.classList.add("dir-rtl");
    }
    host.append(model);
  }
}

function renderNumeric(host, question, locked, result) {
  const hint = document.createElement("p");
  hint.className = "writing-hint";
  hint.textContent = question.hint ?? "Enter a numeric value (e.g. 121.6).";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "numeric-answer";
  input.value = userAnswer(question) ?? "";
  input.placeholder = "Enter your answer...";
  input.disabled = locked || state.submitted;
  input.addEventListener("input", () => setUserAnswer(question, input.value));
  host.append(hint, input);

  if (locked || state.submitted) {
    input.classList.add(result && result.correct ? "correct" : "incorrect");
    const model = document.createElement("p");
    model.className = "model-answer";
    const ansDisplay = question.answerText ?? (Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers[0] : question.answer);
    model.innerHTML = `<strong>Correct answer:</strong> ${escapeHtml(ansDisplay)}`;
    host.append(model);
  }
}

function renderCode(host, question, locked, result) {
  const hint = document.createElement("p");
  hint.className = "writing-hint";
  hint.textContent = "Enter the correct code. Spaces and line breaks are ignored when checking your answer.";
  const area = document.createElement("textarea");
  area.className = "code-answer";
  area.value = userAnswer(question) ?? "";
  area.placeholder = "Write your code here...";
  area.setAttribute("autocapitalize", "off");
  area.setAttribute("autocorrect", "off");
  area.spellcheck = false;
  area.disabled = locked || state.submitted;
  area.addEventListener("input", () => setUserAnswer(question, area.value));
  host.append(hint, area);

  if (locked || state.submitted) {
    const model = document.createElement("p");
    model.className = "model-answer";
    model.innerHTML = `<strong>Correct code</strong>${escapeHtml(expectedCode(question))}`;
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
  refreshJumpNav();
}

function submitTest() {
  stopTimedTimer();
  state.submitted = true;
  state.score = computeScore();
  saveProgress();
  renderQuiz();
}

function startTimedTimer() {
  stopTimedTimer();
  state.timedSeconds = 20;
  updateTimer();
  state.timerId = window.setInterval(() => {
    state.timedSeconds -= 1;
    updateTimer();
    if (state.timedSeconds <= 0) nextTimedQuestion();
  }, 1000);
}

function stopTimedTimer() {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimer() {
  els.timer.textContent = `Time left: ${state.timedSeconds}s`;
  els.timer.classList.toggle("timer-warning", state.timedSeconds <= 5);
}

function nextTimedQuestion() {
  if (state.mode !== "timed" || state.submitted) return;
  if (state.timedIndex >= state.questions.length - 1) {
    submitTest();
    return;
  }
  state.timedIndex += 1;
  state.activeId = state.questions[state.timedIndex]?.id ?? null;
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
        refreshActiveJumpNav();
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
  if (els.jumpPrev) {
    els.jumpPrev.addEventListener("click", () => moveActiveQuestion(-1));
  }
  if (els.jumpNext) {
    els.jumpNext.addEventListener("click", () => moveActiveQuestion(1));
  }
  els.btnBack.addEventListener("click", () => {
    state.bank = null;
    renderHome();
  });
  els.btnSubmit.addEventListener("click", submitTest);
  els.btnNextTimed.addEventListener("click", nextTimedQuestion);
  els.manageFolders.addEventListener("click", () => {
    els.folderManager.hidden = false;
    renderFolderManager();
  });
  els.closeFolderManager.addEventListener("click", () => {
    els.folderManager.hidden = true;
  });
  els.addFolder.addEventListener("click", addFolder);
  els.feedbackButton.addEventListener("click", () => {
    els.feedback.hidden = false;
    renderFeedbackReview();
    els.feedbackMessage.focus();
  });
  els.closeFeedback.addEventListener("click", () => {
    els.feedback.hidden = true;
  });
  els.feedbackForm.addEventListener("submit", submitFeedback);
  els.feedbackFilter.addEventListener("change", renderFeedbackReview);
  els.exportFeedback.addEventListener("click", exportFeedback);
  if (els.btnExport) {
    els.btnExport.addEventListener("click", exportCurrentBank);
  }
  els.search.addEventListener("input", () => {
    state.searchTerm = els.search.value;
    renderHome();
  });
  els.createQuiz.addEventListener("click", () => {
    if (!state.user) {
      openAuth("login");
      return;
    }
    els.creator.hidden = false;
    els.admin.hidden = true;
    els.quizFormTitle.focus();
  });
  els.closeCreator.addEventListener("click", () => {
    els.creator.hidden = true;
  });
  els.quizForm.addEventListener("submit", submitQuiz);
  els.adminButton.addEventListener("click", () => {
    els.admin.hidden = false;
    els.creator.hidden = true;
    renderAdminDashboard();
  });
  els.closeAdmin.addEventListener("click", () => {
    els.admin.hidden = true;
  });
  els.authSubmit.addEventListener("click", submitAuth);
  els.authSwitch.addEventListener("click", () => openAuth(state.authMode === "login" ? "register" : "login"));
  els.authForm.addEventListener("submit", (event) => {
    if (event.submitter === els.authSubmit) {
      event.preventDefault();
      submitAuth();
    }
  });
  renderAccountBar();
}

async function init() {
  state.folders = loadFolderConfig();
  await loadAccountState();
  bindControls();
  try {
    await loadBanks();
    renderHome();
  } catch (error) {
    showHomeError(error.message || "Could not load banks.");
  }
}

init();
