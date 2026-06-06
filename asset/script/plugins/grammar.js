import { SectionPlugin } from "./base.js";
import { bilingual, escAttr } from "../core/utils.js";

export class GrammarPlugin extends SectionPlugin {
  static type = "grammar";

  render(section) {
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
}
