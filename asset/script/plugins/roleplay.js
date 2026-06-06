import { SectionPlugin } from "./base.js";
import { bilingual, escAttr } from "../core/utils.js";

export class RoleplayPlugin extends SectionPlugin {
  static type = "roleplay";

  render(section) {
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
}
