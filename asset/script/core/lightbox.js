export function wireImageLightbox() {
  if (window.__exLightboxWired) return;
  window.__exLightboxWired = true;
  document.addEventListener("click", (e) => {
    const img = e.target.closest(".ex-zoomable");
    if (!img) return;
    const box = document.createElement("div");
    box.className = "ex-lightbox";
    const big = document.createElement("img");
    big.src = img.src;
    big.alt = img.alt || "";
    box.appendChild(big);
    box.addEventListener("click", () => box.remove());
    document.addEventListener("keydown", function esc(ev) {
      if (ev.key === "Escape") {
        box.remove();
        document.removeEventListener("keydown", esc);
      }
    });
    document.body.appendChild(box);
  });
}
