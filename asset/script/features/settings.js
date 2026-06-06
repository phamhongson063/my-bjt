const FONT_SIZE_KEY = "bjt-font-size";
const VALID_FONT_SIZES = ["14", "16", "18", "20"];
const EXAM_MODE_KEY = "bjt-exam-mode";
const EXPLAIN_LANG_KEY = "bjt-explain-lang";
const VALID_LANGS = ["vi", "jp", "both"];

function applyFontSize(px) {
  document.documentElement.style.setProperty("--base-size", px + "px");
}

function applyExamMode(on) {
  document.body.classList.toggle("exam-mode", on);
}

function applyExplainLang(lang) {
  document.body.classList.remove("lang-vi", "lang-jp", "lang-both");
  document.body.classList.add("lang-" + lang);
}

export function initSettings() {
  const savedFontSize = localStorage.getItem(FONT_SIZE_KEY);
  if (savedFontSize && VALID_FONT_SIZES.includes(savedFontSize)) {
    applyFontSize(savedFontSize);
    document.getElementById("fontSize").value = savedFontSize;
  }
  document.getElementById("fontSize").addEventListener("change", (e) => {
    applyFontSize(e.target.value);
    localStorage.setItem(FONT_SIZE_KEY, e.target.value);
  });

  const savedExamMode = localStorage.getItem(EXAM_MODE_KEY) === "1";
  document.getElementById("examMode").checked = savedExamMode;
  applyExamMode(savedExamMode);
  document.getElementById("examMode").addEventListener("change", (e) => {
    applyExamMode(e.target.checked);
    localStorage.setItem(EXAM_MODE_KEY, e.target.checked ? "1" : "0");
  });

  const savedLang = VALID_LANGS.includes(localStorage.getItem(EXPLAIN_LANG_KEY))
    ? localStorage.getItem(EXPLAIN_LANG_KEY)
    : "vi";
  document.getElementById("explainLang").value = savedLang;
  applyExplainLang(savedLang);
  document.getElementById("explainLang").addEventListener("change", (e) => {
    applyExplainLang(e.target.value);
    localStorage.setItem(EXPLAIN_LANG_KEY, e.target.value);
  });
}
