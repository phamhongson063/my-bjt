export function bilingual(vi, jp) {
  const vi_ = vi || "";
  const jp_ = jp || vi || "";
  return `<span class="explain-vi">${vi_}</span><span class="explain-jp">${jp_}</span>`;
}

export function escAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

export function furi(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{([^|{}]+)\|([^|{}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>");
}

export function showCopyFlash(msg) {
  let el = document.getElementById("dlgCopyFlash");
  if (!el) {
    el = document.createElement("div");
    el.id = "dlgCopyFlash";
    el.className = "dlg-copy-flash";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1400);
}

export async function copyJp(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    showCopyFlash("✓ Đã copy");
  } catch (err) {
    showCopyFlash("⚠️ Copy thất bại");
  }
}
