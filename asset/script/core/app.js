import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { bilingual } from "./utils.js";
import { DEFAULT_BOOK_ID, lessonKey } from "./books.js";
import { initAudio } from "./audio.js";
import { getPlugin } from "../plugins/registry.js";
import { initSettings } from "../features/settings.js";
import { initToc, buildTocMenu } from "../features/toc.js";
import { initScrollTop } from "../features/scroll-top.js";
import { initProgress, progressOnAuth } from "../features/progress.js";
import {
  initStudyTracker,
  studyTrackerOnAuth,
  restoreReadingPosition,
} from "../features/study-tracker.js";

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

export class LessonApp {
  constructor({ auth, db }) {
    this.auth = auth;
    this.db = db;
    const params = new URLSearchParams(location.search);
    this.lessonId = params.get("id");
    this.bookId = params.get("book") || DEFAULT_BOOK_ID;
    this.lessonKey = lessonKey(this.bookId, this.lessonId);

    this.currentUser = null;
    this.currentLesson = null;
    this.quizScores = { correct: 0, total: 0 };
    this.lessonRendered = false;

    this.loadingEl = document.getElementById("loading");
    this.errorEl = document.getElementById("error");
    this.lessonContent = document.getElementById("lessonContent");
    this.loginRequired = document.getElementById("loginRequired");
    this.userBar = document.getElementById("userBar");
    this.userEmailEl = document.getElementById("userEmail");
    this.completeArea = document.getElementById("completeArea");
    this.completeBtn = document.getElementById("completeBtn");
    this.completeStatus = document.getElementById("completeStatus");
  }

  boot() {
    this.updateNav();
    initSettings();
    initAudio();
    initToc();
    initScrollTop();
    initProgress(this);
    initStudyTracker(this);

    if (!this.lessonId) {
      this.loadingEl.classList.add("hidden");
      this.errorEl.textContent = "Thiếu lesson ID. Quay lại trang chủ.";
      this.errorEl.classList.remove("hidden");
    } else {
      this.loadLesson(this.lessonId);
    }

    onAuthStateChanged(this.auth, (user) => this.handleAuth(user));
  }

  updateNav() {
    const nav = document.querySelector(".nav");
    if (!nav) return;
    nav.innerHTML = `<a href="book.html?book=${this.bookId}">← Mục lục sách</a> · <a href="index.html">📚 Thư viện</a>`;
  }

  async loadLesson(id) {
    try {
      const res = await fetch(`books/${this.bookId}/${id}.json`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.currentLesson = await res.json();
      this.renderLesson(this.currentLesson);
      this.loadingEl.classList.add("hidden");
      this.lessonContent.classList.remove("hidden");
    } catch (err) {
      this.loadingEl.classList.add("hidden");
      this.errorEl.textContent = `Không tải được bài học "${id}": ${err.message}`;
      this.errorEl.classList.remove("hidden");
    }
  }

  renderLesson(lesson) {
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
    this.lessonRendered = false;
    lesson.sections.forEach((section, idx) => {
      const el = this.renderSection(section, idx);
      container.appendChild(el);
    });

    buildTocMenu(lesson);
    this.completeArea.classList.remove("hidden");
    this.lessonRendered = true;
    restoreReadingPosition();
  }

  renderSection(section, idx) {
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
      const hasSegments =
        Array.isArray(section.questions) &&
        section.questions.some(
          (q) => q.audioStart != null && q.audioEnd != null
        );
      if (!hasSegments) {
        const audioWrap = document.createElement("div");
        audioWrap.className = "section-audio-wrap";
        const label = section.audioLabel || "Audio";
        audioWrap.innerHTML = `<div class="section-audio-label">🎧 ${label}</div><audio controls preload="metadata" src="${section.audio}" class="section-audio"></audio>`;
        div.appendChild(audioWrap);
      }
      div.classList.add("has-audio");
    }

    const plugin = getPlugin(section.type);
    if (plugin) {
      div.appendChild(
        plugin.render(section, {
          idx,
          quizScores: this.quizScores,
          updateScoreDisplay: () => this.updateScoreDisplay(),
        })
      );
    }
    return div;
  }

  updateScoreDisplay() {
    let totalAvailable = 0;
    this.currentLesson.sections.forEach((s) => {
      if (s.type === "quiz") totalAvailable += s.questions.length;
      if (s.type === "reading") totalAvailable += s.questions.length;
    });
    const summary = document.querySelector(".quiz-summary");
    if (summary && this.quizScores.total === totalAvailable) {
      const pct = Math.round((this.quizScores.correct / totalAvailable) * 100);
      summary.innerHTML = `
          <div>Hoàn thành tất cả câu hỏi!</div>
          <div class="score">${this.quizScores.correct}/${totalAvailable} (${pct}%)</div>`;
      summary.classList.remove("hidden");
    }
  }

  handleAuth(user) {
    this.currentUser = user;
    if (user) {
      this.userBar.classList.remove("hidden");
      this.loginRequired.classList.add("hidden");
      this.userEmailEl.textContent = user.email;
    } else {
      this.userBar.classList.add("hidden");
      this.loginRequired.classList.remove("hidden");
    }
    studyTrackerOnAuth(user);
    progressOnAuth(user);
  }
}
