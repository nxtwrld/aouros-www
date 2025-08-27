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
  // Don't set initial locale here - it will be set in the layout based on user preference
  // This prevents the flicker from default to user language
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
