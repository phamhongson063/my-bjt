const TOC_MACRO = {
  dialogue: { label: "💬 Hội thoại", priority: 1 },
  vocab: { label: "📖 Học mẫu", priority: 2 },
  grammar: { label: "📚 Học mẫu", priority: 2 },
  verbtable: { label: "📖 Tra cứu", priority: 2 },
  reading: { label: "📰 Đọc hiểu", priority: 3 },
  quiz: { label: "✏️ Luyện tập", priority: 4 },
  roleplay: { label: "🎭 Đóng vai", priority: 5 },
  tips: { label: "💡 Ghi chú", priority: 5 },
};

function shortenSectionTitle(t) {
  return (t || "").replace(/\s*\((?:trang|Track)[^)]*\)\s*$/i, "").trim();
}

function expandToc() {
  const toc = document.getElementById("lessonToc");
  const btn = document.getElementById("tocToggle");
  toc.classList.add("expanded");
  if (btn) btn.setAttribute("aria-expanded", "true");
}

function collapseToc() {
  const toc = document.getElementById("lessonToc");
  const btn = document.getElementById("tocToggle");
  toc.classList.remove("expanded");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

export function buildTocMenu(lesson) {
  const toc = document.getElementById("lessonToc");
  const list = document.getElementById("tocList");
  if (!toc || !list) return;

  const groups = [];
  let cur = null;
  lesson.sections.forEach((section, idx) => {
    const macro = TOC_MACRO[section.type] || {
      label: section.title,
      priority: 99,
    };
    if (cur && cur.priority === macro.priority) {
      cur.count++;
    } else {
      cur = {
        label: macro.label,
        priority: macro.priority,
        startIdx: idx,
        count: 1,
      };
      groups.push(cur);
    }
  });

  list.innerHTML = "";
  groups.forEach((g) => {
    const item = document.createElement("a");
    item.href = `#section-${g.startIdx}`;
    item.className = "toc-item";
    item.textContent =
      g.count === 1
        ? shortenSectionTitle(lesson.sections[g.startIdx].title)
        : `${g.label} (${g.count} mục)`;
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById(`section-${g.startIdx}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      collapseToc();
    });
    list.appendChild(item);
  });
  toc.classList.remove("hidden");
}

export function initToc() {
  document.getElementById("tocToggle").addEventListener("click", (e) => {
    e.stopPropagation();
    const toc = document.getElementById("lessonToc");
    if (toc.classList.contains("expanded")) collapseToc();
    else expandToc();
  });
  document.addEventListener("click", (e) => {
    const toc = document.getElementById("lessonToc");
    if (!toc.contains(e.target) && toc.classList.contains("expanded"))
      collapseToc();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") collapseToc();
  });
}
