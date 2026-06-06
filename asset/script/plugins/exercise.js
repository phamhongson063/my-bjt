import { SectionPlugin } from "./base.js";
import { bilingual, escAttr } from "../core/utils.js";
import { playSegment } from "../core/audio.js";
import { wireImageLightbox } from "../core/lightbox.js";

export class ExercisePlugin extends SectionPlugin {
  static type = "exercise";

  constructor() {
    super();
    this.seq = 0;
    wireImageLightbox();
  }

  render(section) {
    const wrap = document.createElement("div");
    wrap.className = "exercise-wrap";
    const uid = "ex" + this.seq++;

    const nl2br = (s) => (s || "").replace(/\n/g, "<br>");
    const letter = (idx) => String.fromCharCode(97 + idx);

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

    const instrDiv = document.createElement("div");
    instrDiv.className = "exercise-instruction";
    instrDiv.innerHTML = bilingual(
      section.instruction_vi || section.instruction,
      null
    );
    wrap.appendChild(instrDiv);

    if (section.note) {
      const noteDiv = document.createElement("div");
      noteDiv.className = "exercise-note";
      noteDiv.textContent = section.note;
      wrap.appendChild(noteDiv);
    }

    const tableMode = section.layout === "table";
    const tableWrap = tableMode ? document.createElement("div") : null;
    if (tableWrap) tableWrap.className = "ex-table";
    const speakMode = section.style === "speak";
    const STYLE_CLASS = { 敬語: "ex-style-keigo", 友達: "ex-style-casual" };

    section.items.forEach((item) => {
      if (tableMode) {
        const trow = document.createElement("div");
        const plain = item.plain || item.context || "";
        if (item.num == null) {
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

      const numLabel =
        item.num != null
          ? `<span class="ex-num">${item.num}.</span>`
          : `<span class="ex-num ex-num-fixed">—</span>`;

      const contextViHtml = item.context_vi
        ? `<button type="button" class="ex-tr-btn" aria-expanded="false" aria-label="Nghĩa tiếng Việt" title="Nghĩa tiếng Việt">🇻🇳</button>
         <div class="ex-context-vi hidden">${nl2br(item.context_vi)}</div>`
        : "";

      if (speakMode) {
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
        const contentWrapOpen = item.image
          ? `<div class="ex-body-content">`
          : "";
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

    wrap.querySelectorAll(".ex-input").forEach((input, k) => {
      input.id = `${uid}-in${k}`;
    });

    const showAllBtn = document.createElement("button");
    showAllBtn.className = "ex-show-all-btn";
    showAllBtn.textContent = "📋 Hiện tất cả đáp án";
    showAllBtn.addEventListener("click", () => {
      wrap
        .querySelectorAll(".ex-answer")
        .forEach((el) => el.classList.remove("hidden"));
      wrap
        .querySelectorAll(".ex-explain-btn")
        .forEach((el) => el.classList.add("hidden"));
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
        if (explainBtn && ans.classList.contains("hidden")) {
          explainBtn.classList.remove("hidden");
        }
      });
    });

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
          return;
        }
        if (ok) {
          fb.textContent = "✅ Chính xác!";
          fb.classList.add("ex-ok");
        } else {
          fb.textContent = "❌ Chưa đúng, thử lại hoặc xem giải thích.";
          fb.classList.add("ex-ng");
        }
        if (explainBtn && ans.classList.contains("hidden")) {
          explainBtn.classList.remove("hidden");
        }
      });
    });

    wrap.querySelectorAll(".ex-input").forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.preventDefault();
      });
    });

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
}
