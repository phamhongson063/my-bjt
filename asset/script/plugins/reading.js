import { SectionPlugin } from "./base.js";
import { renderQuestion } from "./question.js";
import { speak } from "../core/audio.js";

export class ReadingPlugin extends SectionPlugin {
  static type = "reading";

  render(section, ctx) {
    const sectionIdx = ctx.idx;
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
        renderQuestion(q, `r${sectionIdx}-${qIdx}`, section.audio, ctx)
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
}
