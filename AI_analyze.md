# AI Questions Bank Website — Analysis

## Overview

A **static, single-page web application** that serves as a question bank for studying.  
It is deployed to **GitHub Pages** via a simple push-to-`main` workflow and requires **no build step or server** — just plain HTML, CSS, and vanilla JavaScript (ES modules).

---

## Architecture

```
index.html              ← Single HTML page (both home and quiz views)
css/style.css           ← All styling (dark-mode, responsive, RTL support)
js/app.js               ← Main application logic (ES module)
js/offline-export.js    ← Generates standalone downloadable HTML quiz files
data/banks.json         ← Registry of all quiz banks
data/*.json             ← Individual question bank files
questions_in_txt/       ← Source text files used to generate the JSON banks
.github/workflows/      ← GitHub Pages deployment (static.yml)
```

### How It Works

1. **Home view**: On load, `app.js` fetches `data/banks.json`, renders a list of bank buttons.
2. **Quiz view**: Clicking a bank fetches its JSON file, prepares the questions (optionally shuffling), and renders them as interactive cards.
3. **Two modes**:
   - **Practice** — per-question "Check" button reveals the answer immediately.
   - **Test** — answers are hidden until the user clicks "Submit", then all are scored at once.
4. **Offline export**: The "Download Interactive HTML" button generates a fully self-contained `.html` file with all questions and logic inlined — no server needed.

---

## File Statistics

| File | Lines | Size |
|---|---|---|
| `index.html` | 95 | 3.8 KB |
| `css/style.css` | 662 | 11.4 KB |
| `js/app.js` | 764 | 26.2 KB |
| `js/offline-export.js` | 418 | 18.8 KB |
| `data/banks.json` | 59 | 1.6 KB |
| **Total code** | **~1,998** | **~61.8 KB** |

---

## Question Banks

| Bank ID | Title | Questions | Types |
|---|---|---|---|
| `sample` | Sample mixed bank | 6 | mcq, tf, multi, match, writing |
| `iot-quiz` | IoT Quiz | 100 | mcq |
| `intro-dl` | Introduction to Deep Learning | 100 | mcq (50), tf (50) |
| `physics-test1` | Physics Test 1 | 150 | mcq (100), tf (50) |
| `alhaqiqa-al-murra` | الحقيقة المرة | 15 | mcq (9), tf (6) |
| `alhaqiqa-al-murra-2` | الحقيقة المرة — المقطع الثاني | 22 | mcq (17), tf (5) |
| `alhaqiqa-al-murra-3` | الحقيقة المرة — المقطع الثالث | 22 | mcq (17), tf (5) |
| `istifham-2-1` | أسلوب الاستفهام 2.1 | 18 | mcq (9), tf (9) |
| `linear-regression` | Linear Regression | 100 | mcq (50), tf (50) |
| `iot-ws4-ws5` | IoT WS4 & WS5 | 100 | mcq (50), tf (50) |
| `iris-perceptron-coding` | Iris + Perceptron Coding | 30 | writing (30) |
| **Total** | | **663** | |

### Question Type Distribution

| Type | Count | Description |
|---|---|---|
| `mcq` | 404 | Multiple-choice (single correct) |
| `tf` | 226 | True/False |
| `writing` | 31 | Free-text, self-graded against a model answer |
| `multi` | 1 | Multiple-choice (multiple correct) |
| `match` | 1 | Matching pairs |

---

## Supported Question Types

The JSON schema supports **five question types**:

1. **`mcq`** — Multiple-choice with a single correct answer (`answer` is an index).
2. **`tf`** — True/False (`answer` is `true` or `false`).
3. **`multi`** — Multiple-choice with multiple correct answers (`answer` is an array of indices).
4. **`match`** — Matching pairs (`pairs` array with `left`/`right` objects).
5. **`writing`** — Free-text response with `modelAnswer` and `explanation`, not auto-scored.

---

## Key Features

### UI & Design
- **Dark mode** with a polished color palette (CSS custom properties).
- **Bilingual support** — automatic Arabic/RTL detection (`hasArabic()` function) applies `dir="rtl"` and Arabic font stack.
- **Sticky jump navigation** sidebar — numbered buttons show answered/bookmarked/correct/incorrect state.
- **Bookmark system** — star any question, filter to bookmarks only, persisted in `localStorage`.
- **Monospace styling** for writing/code questions (textarea and model answer).

### Quiz Engine
- **Shuffle questions** and/or **shuffle choices** (toggles, persisted in `localStorage`).
- **Practice mode**: per-question "Check" with instant feedback and explanation.
- **Test mode**: hidden answers until "Submit", then full score with color-coded results.
- **IntersectionObserver** tracks which question is currently in the viewport to highlight the jump nav.
- **Grade computation** excludes writing questions from the numeric score.

### Offline Export
- Generates a **single self-contained HTML file** with all questions, styles, and JavaScript inlined.
- The exported file works completely offline — no server or internet needed.
- Includes the same Practice/Test modes, shuffle, bookmarks, and scoring.

### Deployment
- **GitHub Pages** via `actions/deploy-pages@v5`.
- Simple push-to-`main` triggers deployment — no build step needed.
- The entire repository root is deployed as-is.

---

## Design Patterns

| Pattern | Implementation |
|---|---|
| State management | Single `state` object with reactive render functions |
| View routing | Two `<main>` elements toggled via `hidden` attribute |
| Data loading | `fetch()` for JSON files, no bundler or framework |
| Persistence | `localStorage` for mode, shuffle, bookmarks preferences |
| Choice shuffling | Fisher-Yates shuffle, maintains original-index mapping for grading |
| XSS prevention | `escapeHtml()` used when inserting user/data content into the DOM |
| RTL support | Runtime detection via Arabic Unicode range regex |
| Accessibility | `aria-pressed` on bookmarks, `aria-label` on nav, `.sr-only` class |

---

## Strengths

- **Zero dependencies** — no npm, no bundler, no framework. Deploys instantly.
- **Clean data/code separation** — adding a new quiz only requires a JSON file + one line in `banks.json`.
- **Full offline support** — the export feature creates genuinely useful standalone study files.
- **Bilingual by design** — Arabic content works seamlessly alongside English.
- **Well-organized CSS** — custom properties, consistent naming, responsive layout.
- **Comprehensive question type support** — five distinct types cover most exam formats.

## Potential Improvements

- **No answer persistence** — refreshing the page loses all user answers (only bookmarks and preferences are saved).
- **No search or filtering by topic** — with 663+ questions, finding specific topics requires scrolling.
- **No progress tracking across sessions** — no way to see which banks have been completed.
- **No keyboard navigation** — arrow keys don't move between questions.
- **Duplicate `.quiz-content` rule** in `style.css` (lines 225–228 and 248–252).
- **No `<meta description>`** or Open Graph tags in `index.html` for SEO/sharing.
- **`questions_in_txt/` uploaded to production** — these source files are deployed to GitHub Pages unnecessarily (the workflow uploads the entire repo root).
- **No error boundary** — if a single question JSON is malformed, the entire bank fails to load.
- **Offline export duplicates logic** — `offline-export.js` re-implements grading, rendering, and shuffle instead of sharing code with `app.js`.
