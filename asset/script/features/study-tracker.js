import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showCopyFlash } from "../core/utils.js";

const IDLE_THRESHOLD_MS = 60 * 1000;
const MAX_TICK_DELTA_MS = 5 * 1000;
const FIRESTORE_SYNC_INTERVAL_MS = 3 * 60 * 1000;

let app;

const lessonTimes = {};
const dailyTimes = {};
const lessonTimesMeta = {};
let lastActivityAt = Date.now();
let lastTickAt = Date.now();
let studyTimerStarted = false;
let userPaused = true;
let prefsPulled = false;
let pullPending = false;
let authStateResolved = false;
let lastFirestoreSyncAt = 0;
let firestoreSyncInFlight = false;
let pulledFromFirestore = false;
let studyDataReady = false;
let readingPosRestored = false;

function todayDateKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatClockTime(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}`;
}

function renderStudyTime(isActive) {
  const timeEl = document.getElementById("studyClockTime");
  const dotEl = document.getElementById("studyClockDot");
  if (!timeEl) return;
  timeEl.textContent = formatClockTime(lessonTimes[app.lessonId] || 0);
  if (dotEl) {
    let label;
    let counting = false;
    if (pullPending || !authStateResolved) {
      label = "⟳ Đang đồng bộ...";
    } else if (userPaused) {
      label = "🛑 Tạm dừng (tự bạn)";
    } else if (document.hidden) {
      label = "◌ Tab ẩn (pause)";
    } else if (isActive) {
      label = "● Đang học";
      counting = true;
    } else {
      label = "◌ Không thao tác (pause)";
    }
    dotEl.classList.toggle("active", counting);
    dotEl.title = label;
    dotEl.setAttribute("aria-label", label);
  }
}

async function syncStudyTimeToFirestore(force = false) {
  if (!app.currentUser || !app.lessonId || firestoreSyncInFlight) return;
  if (!studyDataReady) return;
  if (!force && Date.now() - lastFirestoreSyncAt < FIRESTORE_SYNC_INTERVAL_MS)
    return;
  firestoreSyncInFlight = true;
  lastFirestoreSyncAt = Date.now();
  try {
    const totalMs = lessonTimes[app.lessonId] || 0;
    const today = todayDateKey();
    const dailyMs =
      (dailyTimes[today] && dailyTimes[today][app.lessonId]) || 0;
    const localUpdatedAt =
      (lessonTimesMeta[app.lessonId] &&
        lessonTimesMeta[app.lessonId].localUpdatedAt) ||
      0;
    const totalsRef = doc(
      app.db,
      "users",
      app.currentUser.uid,
      "study-totals",
      app.lessonKey
    );
    const dailyRef = doc(
      app.db,
      "users",
      app.currentUser.uid,
      "study-daily",
      `${today}_${app.lessonKey}`
    );
    await Promise.all([
      setDoc(totalsRef, {
        bookId: app.bookId,
        lessonId: app.lessonId,
        totalMs,
        localUpdatedAt,
        updatedAt: serverTimestamp(),
      }),
      setDoc(dailyRef, {
        bookId: app.bookId,
        lessonId: app.lessonId,
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

async function pullUserPreferences() {
  if (!app.currentUser || prefsPulled) return;
  prefsPulled = true;
  try {
    const ref = doc(
      app.db,
      "users",
      app.currentUser.uid,
      "settings",
      "preferences"
    );
    const snap = await getDoc(ref);
    if (snap.exists() && typeof snap.data().pauseTracking === "boolean") {
      userPaused = snap.data().pauseTracking;
    }
    updatePauseFab();
    renderStudyTime(
      !document.hidden && Date.now() - lastActivityAt < IDLE_THRESHOLD_MS
    );
  } catch (err) {
    console.warn("Preferences pull failed:", err);
  }
}

async function pushUserPreferences() {
  if (!app.currentUser) return;
  try {
    const ref = doc(
      app.db,
      "users",
      app.currentUser.uid,
      "settings",
      "preferences"
    );
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
  if (!app.currentUser || !app.lessonId || pulledFromFirestore) return;
  pulledFromFirestore = true;
  pullPending = true;
  try {
    const today = todayDateKey();
    const totalsRef = doc(
      app.db,
      "users",
      app.currentUser.uid,
      "study-totals",
      app.lessonKey
    );
    const dailyRef = doc(
      app.db,
      "users",
      app.currentUser.uid,
      "study-daily",
      `${today}_${app.lessonKey}`
    );
    const [totalsSnap, dailySnap] = await Promise.all([
      getDoc(totalsRef),
      getDoc(dailyRef),
    ]);
    if (totalsSnap.exists()) {
      const data = totalsSnap.data();
      lessonTimes[app.lessonId] = data.totalMs || 0;
      lessonTimesMeta[app.lessonId] = {
        localUpdatedAt: data.localUpdatedAt || 0,
      };
    }
    if (dailySnap.exists()) {
      const remoteDaily = dailySnap.data().activeMs || 0;
      if (!dailyTimes[today]) dailyTimes[today] = {};
      dailyTimes[today][app.lessonId] = remoteDaily;
    }
    studyDataReady = true;
    renderStudyTime(!document.hidden);
  } catch (err) {
    pulledFromFirestore = false;
    console.warn("Firestore pull failed:", err);
  } finally {
    pullPending = false;
  }
}

function readingPosKey() {
  return `bjt-reading-pos:${app.lessonKey}`;
}

function saveReadingPosition() {
  if (!app.lessonId || !app.lessonRendered) return;
  try {
    localStorage.setItem(readingPosKey(), String(Math.round(window.scrollY)));
    showCopyFlash("🔖 Đã lưu vị trí (máy này)");
  } catch (err) {
    console.warn("Reading position save failed:", err);
    showCopyFlash("⚠️ Lưu vị trí thất bại");
  }
}

export function restoreReadingPosition() {
  if (!app.lessonId || !app.lessonRendered || readingPosRestored) return;
  readingPosRestored = true;
  try {
    const y = parseInt(localStorage.getItem(readingPosKey()) || "", 10);
    if (!Number.isFinite(y) || y <= 0) return;
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
  const canAccumulate = isActive && authStateResolved && !pullPending;

  if (canAccumulate && app.lessonId) {
    lessonTimes[app.lessonId] = (lessonTimes[app.lessonId] || 0) + delta;
    lessonTimesMeta[app.lessonId] = { localUpdatedAt: Date.now() };
    const today = todayDateKey();
    if (!dailyTimes[today]) dailyTimes[today] = {};
    dailyTimes[today][app.lessonId] =
      (dailyTimes[today][app.lessonId] || 0) + delta;
  }

  if (isActive) syncStudyTimeToFirestore();

  renderStudyTime(tabVisible && notIdle);
}

function startTimer() {
  if (studyTimerStarted || !app.lessonId) return;
  studyTimerStarted = true;

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

export function initStudyTracker(appRef) {
  app = appRef;

  setTimeout(() => {
    if (!authStateResolved) {
      authStateResolved = true;
      pullPending = false;
    }
  }, 10000);

  const savePosFab = document.getElementById("savePosFab");
  if (savePosFab) {
    savePosFab.addEventListener("click", saveReadingPosition);
  }

  startTimer();
}

export function studyTrackerOnAuth(user) {
  authStateResolved = true;
  if (user) {
    pullPending = true;
    pullStudyTimeFromFirestore();
    pullUserPreferences();
    restoreReadingPosition();
  }
}
