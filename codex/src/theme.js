const STORAGE_KEY = "portfolio-lab-theme";
const listeners = new Set();

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || "system";
}

export function resolveTheme(theme = getTheme()) {
  return theme === "system" ? getSystemTheme() : theme;
}

export function applyTheme(theme = getTheme()) {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#101417" : "#f5efe4");
  listeners.forEach((listener) => listener({ theme, resolved }));
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme() {
  const next = resolveTheme() === "dark" ? "light" : "dark";
  setTheme(next);
}

export function initializeTheme() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", () => {
    if (getTheme() === "system") {
      applyTheme("system");
    }
  });

  applyTheme();
}

export function onThemeChange(listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}
