// course.js（ver1.0β サンプル）
// data.json を読み込み、localStorage の selectedCourse に応じて
// 講座タイトル・説明・レッスン一覧・演習エディタを描画する。

const state = {
  courseId: null,
  course: null,
  lessonIndex: 0,
  pyodide: null, // Python実行環境（初回のみ読み込み）
};

const els = {
  title: document.getElementById("course-title"),
  description: document.getElementById("course-description"),
  lessonNav: document.getElementById("lesson-nav"),
  lessonTitle: document.getElementById("lesson-title"),
  explanation: document.getElementById("lesson-explanation"),
  editor: document.getElementById("code-editor"),
  runBtn: document.getElementById("run-btn"),
  resetBtn: document.getElementById("reset-btn"),
  preview: document.getElementById("preview-frame"),
  console: document.getElementById("console-output"),
  status: document.getElementById("run-status"),
};

init();

async function init() {
  state.courseId = localStorage.getItem("selectedCourse") || "html-css";

  let data;
  try {
    const res = await fetch("data.json");
    data = await res.json();
  } catch (err) {
    showFatalError("data.jsonの読み込みに失敗しました。ファイルが同じフォルダにあるか確認してください。");
    return;
  }

  state.course = data[state.courseId];
  if (!state.course) {
    showFatalError(`「${state.courseId}」という講座データが見つかりませんでした。`);
    return;
  }

  document.documentElement.style.setProperty("--accent", state.course.accent);
  els.title.textContent = state.course.title;
  els.description.textContent = state.course.description;

  renderLessonNav();
  loadLesson(0);

  els.runBtn.addEventListener("click", runCode);
  els.resetBtn.addEventListener("click", () => loadLesson(state.lessonIndex));
}

function renderLessonNav() {
  els.lessonNav.innerHTML = "";
  state.course.lessons.forEach((lesson, i) => {
    const btn = document.createElement("button");
    btn.className = "lesson-btn";
    btn.textContent = lesson.title;
    btn.addEventListener("click", () => loadLesson(i));
    els.lessonNav.appendChild(btn);
  });
  updateActiveLessonBtn();
}

function updateActiveLessonBtn() {
  [...els.lessonNav.children].forEach((btn, i) => {
    btn.classList.toggle("is-active", i === state.lessonIndex);
  });
}

function loadLesson(index) {
  state.lessonIndex = index;
  const lesson = state.course.lessons[index];
  els.lessonTitle.textContent = lesson.title;
  els.explanation.innerHTML = lesson.explanation;
  els.editor.value = lesson.starterCode;
  updateActiveLessonBtn();
  clearOutput();
}

function clearOutput() {
  els.console.textContent = "";
  els.console.hidden = true;
  els.preview.hidden = true;
  els.preview.srcdoc = "";
  setStatus("");
}

function setStatus(text, isError = false) {
  els.status.textContent = text;
  els.status.classList.toggle("is-error", isError);
}

async function runCode() {
  const code = els.editor.value;
  const runtime = state.course.runtime;

  if (runtime === "web") return runWeb(code);
  if (runtime === "typescript") return runTypeScript(code);
  if (runtime === "python") return runPython(code);
}

// --- HTML/CSS/JS: iframeにそのまま流し込んでプレビュー ---
function runWeb(code) {
  els.console.hidden = true;
  els.preview.hidden = false;
  setStatus("プレビューを更新しました");
  els.preview.srcdoc = code;
}

// --- TypeScript: 公式コンパイラ(typescript.js)をCDNから読み込み、JSに変換して実行 ---
let tsLibPromise = null;
function loadTypeScriptLib() {
  if (window.ts) return Promise.resolve();
  if (tsLibPromise) return tsLibPromise;
  tsLibPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/typescript@5.4.5/lib/typescript.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("TypeScriptコンパイラの読み込みに失敗しました"));
    document.head.appendChild(script);
  });
  return tsLibPromise;
}

async function runTypeScript(code) {
  els.preview.hidden = true;
  els.console.hidden = false;
  setStatus("TypeScriptを変換中…");
  try {
    await loadTypeScriptLib();
    const js = window.ts.transpile(code, { target: window.ts.ScriptTarget.ES2017 });
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(" "));
    try {
      new Function(js)();
    } finally {
      console.log = originalLog;
    }
    els.console.textContent = logs.length ? logs.join("\n") : "(出力はありません)";
    setStatus("実行しました");
  } catch (err) {
    els.console.textContent = String(err.message || err);
    setStatus("エラーが発生しました", true);
  }
}

// --- Python: Pyodideをブラウザ上に読み込んで実行（初回のみ数秒かかる） ---
let pyodidePromise = null;
function loadPyodideLib() {
  if (state.pyodide) return Promise.resolve(state.pyodide);
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js";
    script.onload = async () => {
      try {
        state.pyodide = await window.loadPyodide();
        resolve(state.pyodide);
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => reject(new Error("Python実行環境の読み込みに失敗しました"));
    document.head.appendChild(script);
  });
  return pyodidePromise;
}

async function runPython(code) {
  els.preview.hidden = true;
  els.console.hidden = false;
  setStatus("Python実行環境を準備中…（初回のみ時間がかかります）");
  try {
    const pyodide = await loadPyodideLib();
    setStatus("実行中…");
    pyodide.runPython(`
import sys, io
sys.stdout = io.StringIO()
    `);
    let errorMessage = null;
    try {
      pyodide.runPython(code);
    } catch (err) {
      errorMessage = String(err);
    }
    const stdout = pyodide.runPython("sys.stdout.getvalue()");
    els.console.textContent = errorMessage
      ? `${stdout}\n${errorMessage}`
      : stdout || "(出力はありません)";
    setStatus(errorMessage ? "エラーが発生しました" : "実行しました", Boolean(errorMessage));
  } catch (err) {
    els.console.textContent = String(err.message || err);
    setStatus("エラーが発生しました", true);
  }
}

function showFatalError(message) {
  els.title.textContent = "読み込みエラー";
  els.description.textContent = message;
  els.lessonNav.innerHTML = "";
  els.lessonTitle.textContent = "";
  els.explanation.textContent = "";
}
