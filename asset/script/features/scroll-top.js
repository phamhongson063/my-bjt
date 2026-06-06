export function initScrollTop() {
  const fab = document.getElementById("scrollTopFab");
  if (!fab) return;

  fab.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const toggle = () => {
    fab.classList.toggle("visible", window.scrollY > 300);
  };
  window.addEventListener("scroll", toggle, { passive: true });
  toggle();
}
