import { browser } from "$app/environment";
import { init, register, _, t, locale } from "svelte-i18n";
import { get } from "svelte/store";

const defaultLocale = "en";

const languages = {
  en: "English",
  cs: "Czech",
  de: "German",
};

register("en", () => import("./locales/en.json"));
register("cs", () => import("./locales/cs-CZ.json"));
register("de", () => import("./locales/de-DE.json"));

init({
  fallbackLocale: defaultLocale,
  initialLocale: browser ? window.navigator.language : defaultLocale,
});

function getLocale() {
  return get(locale);
}

function getLanguage() {
  return get(t)("languages." + getLocale());
}

function getLanguageEnglishName() {
  const locale = getLocale();
  return locale ? languages[locale as keyof typeof languages] : "English";
}

export { _, t, getLocale, getLanguage, getLanguageEnglishName };
