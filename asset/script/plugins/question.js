import { bilingual } from "../core/utils.js";
import { speak, playSegment } from "../core/audio.js";

export function renderQuestion(q, id, sectionAudio, ctx) {
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
    ctx.quizScores.total++;
    if (picked === q.answer) ctx.quizScores.correct++;
    ctx.updateScoreDisplay();
  });
  return div;
}
