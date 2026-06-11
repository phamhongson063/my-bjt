export function bilingual(vi, jp) {
  const vi_ = vi || "";
  const jp_ = jp || vi || "";
  return `<span class="explain-vi">${vi_}</span><span class="explain-jp">${jp_}</span>`;
}

const RT_ITEM = /^([•·・▪‣]\s?|[①-⑳]\s*)/;

export function richText(s) {
  const esc = (t) =>
    String(t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const lines = String(s == null ? "" : s).split("\n");
  let html = "";
  let inList = false;
  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (RT_ITEM.test(line)) {
      if (!inList) {
        html += '<ul class="rt-list">';
        inList = true;
      }
      html += `<li>${esc(line)}</li>`;
      continue;
    }
    closeList();
    if (/[:：]\s*$/.test(line) && line.length <= 80) {
      html += `<div class="rt-head">${esc(line)}</div>`;
    } else {
      html += `<p class="rt-p">${esc(line)}</p>`;
    }
  }
  closeList();
  return html;
}

export function bilingualRich(vi, jp) {
  const vi_ = vi || "";
  const jp_ = jp || vi || "";
  return `<div class="explain-vi">${richText(vi_)}</div><div class="explain-jp">${richText(
    jp_
  )}</div>`;
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
