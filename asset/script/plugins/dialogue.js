import { SectionPlugin } from "./base.js";
import { bilingual, escAttr, copyJp } from "../core/utils.js";

function buildCard(section) {
  const div = document.createElement("div");
  div.className = "dialogue";
  const linesHtml = section.lines
    .map((line) => {
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

function buildFigure(section) {
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

function buildExtra(section) {
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

export class DialoguePlugin extends SectionPlugin {
  static type = "dialogue";

  render(section) {
    const frag = document.createDocumentFragment();
    const card = buildCard(section);
    if (section.image) {
      const outer = document.createElement("div");
      outer.className = "dlg-outer";
      const aside = document.createElement("aside");
      aside.className = "dlg-aside";
      aside.innerHTML = buildFigure(section);
      outer.appendChild(card);
      outer.appendChild(aside);
      frag.appendChild(outer);
    } else {
      frag.appendChild(card);
    }
    const extra = buildExtra(section);
    if (extra) {
      const extraEl = document.createElement("div");
      extraEl.className = "dlg-extra";
      extraEl.innerHTML = extra;
      frag.appendChild(extraEl);
    }
    return frag;
  }
}
