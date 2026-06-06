import { SectionPlugin } from "./base.js";
import { bilingual, escAttr } from "../core/utils.js";
import { playSegment } from "../core/audio.js";

export class VocabPlugin extends SectionPlugin {
  static type = "vocab";

  render(section) {
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
}
