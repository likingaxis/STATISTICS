const root = document.documentElement;
const key = "statistics-display";
const defaults = { theme: "dark", scale: 1, leading: 1.85, measure: 70, contrast: false, motion: false, lite: false };
const clamp = (v, min, max, fallback) => Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
function normalize(p) {
  p = p && typeof p === "object" ? p : {};
  return {
    theme: p.theme === "light" ? "light" : "dark",
    scale: clamp(p.scale, 1, 1.35, 1),
    leading: clamp(p.leading, 1.6, 2.2, 1.85),
    measure: clamp(p.measure, 56, 80, 70),
    contrast: p.contrast === true,
    motion: p.motion === true,
    lite: p.lite === true,
  };
}
function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    return normalize(saved || { theme: localStorage.getItem("statistics-theme") });
  } catch { return { ...defaults }; }
}
let preferences = readPreferences();
let transition;
export const reducedMotion = () => preferences.motion || preferences.lite || matchMedia("(prefers-reduced-motion: reduce)").matches;
const sliders = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7h7m5 0h4M4 17h3m5 0h8"/><circle cx="13.5" cy="7" r="2.5"/><circle cx="9.5" cy="17" r="2.5"/></svg>';
const close = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/></svg>';
const spark = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></svg>';
const feather = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>';

export function themeControl() {
  return `<div class="display-controls">
    <button class="lite-trigger" type="button" data-lite-toggle aria-pressed="${preferences.lite}" title="Toggle Lite view: flat layout without animations or glass effects">${feather}<span>Lite</span></button>
    <button class="display-trigger" type="button" popovertarget="display-panel" aria-controls="display-panel" aria-expanded="false">${sliders}<span>Display</span></button>
    <aside id="display-panel" class="display-panel" popover aria-labelledby="display-title">
      <div class="display-chrome" aria-hidden="true"><span><i></i><i></i><i></i></span><small>DISPLAY &amp; READABILITY</small></div>
      <div class="display-heading"><div><h2 id="display-title">Make room<br>for reading.</h2><p>Adjust your view. Keep your place.</p></div><button class="display-close" type="button" popovertarget="display-panel" popovertargetaction="hide" aria-label="Close display settings">${close}</button></div>
      <fieldset class="theme-options"><legend>Appearance</legend><div><button type="button" data-theme-choice="dark">${moon}<span>Dark</span></button><button type="button" data-theme-choice="light">${sun}<span>Light</span></button></div></fieldset>
      <div class="lite-mode-box">
        <div class="lite-mode-copy">
          <strong>Lite mode</strong>
          <small>Flat cards, zero animations, no glass blur—pure text and math clarity.</small>
        </div>
        <button type="button" id="reading-lite" class="lite-pill-btn" data-lite-toggle aria-pressed="${preferences.lite}">${spark}<span>Lite</span></button>
      </div>
      <div class="reading-control"><label for="reading-size"><span>Reading text size</span><output id="reading-size-value" for="reading-size"></output></label><input id="reading-size" type="range" min="100" max="135" step="5" value="${preferences.scale * 100}"><div class="range-ends"><span>A · 100%</span><span>Aa · 135%</span></div></div>
      <div class="reading-control"><label for="reading-leading"><span>Line spacing</span><output id="reading-leading-value" for="reading-leading"></output></label><input id="reading-leading" type="range" min="1.6" max="2.2" step="0.05" value="${preferences.leading}"><div class="range-ends"><span>Compact</span><span>Airy</span></div></div>
      <div class="reading-control"><label for="reading-measure"><span>Text width</span><output id="reading-measure-value" for="reading-measure"></output></label><input id="reading-measure" type="range" min="56" max="80" step="2" value="${preferences.measure}"><div class="range-ends"><span>Narrow · 56ch</span><span>Wide · 80ch</span></div></div>
      <div class="reading-switches"><label for="reading-contrast"><span>Stronger contrast<small>Clearer text and crisp borders</small></span><input id="reading-contrast" type="checkbox" ${preferences.contrast ? "checked" : ""}></label><label for="reading-motion"><span>Reduce motion<small>Your system preference is also respected</small></span><input id="reading-motion" type="checkbox" ${preferences.motion ? "checked" : ""}></label></div>
      <div class="reading-preview"><span>YOUR READING PREVIEW</span><p>With more observations, estimates become more precise.</p></div>
      <div class="display-footer"><button type="button" class="secondary" id="display-reset">Reset display</button><p>Saved on this browser.<br>Your experiments stay as they are.</p></div>
    </aside></div>`;
}
function updateRangeProgress() {
  for (const id of ["reading-size", "reading-leading", "reading-measure"]) {
    const input = document.getElementById(id);
    if (!input) continue;
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const val = Number(input.value) || min;
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    input.style.setProperty("--range-progress", `${pct.toFixed(1)}%`);
  }
}
function apply() {
  root.dataset.theme = preferences.theme;
  root.dataset.contrast = preferences.contrast ? "more" : "standard";
  root.dataset.motion = preferences.motion ? "reduce" : "standard";
  root.dataset.lite = preferences.lite ? "true" : "false";
  root.style.setProperty("--reading-scale", preferences.scale);
  root.style.setProperty("--reading-leading", preferences.leading);
  root.style.setProperty("--reading-measure", preferences.measure + "ch");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = preferences.theme === "dark" ? "#151416" : "#f8f6f5";
  for (const button of document.querySelectorAll("[data-theme-choice]")) {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === preferences.theme));
  }
  for (const button of document.querySelectorAll("[data-lite-toggle]")) {
    button.setAttribute("aria-pressed", String(preferences.lite));
  }
  const outputs = {
    "reading-size": Math.round(preferences.scale * 100) + "%",
    "reading-leading": preferences.leading.toFixed(2),
    "reading-measure": preferences.measure + " ch",
  };
  for (const [id, value] of Object.entries(outputs)) {
    const output = document.getElementById(id + "-value");
    if (output) output.textContent = value;
    document.getElementById(id)?.setAttribute("aria-valuetext", value);
  }
  updateRangeProgress();
}
function save() {
  try {
    localStorage.setItem(key, JSON.stringify(preferences));
    localStorage.setItem("statistics-theme", preferences.theme);
  } catch { /* Preferences remain usable when storage is unavailable. */ }
}
export function bindAppearance() {
  apply();
  const panel = document.getElementById("display-panel");
  const trigger = document.querySelector(".display-trigger");
  panel?.addEventListener("toggle", event => trigger?.setAttribute("aria-expanded", String(event.newState === "open")));
  for (const button of document.querySelectorAll("[data-theme-choice]")) {
    button.addEventListener("click", () => {
      if (preferences.theme === button.dataset.themeChoice) return;
      const update = () => { preferences.theme = button.dataset.themeChoice; apply(); save(); };
      transition?.skipTransition();
      if (document.startViewTransition && !reducedMotion()) transition = document.startViewTransition(update);
      else update();
    });
  }
  for (const button of document.querySelectorAll("[data-lite-toggle]")) {
    button.addEventListener("click", () => {
      transition?.skipTransition();
      preferences.lite = !preferences.lite;
      apply();
      save();
    });
  }
  for (const [id, name, divisor] of [["reading-size", "scale", 100], ["reading-leading", "leading", 1], ["reading-measure", "measure", 1]]) {
    document.getElementById(id)?.addEventListener("input", event => {
      preferences[name] = Number(event.target.value) / divisor;
      apply(); save();
    });
  }
  for (const [id, name] of [["reading-contrast", "contrast"], ["reading-motion", "motion"]]) {
    document.getElementById(id)?.addEventListener("change", event => {
      preferences[name] = event.target.checked;
      if (preferences.motion) transition?.skipTransition();
      apply(); save();
    });
  }
  document.getElementById("display-reset")?.addEventListener("click", () => {
    transition?.skipTransition(); preferences = { ...defaults }; apply(); save();
    syncInputs();
  });
}
function syncInputs() {
  const values = { "reading-size": preferences.scale * 100, "reading-leading": preferences.leading, "reading-measure": preferences.measure };
  for (const [id, value] of Object.entries(values)) { const input = document.getElementById(id); if (input) input.value = value; }
  for (const [id, name] of [["reading-contrast", "contrast"], ["reading-motion", "motion"]]) { const input = document.getElementById(id); if (input) input.checked = preferences[name]; }
  updateRangeProgress();
}
window.addEventListener("storage", event => {
  if (event.key !== key && event.key !== "statistics-theme" && event.key !== null) return;
  preferences = readPreferences(); apply(); syncInputs();
});
