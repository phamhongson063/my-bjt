import { firebaseConfig } from "../../firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const params = new URLSearchParams(location.search);
const lessonId = params.get("id");

const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const lessonContent = document.getElementById("lessonContent");
const loginRequired = document.getElementById("loginRequired");
const userBar = document.getElementById("userBar");
const userEmailEl = document.getElementById("userEmail");
const completeArea = document.getElementById("completeArea");
const completeBtn = document.getElementById("completeBtn");
const completeStatus = document.getElementById("completeStatus");

let currentUser = null;
let currentLesson = null;
let quizScores = { correct: 0, total: 0 };

// ========== Font size (localStorage) ==========
const FONT_SIZE_KEY = "bjt-font-size";
const VALID_FONT_SIZES = ["14", "16", "18", "20"];

function applyFontSize(px) {
  document.documentElement.style.setProperty("--base-size", px + "px");
}

const savedFontSize = localStorage.getItem(FONT_SIZE_KEY);
if (savedFontSize && VALID_FONT_SIZES.includes(savedFontSize)) {
  applyFontSize(savedFontSize);
  document.getElementById("fontSize").value = savedFontSize;
}
document.getElementById("fontSize").addEventListener("change", (e) => {
  applyFontSize(e.target.value);
  localStorage.setItem(FONT_SIZE_KEY, e.target.value);
});

// ========== Exam mode (hide VN hints) ==========
const EXAM_MODE_KEY = "bjt-exam-mode";
function applyExamMode(on) {
  document.body.classList.toggle("exam-mode", on);
}
const savedExamMode = localStorage.getItem(EXAM_MODE_KEY) === "1";
document.getElementById("examMode").checked = savedExamMode;
applyExamMode(savedExamMode);
document.getElementById("examMode").addEventListener("change", (e) => {
  applyExamMode(e.target.checked);
  localStorage.setItem(EXAM_MODE_KEY, e.target.checked ? "1" : "0");
});

// ========== Explanation language (VN / JP / both) ==========
const EXPLAIN_LANG_KEY = "bjt-explain-lang";
const VALID_LANGS = ["vi", "jp", "both"];
function applyExplainLang(lang) {
  document.body.classList.remove("lang-vi", "lang-jp", "lang-both");
  document.body.classList.add("lang-" + lang);
}
const savedLang = VALID_LANGS.includes(localStorage.getItem(EXPLAIN_LANG_KEY))
  ? localStorage.getItem(EXPLAIN_LANG_KEY)
  : "vi";
document.getElementById("explainLang").value = savedLang;
applyExplainLang(savedLang);
document.getElementById("explainLang").addEventListener("change", (e) => {
  applyExplainLang(e.target.value);
  localStorage.setItem(EXPLAIN_LANG_KEY, e.target.value);
});

// Helper: bilingual block. If jp missing, fall back to vi in JP mode.
function bilingual(vi, jp) {
  const vi_ = vi || "";
  const jp_ = jp || vi || "";
  return `<span class="explain-vi">${vi_}</span><span class="explain-jp">${jp_}</span>`;
}

// ========== TTS ==========
const TTS_RATE_KEY = "bjt-tts-rate";
const TTS_VOICE_KEY = "bjt-tts-voice-name";

let ttsRate = 0.95;
let selectedVoice = null;
let availableVoices = [];
const ttsSupported = "speechSynthesis" in window;

const savedRateStr = localStorage.getItem(TTS_RATE_KEY);
if (savedRateStr !== null) {
  const parsed = parseFloat(savedRateStr);
  if (!isNaN(parsed)) ttsRate = parsed;
}
const savedVoiceName = localStorage.getItem(TTS_VOICE_KEY);

function escAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

// Furigana: "{漢字|かな}" → <ruby>漢字<rt>かな</rt></ruby>. Phần text khác giữ nguyên.
function furi(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{([^|{}]+)\|([^|{}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>");
}

function loadVoices() {
  if (!ttsSupported) return;
  const all = speechSynthesis.getVoices();
  availableVoices = all.filter((v) => v.lang.startsWith("ja"));
  const select = document.getElementById("ttsVoice");
  const status = document.getElementById("ttsStatus");
  if (availableVoices.length === 0) {
    select.innerHTML = "<option>Không có giọng JP</option>";
    status.textContent = "⚠️ Trình duyệt/OS không có giọng tiếng Nhật.";
    status.classList.add("no-tts");
    return;
  }
  select.innerHTML = availableVoices
    .map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`)
    .join("");
  let initialIdx = 0;
  if (savedVoiceName) {
    const foundIdx = availableVoices.findIndex(
      (v) => v.name === savedVoiceName
    );
    if (foundIdx >= 0) initialIdx = foundIdx;
  }
  selectedVoice = availableVoices[initialIdx];
  select.value = String(initialIdx);
  status.textContent = "";
}

function speak(text) {
  if (!ttsSupported || !text) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = ttsRate;
  if (selectedVoice) utter.voice = selectedVoice;
  speechSynthesis.speak(utter);
}

let segmentAudio = null;
function playSegment(src, start, end) {
  if (segmentAudio) {
    segmentAudio.pause();
    segmentAudio = null;
  }
  const a = new Audio(src);
  a.currentTime = start;
  const onTick = () => {
    if (a.currentTime >= end) {
      a.pause();
      a.removeEventListener("timeupdate", onTick);
    }
  };
  a.addEventListener("timeupdate", onTick);
  a.play();
  segmentAudio = a;
}

if (ttsSupported) {
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
  const rateSelect = document.getElementById("ttsRate");
  if (savedRateStr !== null) {
    rateSelect.value = savedRateStr;
    if (rateSelect.value === "") {
      rateSelect.value = "0.95";
      ttsRate = 0.95;
    }
  }
  rateSelect.addEventListener("change", (e) => {
    ttsRate = parseFloat(e.target.value);
    localStorage.setItem(TTS_RATE_KEY, e.target.value);
  });
  document.getElementById("ttsVoice").addEventListener("change", (e) => {
    const idx = parseInt(e.target.value);
    if (!isNaN(idx) && availableVoices[idx]) {
      selectedVoice = availableVoices[idx];
      localStorage.setItem(TTS_VOICE_KEY, selectedVoice.name);
    }
  });
  document
    .getElementById("stopAudioBtn")
    .addEventListener("click", () => speechSynthesis.cancel());
} else {
  const settingsBar = document.getElementById("settingsBar");
  settingsBar
    .querySelectorAll(
      "label:not(:first-of-type), #stopAudioBtn, .group-label:nth-of-type(2)"
    )
    .forEach((el) => (el.style.display = "none"));
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".speak-btn");
  if (btn && btn.dataset.text) {
    speak(btn.dataset.text);
  }
});

// ========== Study Timer (smart activity tracking) ==========
// State lives in RAM + Firestore only — no localStorage cache.
// Tracking is OFF by default; user toggles via the FAB, state syncs across devices.
const IDLE_THRESHOLD_MS = 60 * 1000;
const MAX_TICK_DELTA_MS = 5 * 1000;

function todayDateKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatStudyTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const lessonTimes = {};
const dailyTimes = {};
const lessonTimesMeta = {};
let lastActivityAt = Date.now();
let lastTickAt = Date.now();
let studyTimerStarted = false;
let userPaused = true; // default OFF — pullUserPreferences may flip to ON if user previously enabled
let prefsPulled = false; // true after global preferences (pauseTracking) pulled from Firestore
let pullPending = false; // true while initial Firestore pull is in progress
let authStateResolved = false; // true once we know whether user is logged in

// Safety: if auth never resolves (Firebase broken/offline), unblock tick after 10s
setTimeout(() => {
  if (!authStateResolved) {
    authStateResolved = true;
    pullPending = false;
  }
}, 10000);

function renderStudyTime(isActive) {
  const timeEl = document.getElementById("studyTimeDisplay");
  const statusEl = document.getElementById("studyStatus");
  if (!timeEl) return;
  timeEl.textContent = formatStudyTime(lessonTimes[lessonId] || 0);
  if (statusEl) {
    if (pullPending || !authStateResolved) {
      statusEl.textContent = "⟳ Đang đồng bộ...";
      statusEl.className = "study-paused";
    } else if (userPaused) {
      statusEl.textContent = "🛑 Tạm dừng (tự bạn)";
      statusEl.className = "study-user-paused";
    } else if (document.hidden) {
      statusEl.textContent = "◌ Tab ẩn (pause)";
      statusEl.className = "study-paused";
    } else if (isActive) {
      statusEl.textContent = "● Đang học";
      statusEl.className = "study-active";
    } else {
      statusEl.textContent = "◌ Không thao tác (pause)";
      statusEl.className = "study-paused";
    }
  }
}

// Firestore sync (throttled to save free-tier quota)
const FIRESTORE_SYNC_INTERVAL_MS = 3 * 60 * 1000;
let lastFirestoreSyncAt = 0;
let firestoreSyncInFlight = false;
let pulledFromFirestore = false;

async function syncStudyTimeToFirestore(force = false) {
  if (!currentUser || !lessonId || firestoreSyncInFlight) return;
  if (!force && Date.now() - lastFirestoreSyncAt < FIRESTORE_SYNC_INTERVAL_MS)
    return;
  firestoreSyncInFlight = true;
  lastFirestoreSyncAt = Date.now();
  try {
    const totalMs = lessonTimes[lessonId] || 0;
    const today = todayDateKey();
    const dailyMs = (dailyTimes[today] && dailyTimes[today][lessonId]) || 0;
    const localUpdatedAt =
      (lessonTimesMeta[lessonId] && lessonTimesMeta[lessonId].localUpdatedAt) ||
      0;
    const totalsRef = doc(
      db,
      "users",
      currentUser.uid,
      "study-totals",
      lessonId
    );
    const dailyRef = doc(
      db,
      "users",
      currentUser.uid,
      "study-daily",
      `${today}_${lessonId}`
    );
    await Promise.all([
      setDoc(totalsRef, {
        lessonId,
        totalMs,
        localUpdatedAt,
        updatedAt: serverTimestamp(),
      }),
      setDoc(dailyRef, {
        lessonId,
        date: today,
        activeMs: dailyMs,
        updatedAt: serverTimestamp(),
      }),
    ]);
  } catch (err) {
    console.warn("Firestore sync failed:", err);
  } finally {
    firestoreSyncInFlight = false;
  }
}

function updatePauseFab() {
  const fab = document.getElementById("pauseToggle");
  if (!fab) return;
  fab.classList.toggle("paused", userPaused);
  fab.setAttribute("aria-pressed", userPaused ? "true" : "false");
  fab.title = userPaused
    ? "Đang tạm dừng — nhấn để tiếp tục"
    : "Tạm dừng tính giờ (toàn cục)";
}

// Global user preferences (currently: pauseTracking). Stored at users/{uid}/settings/preferences
// — applies to ALL lessons, so toggling pause on L01 also pauses L02, L03... and persists cross-device.
async function pullUserPreferences() {
  if (!currentUser || prefsPulled) return;
  prefsPulled = true;
  try {
    const ref = doc(db, "users", currentUser.uid, "settings", "preferences");
    const snap = await getDoc(ref);
    if (snap.exists() && typeof snap.data().pauseTracking === "boolean") {
      userPaused = snap.data().pauseTracking;
    }
    // else: no remote pref yet — keep default (userPaused = true / OFF)
    updatePauseFab();
    renderStudyTime(
      !document.hidden && Date.now() - lastActivityAt < IDLE_THRESHOLD_MS
    );
  } catch (err) {
    console.warn("Preferences pull failed:", err);
  }
}

async function pushUserPreferences() {
  if (!currentUser) return;
  try {
    const ref = doc(db, "users", currentUser.uid, "settings", "preferences");
    await setDoc(
      ref,
      { pauseTracking: userPaused, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.warn("Preferences push failed:", err);
  }
}

async function pullStudyTimeFromFirestore() {
  if (!currentUser || !lessonId || pulledFromFirestore) return;
  pulledFromFirestore = true;
  pullPending = true;
  try {
    const today = todayDateKey();
    const totalsRef = doc(
      db,
      "users",
      currentUser.uid,
      "study-totals",
      lessonId
    );
    const dailyRef = doc(
      db,
      "users",
      currentUser.uid,
      "study-daily",
      `${today}_${lessonId}`
    );
    const [totalsSnap, dailySnap] = await Promise.all([
      getDoc(totalsRef),
      getDoc(dailyRef),
    ]);
    if (totalsSnap.exists()) {
      const data = totalsSnap.data();
      lessonTimes[lessonId] = data.totalMs || 0;
      lessonTimesMeta[lessonId] = {
        localUpdatedAt: data.localUpdatedAt || 0,
      };
    }
    if (dailySnap.exists()) {
      const remoteDaily = dailySnap.data().activeMs || 0;
      if (!dailyTimes[today]) dailyTimes[today] = {};
      dailyTimes[today][lessonId] = remoteDaily;
    }
    renderStudyTime(!document.hidden);
  } catch (err) {
    console.warn("Firestore pull failed:", err);
  } finally {
    pullPending = false;
  }
}

// ========== Reading position sync ==========
// Manual save: user clicks bookmark FAB to save current scrollY.
// Restore: auto on lesson load if user logged in and a saved position exists.
let lessonRendered = false;
let readingPosRestored = false;

async function saveReadingPosition() {
  if (!currentUser) {
    showCopyFlash("⚠️ Cần đăng nhập để lưu");
    return;
  }
  if (!lessonId || !lessonRendered) return;
  try {
    const ref = doc(db, "users", currentUser.uid, "reading-position", lessonId);
    await setDoc(ref, {
      lessonId,
      scrollY: Math.round(window.scrollY),
      updatedAt: serverTimestamp(),
    });
    showCopyFlash("🔖 Đã lưu vị trí");
  } catch (err) {
    console.warn("Reading position save failed:", err);
    showCopyFlash("⚠️ Lưu vị trí thất bại");
  }
}

async function restoreReadingPosition() {
  if (!currentUser || !lessonId || !lessonRendered || readingPosRestored)
    return;
  readingPosRestored = true;
  try {
    const ref = doc(db, "users", currentUser.uid, "reading-position", lessonId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const y = data.scrollY;
    if (typeof y !== "number" || y <= 0) return;
    setTimeout(() => window.scrollTo({ top: y, behavior: "smooth" }), 300);
  } catch (err) {
    console.warn("Reading position restore failed:", err);
  }
}

function studyTick() {
  const now = Date.now();
  const idleFor = now - lastActivityAt;
  const delta = now - lastTickAt;
  lastTickAt = now;

  const tabVisible = !document.hidden;
  const notIdle = idleFor < IDLE_THRESHOLD_MS;
  const sane = delta < MAX_TICK_DELTA_MS;
  const isActive = tabVisible && notIdle && sane && !userPaused;
  // Gate accumulation until initial Firestore pull resolves so cross-device edits aren't clobbered
  const canAccumulate = isActive && authStateResolved && !pullPending;

  if (canAccumulate && lessonId) {
    lessonTimes[lessonId] = (lessonTimes[lessonId] || 0) + delta;
    lessonTimesMeta[lessonId] = { localUpdatedAt: Date.now() };
    const today = todayDateKey();
    if (!dailyTimes[today]) dailyTimes[today] = {};
    dailyTimes[today][lessonId] = (dailyTimes[today][lessonId] || 0) + delta;
  }

  if (isActive) syncStudyTimeToFirestore(); // throttled to every 3 min

  renderStudyTime(tabVisible && notIdle);
}

function startStudyTimer() {
  if (studyTimerStarted || !lessonId) return;
  studyTimerStarted = true;

  // userPaused starts OFF (true); pullUserPreferences() may flip it to ON.
  updatePauseFab();
  const pauseFab = document.getElementById("pauseToggle");
  if (pauseFab) {
    pauseFab.addEventListener("click", () => {
      userPaused = !userPaused;
      updatePauseFab();
      pushUserPreferences();
      lastTickAt = Date.now();
      renderStudyTime(
        !document.hidden && Date.now() - lastActivityAt < IDLE_THRESHOLD_MS
      );
    });
  }

  const events = [
    "mousemove",
    "mousedown",
    "click",
    "keydown",
    "scroll",
    "touchstart",
  ];
  events.forEach((ev) => {
    window.addEventListener(
      ev,
      () => {
        lastActivityAt = Date.now();
      },
      { passive: true }
    );
  });

  // Flush time + force-OFF whenever the tab becomes hidden or unloads.
  // User must re-enable tracking manually when they return.
  const autoOff = () => {
    syncStudyTimeToFirestore(true);
    if (!userPaused) {
      userPaused = true;
      updatePauseFab();
      pushUserPreferences();
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      autoOff();
    } else {
      lastActivityAt = Date.now();
      lastTickAt = Date.now();
      renderStudyTime(true);
    }
  });

  window.addEventListener("beforeunload", autoOff);
  window.addEventListener("pagehide", autoOff);

  lastActivityAt = Date.now();
  lastTickAt = Date.now();
  setInterval(studyTick, 1000);
  renderStudyTime(true);
}

// ========== Lesson rendering ==========
if (!lessonId) {
  loadingEl.classList.add("hidden");
  errorEl.textContent = "Thiếu lesson ID. Quay lại trang chủ.";
  errorEl.classList.remove("hidden");
} else {
  startStudyTimer();
  loadLesson(lessonId);
}

const savePosFab = document.getElementById("savePosFab");
if (savePosFab) {
  savePosFab.addEventListener("click", saveReadingPosition);
}

async function loadLesson(id) {
  try {
    const res = await fetch(`lessons/${id}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    currentLesson = await res.json();
    renderLesson(currentLesson);
    loadingEl.classList.add("hidden");
    lessonContent.classList.remove("hidden");
  } catch (err) {
    loadingEl.classList.add("hidden");
    errorEl.textContent = `Không tải được bài học "${id}": ${err.message}`;
    errorEl.classList.remove("hidden");
  }
}

function shuffleQuestionOptions(q) {
  if (!q.options || q.options.length < 2) return;
  const items = q.options.map((opt, i) => ({ opt, orig: i }));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  q.options = items.map((x) => x.opt);
  q.answer = items.findIndex((x) => x.orig === q.answer);
}

function shuffleLessonOptions(lesson) {
  lesson.sections.forEach((section) => {
    if (
      (section.type === "quiz" || section.type === "reading") &&
      section.questions
    ) {
      section.questions.forEach(shuffleQuestionOptions);
    }
  });
}

function renderLesson(lesson) {
  document.title = `BJT - ${lesson.title}`;
  document.getElementById("lessonTitle").textContent = lesson.title;
  document.getElementById("lessonTitleVi").textContent = lesson.titleVi;
  document.getElementById(
    "lessonMeta"
  ).textContent = `${lesson.phase} · ${lesson.estimatedMinutes} phút · ${lesson.level}`;
  document.getElementById("lessonIntro").innerHTML = bilingual(
    lesson.intro,
    lesson.intro_jp
  );

  shuffleLessonOptions(lesson);

  const container = document.getElementById("sectionsContainer");
  container.innerHTML = "";
  lessonRendered = false;
  lesson.sections.forEach((section, idx) => {
    const el = renderSection(section, idx);
    container.appendChild(el);
  });

  buildTocMenu(lesson);
  completeArea.classList.remove("hidden");
  lessonRendered = true;
  restoreReadingPosition();
}

// Group consecutive sections by macro type so the TOC shows only top-level
// book divisions (vd L02: できますか / 敬語で言ってみましょう / 練習しましょう / Tổng kết).
const TOC_MACRO = {
  dialogue: { label: "💬 Hội thoại", priority: 1 },
  vocab: { label: "📖 Học mẫu", priority: 2 },
  grammar: { label: "📚 Học mẫu", priority: 2 },
  verbtable: { label: "📖 Tra cứu", priority: 2 },
  reading: { label: "📰 Đọc hiểu", priority: 3 },
  quiz: { label: "✏️ Luyện tập", priority: 4 },
  roleplay: { label: "🎭 Đóng vai", priority: 5 },
  tips: { label: "💡 Ghi chú", priority: 5 },
};

function shortenSectionTitle(t) {
  return (t || "").replace(/\s*\((?:trang|Track)[^)]*\)\s*$/i, "").trim();
}

function buildTocMenu(lesson) {
  const toc = document.getElementById("lessonToc");
  const list = document.getElementById("tocList");
  if (!toc || !list) return;

  const groups = [];
  let cur = null;
  lesson.sections.forEach((section, idx) => {
    const macro = TOC_MACRO[section.type] || {
      label: section.title,
      priority: 99,
    };
    if (cur && cur.priority === macro.priority) {
      cur.count++;
    } else {
      cur = {
        label: macro.label,
        priority: macro.priority,
        startIdx: idx,
        count: 1,
      };
      groups.push(cur);
    }
  });

  list.innerHTML = "";
  groups.forEach((g) => {
    const item = document.createElement("a");
    item.href = `#section-${g.startIdx}`;
    item.className = "toc-item";
    // 1 section → dùng title gốc (rút gọn); nhiều section cùng loại → macro label + count
    item.textContent =
      g.count === 1
        ? shortenSectionTitle(lesson.sections[g.startIdx].title)
        : `${g.label} (${g.count} mục)`;
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById(`section-${g.startIdx}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      collapseToc();
    });
    list.appendChild(item);
  });
  toc.classList.remove("hidden");
}

function expandToc() {
  const toc = document.getElementById("lessonToc");
  const btn = document.getElementById("tocToggle");
  toc.classList.add("expanded");
  if (btn) btn.setAttribute("aria-expanded", "true");
}
function collapseToc() {
  const toc = document.getElementById("lessonToc");
  const btn = document.getElementById("tocToggle");
  toc.classList.remove("expanded");
  if (btn) btn.setAttribute("aria-expanded", "false");
}
document.getElementById("tocToggle").addEventListener("click", (e) => {
  e.stopPropagation();
  const toc = document.getElementById("lessonToc");
  if (toc.classList.contains("expanded")) collapseToc();
  else expandToc();
});
document.addEventListener("click", (e) => {
  const toc = document.getElementById("lessonToc");
  if (!toc.contains(e.target) && toc.classList.contains("expanded"))
    collapseToc();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") collapseToc();
});

function renderSection(section, idx) {
  const div = document.createElement("div");
  div.className = "section";
  div.id = `section-${idx}`;
  const h2 = document.createElement("h2");
  h2.textContent = section.title;
  div.appendChild(h2);

  if (section.image && section.type !== "dialogue") {
    const img = document.createElement("img");
    img.src = section.image;
    img.alt = section.imageAlt || section.title;
    img.className = "section-image";
    img.loading = "lazy";
    div.appendChild(img);
    if (section.imageCaption) {
      const cap = document.createElement("div");
      cap.className = "section-image-caption";
      cap.textContent = section.imageCaption;
      div.appendChild(cap);
    }
  }

  if (section.intro || section.intro_jp) {
    const introDiv = document.createElement("div");
    introDiv.className = "section-intro";
    introDiv.innerHTML = bilingual(section.intro, section.intro_jp);
    div.appendChild(introDiv);
  }

  if (section.audio) {
    // Nếu đã chia nhỏ audio thành segment cho từng câu (audioStart/audioEnd),
    // không render player tổng nữa — user click trực tiếp từng câu để play segment.
    const hasSegments =
      Array.isArray(section.questions) &&
      section.questions.some((q) => q.audioStart != null && q.audioEnd != null);
    if (!hasSegments) {
      const audioWrap = document.createElement("div");
      audioWrap.className = "section-audio-wrap";
      const label = section.audioLabel || "Audio";
      audioWrap.innerHTML = `<div class="section-audio-label">🎧 ${label}</div><audio controls preload="metadata" src="${section.audio}" class="section-audio"></audio>`;
      div.appendChild(audioWrap);
    }
    div.classList.add("has-audio");
  }

  switch (section.type) {
    case "vocab":
      div.appendChild(renderVocab(section));
      break;
    case "grammar":
      div.appendChild(renderGrammar(section));
      break;
    case "dialogue": {
      const card = renderDialogue(section);
      if (section.image) {
        // Ảnh nằm NGOÀI khung message: thẻ trái 75% + ảnh phải 25% (sticky).
        const outer = document.createElement("div");
        outer.className = "dlg-outer";
        const aside = document.createElement("aside");
        aside.className = "dlg-aside";
        aside.innerHTML = buildDlgFigure(section);
        outer.appendChild(card);
        outer.appendChild(aside);
        div.appendChild(outer);
      } else {
        div.appendChild(card);
      }
      // Cụm trọng tâm + ghi chú: NGOÀI khung message, full width bên dưới.
      const extra = buildDlgExtra(section);
      if (extra) {
        const extraEl = document.createElement("div");
        extraEl.className = "dlg-extra";
        extraEl.innerHTML = extra;
        div.appendChild(extraEl);
      }
      break;
    }
    case "reading":
      div.appendChild(renderReading(section, idx));
      break;
    case "quiz":
      div.appendChild(renderQuiz(section, idx));
      break;
    case "tips":
      div.appendChild(renderTips(section));
      break;
    case "roleplay":
      div.appendChild(renderRoleplay(section));
      break;
    case "exercise":
      div.appendChild(renderExercise(section));
      break;
    case "verbtable":
      div.appendChild(renderVerbTable(section));
      break;
  }
  return div;
}

function renderVocab(section) {
  const wrap = document.createElement("div");
  wrap.className = "vocab";
  section.items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "vocab-card";
    const hasSegment =
      item.audio && item.audioStart != null && item.audioEnd != null;
    const jpHtml = hasSegment
      ? `<span class="jp jp-clickable" title="Nghe đoạn audio sách">${item.jp} <span class="seg-icon">🎧</span></span>`
      : `${item.jp} <button class="speak-btn" data-text="${escAttr(
          item.jp
        )}" title="Nghe">🔊</button>`;
    card.innerHTML = `
          <div class="vocab-jp-row">
            <div class="jp">${jpHtml}</div>
            <div class="kana">${item.kana || ""}</div>
          </div>
          <div class="vocab-meaning">
            ${
              item.image
                ? `<img src="${item.image}" alt="${escAttr(
                    item.jp
                  )}" class="vocab-item-image" loading="lazy">`
                : ""
            }
            <div><b>${item.vi}</b></div>
            ${
              item.note || item.note_jp
                ? `<div class="note">${bilingual(
                    item.note,
                    item.note_jp
                  )}</div>`
                : ""
            }
            ${
              item.exampleJp
                ? `<div class="example"><b>例:</b> ${
                    item.exampleJp
                  } <button class="speak-btn" data-text="${escAttr(
                    item.exampleJp
                  )}" title="Nghe ví dụ">🔊</button><br><i>${
                    item.exampleVi || ""
                  }</i></div>`
                : ""
            }
          </div>`;
    if (hasSegment) {
      card.querySelector(".jp-clickable").addEventListener("click", () => {
        playSegment(item.audio, item.audioStart, item.audioEnd);
      });
    }
    wrap.appendChild(card);
  });
  return wrap;
}

function renderGrammar(section) {
  const wrap = document.createElement("div");
  section.items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "grammar-item";
    const examplesHtml = (item.examples || [])
      .map(
        (e) =>
          `<li><b>${e.jp}</b> <button class="speak-btn" data-text="${escAttr(
            e.jp
          )}" title="Nghe">🔊</button><br><span style="color:#666;font-size:0.85em;">${
            e.vi
          }</span></li>`
      )
      .join("");
    const warningHtml =
      item.warning || item.warning_jp
        ? `<div class="warning">${bilingual(
            item.warning,
            item.warning_jp
          )}</div>`
        : "";
    div.innerHTML = `
          <div class="pattern">${item.pattern}</div>
          <div class="pattern-vi explain-vi">${item.patternVi || ""}</div>
          <div class="explanation">${bilingual(
            item.explanation,
            item.explanation_jp
          )}</div>
          ${warningHtml}
          <ul>${examplesHtml}</ul>`;
    wrap.appendChild(div);
  });
  return wrap;
}

function showCopyFlash(msg) {
  let el = document.getElementById("dlgCopyFlash");
  if (!el) {
    el = document.createElement("div");
    el.id = "dlgCopyFlash";
    el.className = "dlg-copy-flash";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1400);
}

async function copyJp(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    showCopyFlash("✓ Đã copy");
  } catch (err) {
    showCopyFlash("⚠️ Copy thất bại");
  }
}

// Ảnh minh hoạ của hội thoại — đặt NGOÀI khung message (cột phải 25%).
function buildDlgFigure(section) {
  if (!section.image) return "";
  return `
        <figure class="dlg-figure">
          <a href="${section.image}" target="_blank" rel="noopener">
            <img src="${section.image}" alt="${escAttr(
    section.imageAlt || section.title || ""
  )}" loading="lazy">
          </a>
          ${
            section.imageCaption
              ? `<figcaption>${section.imageCaption}</figcaption>`
              : ""
          }
        </figure>`;
}

// Cụm trọng tâm + ghi chú của hội thoại — đặt NGOÀI khung message (full width bên dưới).
function buildDlgExtra(section) {
  const highlight = section.vocabHighlight
    ? `<div class="vocab-highlight">
          <b>📝 Cụm trọng tâm:</b>
          <ul>${section.vocabHighlight
            .map((v) => `<li>${v}</li>`)
            .join("")}</ul>
        </div>`
    : "";
  const note =
    section.note || section.note_jp
      ? `<div class="dialogue-note">${bilingual(
          section.note,
          section.note_jp
        )}</div>`
      : "";
  return highlight + note;
}

function renderDialogue(section) {
  const div = document.createElement("div");
  div.className = "dialogue";
  const linesHtml = section.lines
    .map((line, idx) => {
      const speaker = line.speaker || "";
      const isMain = /アレックス|alex/i.test(speaker);
      const isNarrator = speaker === "—" || speaker === "-" || speaker === "";
      const isWarning = /^✗|間違い/.test(speaker);
      const side = isWarning
        ? "left warning"
        : isNarrator
        ? "narrator"
        : isMain
        ? "right"
        : "left";
      const avatar = isWarning
        ? "⚠️"
        : isNarrator
        ? "📖"
        : isMain
        ? '<img src="images/common/alex.jpg" alt="Alex" class="dlg-avatar-img" loading="lazy">'
        : speaker.includes("妻")
        ? "👩"
        : speaker.includes("部長") ||
          speaker.includes("課長") ||
          speaker.includes("社長")
        ? "👨‍💼"
        : speaker.includes("取引") || speaker.includes("電話")
        ? "☎️"
        : "👤";
      return `<div class="dlg-row ${side}">
          <div class="dlg-avatar">${avatar}</div>
          <div class="dlg-bubble-wrap">
            <div class="dlg-speaker">${speaker}</div>
            <div class="dlg-bubble">
              <div class="dlg-jp" data-copy="${escAttr(line.jp)}">${
        line.jp
      }</div>
              <div class="dlg-vi">${line.vi}</div>
            </div>
          </div>
        </div>`;
    })
    .join("");
  div.innerHTML = `
        <div class="dialogue-header">
          <div class="dlg-dots"><span></span><span></span><span></span></div>
          <div class="dlg-title">💬 会話 — Hội thoại</div>
          <div style="width:42px"></div>
        </div>
        <div class="dialogue-body">
          <div class="scene">📍 ${section.scene}</div>
          <div class="dialogue-toolbar">
            <button class="dlg-toggle-vi" type="button">📖 Hiện bản dịch</button>
          </div>
          ${linesHtml}
        </div>`;
  const toggleBtn = div.querySelector(".dlg-toggle-vi");
  toggleBtn.addEventListener("click", () => {
    const on = div.classList.toggle("show-all-vi");
    toggleBtn.classList.toggle("active", on);
    toggleBtn.textContent = on ? "📖 Ẩn bản dịch" : "📖 Hiện bản dịch";
  });
  div.querySelectorAll(".dlg-jp[data-copy]").forEach((el) => {
    el.addEventListener("click", () => {
      copyJp(el.getAttribute("data-copy"));
      el.closest(".dlg-bubble").classList.toggle("show-vi");
    });
  });
  return div;
}

function renderReading(section, sectionIdx) {
  const wrap = document.createElement("div");
  const toggleId = `toggle-${sectionIdx}`;
  const viId = `vi-${sectionIdx}`;
  wrap.innerHTML = `
        <button class="play-all-btn" data-playread="${sectionIdx}">▶ Nghe đoạn văn</button>
        <div class="reading-passage">${section.passage}</div>
        <button class="toggle-vi" id="${toggleId}">📖 Hiện/ẩn bản dịch tiếng Việt</button>
        <div class="reading-passage-vi" id="${viId}">${section.passageVi}</div>`;
  const quizDiv = document.createElement("div");
  section.questions.forEach((q, qIdx) => {
    quizDiv.appendChild(
      renderQuestion(q, `r${sectionIdx}-${qIdx}`, section.audio)
    );
  });
  wrap.appendChild(quizDiv);
  wrap.querySelector("[data-playread]").addEventListener("click", () => {
    speak(section.passage);
  });
  setTimeout(() => {
    document.getElementById(toggleId).addEventListener("click", () => {
      const el = document.getElementById(viId);
      el.style.display = el.style.display === "block" ? "none" : "block";
    });
  }, 0);
  return wrap;
}

function renderQuiz(section, sectionIdx) {
  const wrap = document.createElement("div");
  section.questions.forEach((q, qIdx) => {
    wrap.appendChild(
      renderQuestion(q, `q${sectionIdx}-${qIdx}`, section.audio)
    );
  });
  const summary = document.createElement("div");
  summary.className = "quiz-summary hidden";
  summary.id = `summary-${sectionIdx}`;
  wrap.appendChild(summary);
  return wrap;
}

function renderQuestion(q, id, sectionAudio) {
  const div = document.createElement("div");
  div.className = "quiz-item";
  div.dataset.questionId = id;
  const optionsHtml = q.options
    .map((opt, i) => {
      const o = typeof opt === "string" ? { jp: opt } : opt;
      const viHtml = o.vi ? `<div class="option-vi">${o.vi}</div>` : "";
      return `<label data-idx="${i}">
          <input type="radio" name="${id}" value="${i}">
          <span class="option-jp">${o.jp}</span>
          ${viHtml}
        </label>`;
    })
    .join("");
  const audioBoxHtml =
    q.audioQuestion && q.audioJp
      ? `
        <div class="audio-q-box">
          <button class="audio-q-btn">🔊 Nghe đoạn audio</button>
          <div class="hint">Có thể bấm nhiều lần. Chọn đáp án sau khi nghe xong.</div>
        </div>`
      : "";
  const qHintHtml = q.qVi ? `<div class="q-hint">↳ ${q.qVi}</div>` : "";
  const hasSegment = sectionAudio && q.audioStart != null && q.audioEnd != null;
  const qTextHtml = hasSegment
    ? `<div class="q-text jp-clickable" title="Nghe đoạn audio sách (${q.audioStart}s ~ ${q.audioEnd}s)">${q.q} <span class="seg-icon">🎧</span></div>`
    : `<div class="q-text">${q.q}</div>`;
  div.innerHTML = `
        ${qTextHtml}
        ${qHintHtml}
        ${audioBoxHtml}
        <div class="options">${optionsHtml}</div>
        <div class="explanation"><b>Giải thích:</b> ${bilingual(
          q.explanation,
          q.explanation_jp
        )}</div>`;
  if (hasSegment) {
    div.querySelector(".q-text.jp-clickable").addEventListener("click", () => {
      playSegment(sectionAudio, q.audioStart, q.audioEnd);
    });
  }
  if (q.audioQuestion && q.audioJp) {
    div
      .querySelector(".audio-q-btn")
      .addEventListener("click", () => speak(q.audioJp));
  }
  div.addEventListener("change", (e) => {
    if (div.classList.contains("answered")) return;
    const picked = parseInt(e.target.value);
    div.classList.add("answered");
    div.querySelectorAll("label").forEach((label, i) => {
      if (i === q.answer) label.classList.add("correct");
      else if (i === picked) label.classList.add("wrong");
    });
    quizScores.total++;
    if (picked === q.answer) quizScores.correct++;
    updateScoreDisplay();
  });
  return div;
}

function renderTips(section) {
  const div = document.createElement("div");
  div.className = "tips";
  div.innerHTML = bilingual(section.content, section.content_jp);
  return div;
}

// 敬語動詞の表 — bảng tra 3 cột (普通形 / 尊敬語 / 謙譲語). Ô trống → "—".
function renderVerbTable(section) {
  const wrap = document.createElement("div");
  wrap.className = "vtable-wrap";
  const col = section.columns || {};
  const cP = col.plain || "普通形";
  const cS = col.sonkeigo || "尊敬語";
  const cK = col.kenjougo || "謙譲語";
  const cell = (v) =>
    v && String(v).trim()
      ? furi(v).replace(/／/g, '<span class="vt-slash">／</span>')
      : '<span class="vt-empty">—</span>';
  const rows = (section.rows || [])
    .map((r) => {
      const plainVi = r.plainVi
        ? `<div class="vt-plain-vi explain-vi">${r.plainVi}</div>`
        : "";
      return `<div class="vt-row">
            <div class="vt-c vt-plain" data-label="${escAttr(cP)}">
              <div class="vt-plain-jp">${furi(r.plain)}</div>${plainVi}
            </div>
            <div class="vt-c vt-son" data-label="${escAttr(cS)}">${cell(
        r.sonkeigo
      )}</div>
            <div class="vt-c vt-ken" data-label="${escAttr(cK)}">${cell(
        r.kenjougo
      )}</div>
          </div>`;
    })
    .join("");
  const note =
    section.note || section.note_jp
      ? `<div class="vt-note">${bilingual(section.note, section.note_jp)}</div>`
      : "";
  wrap.innerHTML = `
        <div class="vtable">
          <div class="vt-row vt-head">
            <div class="vt-c vt-plain">${cP}</div>
            <div class="vt-c vt-son">${cS}</div>
            <div class="vt-c vt-ken">${cK}</div>
          </div>
          ${rows}
        </div>
        ${note}`;
  return wrap;
}

// やってみましょう — đóng vai. Mỗi tình huống (scenario) có 2 thẻ vai A/B.
// Câu tiếng Nhật trong thẻ luôn hiện (đó là "đề bài"); bản dịch VI theo lang toggle.
function renderRoleplay(section) {
  const wrap = document.createElement("div");
  wrap.className = "roleplay";

  (section.scenarios || []).forEach((sc) => {
    const cards = (sc.roles || [])
      .map((r) => {
        const sideCls = r.side === "B" ? "rp-card-b" : "rp-card-a";
        const speak = r.jp
          ? `<button class="speak-btn" data-text="${escAttr(
              r.jp
            )}" title="Nghe đề bài">🔊</button>`
          : "";
        return `
            <div class="rp-card ${sideCls}">
              <div class="rp-card-head">
                <span class="rp-side">${r.side || ""}</span>
                <span class="rp-who">${r.who_jp || ""}</span>
                <span class="rp-ref">${r.ref || ""}</span>
              </div>
              <div class="rp-card-body">
                ${
                  r.who_vi
                    ? `<div class="rp-who-vi explain-vi">🧑‍🤝‍🧑 ${r.who_vi}</div>`
                    : ""
                }
                <div class="rp-jp">${r.jp || ""} ${speak}</div>
                ${r.vi ? `<div class="rp-vi explain-vi">${r.vi}</div>` : ""}
              </div>
            </div>`;
      })
      .join("");

    const hints =
      sc.hints && sc.hints.length
        ? `<div class="rp-hints">
            <div class="rp-hints-label">💡 Gợi ý — dùng lại mẫu đã học trong bài (không phải đáp án sách):</div>
            <ul>${sc.hints
              .map(
                (h) =>
                  `<li><span class="rp-hint-jp">${
                    h.jp
                  }</span> <button class="speak-btn" data-text="${escAttr(
                    h.jp
                  )}" title="Nghe">🔊</button>${
                    h.vi
                      ? `<span class="rp-hint-vi explain-vi"> — ${h.vi}</span>`
                      : ""
                  }</li>`
              )
              .join("")}</ul>
          </div>`
        : "";

    // Hội thoại mẫu (会話例). Ẩn trong <details> để học viên tự nói trước,
    // rồi mở ra đối chiếu. Lines = hội thoại in sách; refSection = trỏ tới mục khác.
    let model = "";
    if (sc.model) {
      const m = sc.model;
      const chip = (side) =>
        `<span class="rp-ml-sp rp-ml-${(side || "a").toLowerCase()}">${
          side || ""
        }</span>`;
      let body = "";
      if (m.lines && m.lines.length) {
        const legend = (sc.roles || []).length
          ? `<div class="rp-ml-legend explain-vi">${(sc.roles || [])
              .map((r) => `${chip(r.side)} ${r.who_vi || r.who_jp || ""}`)
              .join(" &nbsp;·&nbsp; ")}</div>`
          : "";
        const rows = m.lines
          .map((ln) => {
            // Không gắn 🔊 TTS từng dòng — đã có bản ghi gốc ở trên.
            const vi = ln.vi
              ? `<div class="rp-ml-vi explain-vi">${ln.vi}</div>`
              : "";
            const note = ln.note_vi
              ? `<div class="rp-ml-note explain-vi">↳ ${ln.note_vi}</div>`
              : "";
            return `<div class="rp-ml-row">
                  ${chip(ln.sp)}
                  <div class="rp-ml-text">
                    <div class="rp-ml-jp">${ln.jp || ""}</div>
                    ${vi}
                    ${note}
                  </div>
                </div>`;
          })
          .join("");
        body = legend + rows;
      } else if (m.refSection_vi || m.refSection_jp) {
        body = `<div class="rp-ml-ref">${bilingual(
          m.refSection_vi,
          m.refSection_jp
        )}</div>`;
      }
      const intro =
        m.intro_vi || m.intro_jp
          ? `<div class="rp-ml-intro">${bilingual(
              m.intro_vi,
              m.intro_jp
            )}</div>`
          : "";
      // Bản ghi gốc trong sách (mp3). Có audio → ẩn nút 🔊 TTS từng dòng (xem CSS .rp-model.has-audio).
      const audioPlayer = m.audio
        ? `<div class="rp-ml-audio">
              <div class="rp-ml-audio-label">🎧 Bản ghi gốc trong sách${
                m.track ? " — Track " + m.track : ""
              }</div>
              <audio controls preload="none" src="${
                m.audio
              }" class="section-audio"></audio>
            </div>`
        : "";
      const track = m.track
        ? `<span class="rp-ml-track">🎧 Track ${m.track}</span>`
        : "";
      model = `<details class="rp-model${m.audio ? " has-audio" : ""}">
            <summary><span class="rp-ml-summary-label">📖 Xem hội thoại mẫu (会話例)</span>${track}</summary>
            <div class="rp-model-body">${intro}${audioPlayer}${body}</div>
          </details>`;
    }

    const sceneEl = document.createElement("div");
    sceneEl.className = "rp-scenario";
    sceneEl.innerHTML = `
          <div class="rp-scene-head">
            <span class="rp-badge">${sc.label || ""}</span>
            <span class="rp-scene-title">${sc.title_jp || ""}</span>
            ${
              sc.title_vi
                ? `<span class="rp-scene-title-vi explain-vi">— ${sc.title_vi}</span>`
                : ""
            }
          </div>
          <div class="rp-cards">${cards}</div>
          ${hints}
          ${model}`;
    wrap.appendChild(sceneEl);
  });

  if (section.answerRef || section.answerRef_jp) {
    const ans = document.createElement("div");
    ans.className = "rp-answer-ref";
    ans.innerHTML = bilingual(section.answerRef, section.answerRef_jp);
    wrap.appendChild(ans);
  }
  return wrap;
}

let exSectionSeq = 0;
function renderExercise(section) {
  const wrap = document.createElement("div");
  wrap.className = "exercise-wrap";
  // Unique base id per rendered section → no cross-section id collisions
  const uid = "ex" + exSectionSeq++;

  const nl2br = (s) => (s || "").replace(/\n/g, "<br>");
  const letter = (idx) => String.fromCharCode(97 + idx); // 0→a, 1→b…

  // Reveal block: a "Xem giải thích" button (hidden until the item is
  // attempted) that uncovers the đáp án + giải thích on demand.
  // opts: { visible } show the reveal button from the start (no 確認 gate);
  //       { revealed } answer shown immediately, no button (worked example);
  //       { label } custom button text.
  const answerBlock = (answerText, answerVi, opts = {}) => {
    const btn = opts.revealed
      ? ""
      : `<button type="button" class="ex-explain-btn${
          opts.visible ? "" : " hidden"
        }">${opts.label || "💡 Xem giải thích"}</button>`;
    return `
          ${btn}
          <div class="ex-answer${opts.revealed ? "" : " hidden"}">
            <span class="ex-answer-label">✅ Đáp án:</span> <b>${answerText}</b>
            ${
              answerVi
                ? `<br><span class="ex-answer-vi explain-vi">${answerVi}</span>`
                : ""
            }
          </div>`;
  };

  // Clickable a/b/c options. correctIdx marks the right one.
  const choicesBlock = (options, correctIdx) => `
          <div class="ex-choices">
            ${options
              .map(
                (opt, oi) => `
              <button type="button" class="ex-opt" data-correct="${
                oi === correctIdx ? "1" : "0"
              }">
                <span class="ex-opt-badge">${letter(oi)}</span>
                <span class="ex-opt-text">${opt}</span>
                <span class="ex-opt-mark"></span>
              </button>`
              )
              .join("")}
          </div>`;

  // Text-input row (transform / free answer). base = verb hint to convert.
  const inputBlock = (answer, base) => `
          <div class="ex-input-row">
            ${
              base
                ? `<span class="ex-base">${base}</span><span class="ex-arrow">→</span>`
                : ""
            }
            <input type="text" class="ex-input" placeholder="答え…" autocomplete="off" autocorrect="off" spellcheck="false">
            <button type="button" class="ex-check-btn" data-answer="${escAttr(
              answer
            )}">確認</button>
          </div>
          <div class="ex-feedback hidden"></div>`;

  // Instruction box
  const instrDiv = document.createElement("div");
  instrDiv.className = "exercise-instruction";
  instrDiv.innerHTML = bilingual(
    section.instruction_vi || section.instruction,
    null
  );
  wrap.appendChild(instrDiv);

  // Note (if any)
  if (section.note) {
    const noteDiv = document.createElement("div");
    noteDiv.className = "exercise-note";
    noteDiv.textContent = section.note;
    wrap.appendChild(noteDiv);
  }

  // Items
  // Compact two-column "table" layout for verb-form drills (trang 28)
  const tableMode = section.layout === "table";
  const tableWrap = tableMode ? document.createElement("div") : null;
  if (tableWrap) tableWrap.className = "ex-table";
  // Speaking drill: listen → say keigo → say casual, reveal to self-check
  const speakMode = section.style === "speak";
  const STYLE_CLASS = { 敬語: "ex-style-keigo", 友達: "ex-style-casual" };

  section.items.forEach((item) => {
    if (tableMode) {
      const trow = document.createElement("div");
      const plain = item.plain || item.context || "";
      if (item.num == null) {
        // Worked example: answer is given, no input needed
        trow.className = "ex-trow ex-trow-example";
        trow.innerHTML = `
                <div class="ex-tmain">
                  <span class="ex-tnum">※</span>
                  <span class="ex-tplain">${plain}</span>
                  <span class="ex-arrow">→</span>
                  <span class="ex-texample">${item.answer}</span>
                </div>
                ${
                  item.answer_vi
                    ? `<div class="ex-tnote explain-vi">${item.answer_vi}</div>`
                    : ""
                }`;
      } else {
        trow.className = "ex-trow";
        trow.innerHTML = `
                <div class="ex-tmain">
                  <span class="ex-tnum">${item.num}</span>
                  <span class="ex-tplain">${plain}</span>
                  <span class="ex-arrow">→</span>
                  <input type="text" class="ex-input" placeholder="ひらがなで…" autocomplete="off" autocorrect="off" spellcheck="false">
                  <button type="button" class="ex-check-btn" data-answer="${escAttr(
                    item.answer
                  )}">確認</button>
                </div>
                <div class="ex-feedback hidden"></div>
                ${answerBlock(item.answer, item.answer_vi)}`;
      }
      tableWrap.appendChild(trow);
      return;
    }

    const row = document.createElement("div");
    row.className = "exercise-row";

    // Label (number or null)
    const numLabel =
      item.num != null
        ? `<span class="ex-num">${item.num}.</span>`
        : `<span class="ex-num ex-num-fixed">—</span>`;

    const contextViHtml = item.context_vi
      ? `<button type="button" class="ex-tr-btn" aria-expanded="false" aria-label="Nghĩa tiếng Việt" title="Nghĩa tiếng Việt">🇻🇳</button>
         <div class="ex-context-vi hidden">${nl2br(item.context_vi)}</div>`
      : "";

    if (speakMode) {
      // ----- Speaking drill (敬語 / 友達 style, reveal-only) -----
      const playBtn =
        section.audio && item.audioStart != null
          ? `<button type="button" class="ex-play-btn" data-start="${item.audioStart}" data-end="${item.audioEnd}" title="Nghe câu này">🎧</button>`
          : "";
      const subRowsHtml = item.subAnswers
        .map((sub) => {
          const opts = item.example
            ? { revealed: true }
            : { visible: true, label: "👂 Hiện đáp án" };
          return `
                <div class="exercise-sub-row ex-style-row">
                  <span class="ex-style-label ${STYLE_CLASS[sub.num] || ""}">${
            sub.num
          }</span>
                  <div class="ex-sub-body">
                    ${answerBlock(sub.answer, sub.answer_vi, opts)}
                  </div>
                </div>`;
        })
        .join("");
      row.innerHTML = `
              <div class="ex-question">
                ${numLabel}
                <div class="ex-body">
                  <div class="ex-context ex-speak-base">${nl2br(
                    item.context
                  )} ${playBtn}</div>
                  ${contextViHtml}
                  <div class="ex-sub-wrap">${subRowsHtml}</div>
                </div>
              </div>`;
      wrap.appendChild(row);
      return;
    }

    if (item.subAnswers) {
      // ----- Multi-part item (dialogue with ①②③④) -----
      const contextHtml = nl2br(item.context);
      const imageHtml = item.image
        ? `<figure class="ex-figure">
                  <img src="${item.image}" class="ex-zoomable" alt="${
            item.imageAlt || ""
          }" loading="lazy">
                  ${
                    item.imageAlt
                      ? `<figcaption>${item.imageAlt}</figcaption>`
                      : ""
                  }
                </figure>`
        : "";
      const bodyClass = item.image ? "ex-body ex-body-with-image" : "ex-body";
      const contentWrapOpen = item.image ? `<div class="ex-body-content">` : "";
      const contentWrapClose = item.image ? `</div>` : "";
      row.innerHTML = `
              <div class="ex-question">
                ${numLabel}
                <div class="${bodyClass}">
                  ${contentWrapOpen}
                  <div class="ex-context">${contextHtml}</div>
                  ${contextViHtml}
                  ${contentWrapClose}
                  ${imageHtml}
                </div>
              </div>`;

      const subWrap = document.createElement("div");
      subWrap.className = "ex-sub-wrap";
      item.subAnswers.forEach((sub) => {
        const subRow = document.createElement("div");
        subRow.className = "exercise-sub-row";
        const answerText =
          sub.options != null ? sub.options[sub.answerIndex] : sub.answer;
        const interaction =
          sub.options != null
            ? choicesBlock(sub.options, sub.answerIndex)
            : inputBlock(sub.answer, sub.base);
        subRow.innerHTML = `
                <div class="ex-sub-label">${sub.num}</div>
                <div class="ex-sub-body">
                  ${interaction}
                  ${answerBlock(answerText, sub.answer_vi)}
                </div>`;
        subWrap.appendChild(subRow);
      });
      row.appendChild(subWrap);
    } else if (item.options) {
      // ----- Single multiple-choice item -----
      row.innerHTML = `
              <div class="ex-question">
                ${numLabel}
                <div class="ex-body">
                  <div class="ex-context">${nl2br(item.context)}</div>
                  ${contextViHtml}
                  ${choicesBlock(item.options, item.answerIndex)}
                  ${answerBlock(item.options[item.answerIndex], item.answer_vi)}
                </div>
              </div>`;
    } else {
      // ----- Single text-input item (transform / fill-in) -----
      row.innerHTML = `
              <div class="ex-question">
                ${numLabel}
                <div class="ex-body">
                  <div class="ex-context">${nl2br(
                    item.context || item.plain
                  )}</div>
                  ${contextViHtml}
                  ${inputBlock(item.answer, item.base)}
                  ${answerBlock(item.answer, item.answer_vi)}
                </div>
              </div>`;
    }

    wrap.appendChild(row);
  });
  if (tableWrap) wrap.appendChild(tableWrap);

  // Give each text input a unique id (label/focus), no global lookups
  wrap.querySelectorAll(".ex-input").forEach((input, k) => {
    input.id = `${uid}-in${k}`;
  });

  // "Show all answers" button
  const showAllBtn = document.createElement("button");
  showAllBtn.className = "ex-show-all-btn";
  showAllBtn.textContent = "📋 Hiện tất cả đáp án";
  showAllBtn.addEventListener("click", () => {
    wrap
      .querySelectorAll(".ex-answer")
      .forEach((el) => el.classList.remove("hidden"));
    // Explanations are all shown now → hide the per-item reveal buttons
    wrap
      .querySelectorAll(".ex-explain-btn")
      .forEach((el) => el.classList.add("hidden"));
    // Highlight the correct option in every choice group
    wrap.querySelectorAll(".ex-choices").forEach((group) => {
      const corr = group.querySelector('.ex-opt[data-correct="1"]');
      if (corr && !corr.classList.contains("ex-opt-wrong")) {
        corr.classList.add("ex-opt-correct");
        const m = corr.querySelector(".ex-opt-mark");
        if (m) m.textContent = "◯";
      }
    });
    showAllBtn.textContent = "✅ Đang hiện đáp án";
    showAllBtn.disabled = true;
  });
  wrap.appendChild(showAllBtn);

  // ----- Wire clickable options -----
  wrap.querySelectorAll(".ex-opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      const group = opt.closest(".ex-choices");
      const body = opt.closest(".ex-sub-body, .ex-body");
      const ans = body.querySelector(".ex-answer");
      const explainBtn = body.querySelector(".ex-explain-btn");
      group.querySelectorAll(".ex-opt").forEach((o) => {
        o.classList.remove("ex-opt-correct", "ex-opt-wrong");
        o.querySelector(".ex-opt-mark").textContent = "";
      });
      if (opt.dataset.correct === "1") {
        opt.classList.add("ex-opt-correct");
        opt.querySelector(".ex-opt-mark").textContent = "◯ Đúng!";
      } else {
        opt.classList.add("ex-opt-wrong");
        opt.querySelector(".ex-opt-mark").textContent = "✗";
        const corr = group.querySelector('.ex-opt[data-correct="1"]');
        corr.classList.add("ex-opt-correct");
        corr.querySelector(".ex-opt-mark").textContent = "◯";
      }
      // Offer the explanation on demand (don't auto-reveal it)
      if (explainBtn && ans.classList.contains("hidden")) {
        explainBtn.classList.remove("hidden");
      }
    });
  });

  // ----- Wire text-input check buttons (robust: resolve via closest) -----
  wrap.querySelectorAll(".ex-check-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const correct = btn.dataset.answer;
      const body = btn.closest(".ex-sub-body, .ex-body, .ex-trow");
      const input = body.querySelector(".ex-input");
      const fb = body.querySelector(".ex-feedback");
      const ans = body.querySelector(".ex-answer");
      const userVal = (input.value || "").trim();

      const norm = (s) => s.replace(/\s/g, "").toLowerCase();
      const variants = correct.split(/[／/]/).map((v) => norm(v.trim()));
      const ok = userVal !== "" && variants.includes(norm(userVal));

      const explainBtn = body.querySelector(".ex-explain-btn");
      fb.classList.remove("hidden", "ex-ok", "ex-ng");
      if (userVal === "") {
        fb.textContent = "⚠️ Nhập câu trả lời rồi bấm 確認.";
        fb.classList.add("ex-ng");
        return; // chưa trả lời → chưa mở nút giải thích
      }
      if (ok) {
        fb.textContent = "✅ Chính xác!";
        fb.classList.add("ex-ok");
      } else {
        fb.textContent = "❌ Chưa đúng, thử lại hoặc xem giải thích.";
        fb.classList.add("ex-ng");
      }
      // Offer the explanation on demand (don't auto-reveal it)
      if (explainBtn && ans.classList.contains("hidden")) {
        explainBtn.classList.remove("hidden");
      }
    });
  });

  // Enter inside an input must NOT auto-check — only 確認 grades the answer.
  // We still swallow Enter so the form doesn't do anything unexpected.
  wrap.querySelectorAll(".ex-input").forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault();
    });
  });

  // ----- Wire "Xem giải thích" reveal buttons -----
  wrap.querySelectorAll(".ex-explain-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ans = btn
        .closest(".ex-sub-body, .ex-body, .ex-trow")
        .querySelector(".ex-answer");
      if (ans) ans.classList.remove("hidden");
      btn.classList.add("hidden");
    });
  });

  wrap.querySelectorAll(".ex-tr-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const body = btn.closest(".ex-body");
      const vi = body && body.querySelector(".ex-context-vi");
      if (!vi) return;
      const show = !vi.classList.toggle("hidden");
      btn.setAttribute("aria-expanded", show ? "true" : "false");
    });
  });

  // ----- Wire per-item audio segment buttons (speaking drill) -----
  if (section.audio) {
    wrap.querySelectorAll(".ex-play-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        playSegment(
          section.audio,
          Number(btn.dataset.start),
          Number(btn.dataset.end)
        );
      });
    });
  }

  return wrap;
}

// One global lightbox for any zoomable image (.ex-zoomable)
function wireImageLightbox() {
  if (window.__exLightboxWired) return;
  window.__exLightboxWired = true;
  document.addEventListener("click", (e) => {
    const img = e.target.closest(".ex-zoomable");
    if (!img) return;
    const box = document.createElement("div");
    box.className = "ex-lightbox";
    const big = document.createElement("img");
    big.src = img.src;
    big.alt = img.alt || "";
    box.appendChild(big);
    box.addEventListener("click", () => box.remove());
    document.addEventListener("keydown", function esc(ev) {
      if (ev.key === "Escape") {
        box.remove();
        document.removeEventListener("keydown", esc);
      }
    });
    document.body.appendChild(box);
  });
}
wireImageLightbox();

function updateScoreDisplay() {
  let totalAvailable = 0;
  currentLesson.sections.forEach((s) => {
    if (s.type === "quiz") totalAvailable += s.questions.length;
    if (s.type === "reading") totalAvailable += s.questions.length;
  });
  const summary = document.querySelector(".quiz-summary");
  if (summary && quizScores.total === totalAvailable) {
    const pct = Math.round((quizScores.correct / totalAvailable) * 100);
    summary.innerHTML = `
          <div>Hoàn thành tất cả câu hỏi!</div>
          <div class="score">${quizScores.correct}/${totalAvailable} (${pct}%)</div>`;
    summary.classList.remove("hidden");
  }
}

document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  signOut(auth);
});

completeBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Cần đăng nhập để lưu tiến độ.");
    return;
  }
  completeBtn.disabled = true;
  try {
    await setDoc(doc(db, "users", currentUser.uid, "progress", lessonId), {
      lessonId,
      completedAt: serverTimestamp(),
      quizCorrect: quizScores.correct,
      quizTotal: quizScores.total,
    });
    completeStatus.textContent = `✓ Đã lưu! ${
      quizScores.total > 0
        ? `Score: ${quizScores.correct}/${quizScores.total}`
        : ""
    }`;
    completeStatus.classList.remove("hidden");
  } catch (err) {
    alert("Lưu thất bại: " + err.message);
    completeBtn.disabled = false;
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  authStateResolved = true;
  if (user) {
    userBar.classList.remove("hidden");
    loginRequired.classList.add("hidden");
    userEmailEl.textContent = user.email;
    pullPending = true;
    pullStudyTimeFromFirestore();
    pullUserPreferences();
    restoreReadingPosition();
    try {
      const snap = await getDoc(
        doc(db, "users", user.uid, "progress", lessonId)
      );
      if (snap.exists()) {
        completeStatus.textContent = `✓ Bài này đã hoàn thành trước đó.`;
        completeStatus.classList.remove("hidden");
      }
    } catch {}
  } else {
    userBar.classList.add("hidden");
    loginRequired.classList.remove("hidden");
  }
});
