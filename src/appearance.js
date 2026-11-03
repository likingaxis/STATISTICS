const root = document.documentElement;
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/></svg>';
let transition;
export function themeControl() {
  const dark = root.dataset.theme !== "light";
  return `<button class="theme-toggle" type="button" aria-label="Switch to ${dark ? "light" : "dark"} theme" aria-pressed="${dark}" title="Switch to ${dark ? "light" : "dark"} theme">${dark ? moon : sun}<span>${dark ? "Dark" : "Light"}</span><span class="theme-track" aria-hidden="true"></span></button>`;
}
function updateControl() {
  const button = document.querySelector(".theme-toggle");
  const dark = root.dataset.theme !== "light";
  if (button) {
    button.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} theme`);
    button.setAttribute("title", `Switch to ${dark ? "light" : "dark"} theme`);
    button.setAttribute("aria-pressed", String(dark));
    button.innerHTML = `${dark ? moon : sun}<span>${dark ? "Dark" : "Light"}</span><span class="theme-track" aria-hidden="true"></span>`;
  }
  document.querySelector('meta[name="theme-color"]').content = dark ? "#151416" : "#f8f6f5";
}
export function bindAppearance() {
  updateControl();
  document.querySelector(".theme-toggle")?.addEventListener("click", () => {
    const apply = () => {
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      try { localStorage.setItem("statistics-theme", root.dataset.theme); } catch { /* Appearance still works when storage is unavailable. */ }
      updateControl();
    };
    transition?.skipTransition();
    if (document.startViewTransition && !reducedMotion()) {
      transition = document.startViewTransition(apply);
    } else apply();
  });
}
window.addEventListener("storage", (event) => {
  if (event.key !== "statistics-theme") return;
  root.dataset.theme = event.newValue === "light" ? "light" : "dark";
  updateControl();
});
