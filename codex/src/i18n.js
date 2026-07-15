import { fallbackTranslations } from "./data/fallback-translations.js";

const STORAGE_KEY = "portfolio-lab-locale";
let currentLocale = localStorage.getItem(STORAGE_KEY) || "zh";
let translations = structuredClone(fallbackTranslations);
const listeners = new Set();

function getNestedValue(target, path) {
  return path.split(".").reduce((accumulator, segment) => accumulator?.[segment], target);
}

async function loadLocaleFile(locale) {
  try {
    const response = await fetch(`./locales/${locale}.json`);

    if (!response.ok) {
      throw new Error(`Locale fetch failed: ${response.status}`);
    }

    const data = await response.json();
    translations[locale] = {
      ...translations[locale],
      ...data
    };
  } catch (error) {
    translations[locale] = fallbackTranslations[locale];
  }
}

export async function initializeI18n() {
  await Promise.all(["zh", "en"].map(loadLocaleFile));
}

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  currentLocale = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  listeners.forEach((listener) => listener(locale));
}

export function onLocaleChange(listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function t(path, locale = currentLocale) {
  return getNestedValue(translations[locale], path) ?? getNestedValue(fallbackTranslations[locale], path) ?? path;
}

export function toggleLocale() {
  setLocale(currentLocale === "zh" ? "en" : "zh");
}
