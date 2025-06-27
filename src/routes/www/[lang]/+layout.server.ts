import type { LayoutServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { isValidLang } from "$lib/content/loader.server";

export const load: LayoutServerLoad = async ({ params }) => {
  const { lang } = params;

  // Validate language parameter
  if (!isValidLang(lang)) {
    throw error(404, `Language '${lang}' not supported`);
  }

  return {
    lang,
  };
};
