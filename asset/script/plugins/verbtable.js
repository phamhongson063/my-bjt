import { SectionPlugin } from "./base.js";
import { bilingual, escAttr, furi } from "../core/utils.js";

export class VerbTablePlugin extends SectionPlugin {
  static type = "verbtable";

  render(section) {
    const wrap = document.createElement("div");
    wrap.className = "vtable-wrap";
    const col = section.columns || {};
    const cP = col.plain || "普通形";
    const cS = col.sonkeigo || "尊敬語";
    const cK = col.kenjougo || "謙譲語";
    const hasEx = !!(col.example || (section.rows || []).some((r) => r.example));
    const cE = col.example || "例文";
    const cell = (v) =>
      v && String(v).trim()
        ? furi(v).replace(/／/g, '<span class="vt-slash">／</span>')
        : '<span class="vt-empty">—</span>';
    const exCell = (r) => {
      const vi = r.exampleVi
        ? `<div class="vt-ex-vi explain-vi">${r.exampleVi}</div>`
        : "";
      return `<div class="vt-c vt-ex" data-label="${escAttr(cE)}">${cell(
        r.example
      )}${vi}</div>`;
    };
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
            ${hasEx ? exCell(r) : ""}
          </div>`;
      })
      .join("");
    const note =
      section.note || section.note_jp
        ? `<div class="vt-note">${bilingual(section.note, section.note_jp)}</div>`
        : "";
    wrap.innerHTML = `
        <div class="vtable${hasEx ? " vt-4col" : ""}">
          <div class="vt-row vt-head">
            <div class="vt-c vt-plain">${cP}</div>
            <div class="vt-c vt-son">${cS}</div>
            <div class="vt-c vt-ken">${cK}</div>
            ${hasEx ? `<div class="vt-c vt-ex">${cE}</div>` : ""}
          </div>
          ${rows}
        </div>
        ${note}`;
    return wrap;
  }
}
