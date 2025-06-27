import { fail, redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";
import { setUser } from "$lib/user";
import { locale, waitLocale } from "svelte-i18n";
import { loadProfiles } from "$lib/profiles";
import { log } from "$lib/logging/logger";

export const load: LayoutLoad = async ({ fetch, parent, url }) => {
  const { session, user } = await parent();

  // Guard: Only proceed if we have a valid session
  if (!session || !user) {
    redirect(303, "/auth");
  }

  // fetch basic user data - now safe because we have a session
  const userData = await fetch("/v1/med/user")
    .then((r) => r.json())
    .catch((e) => {
      log.api.error("Error loading user", e);
      redirect(303, "/account");
    });
  await loadProfiles(fetch);

  // setting up locale

  if (
    userData &&
    userData.fullName &&
    userData.private_keys &&
    userData.publicKey
  ) {
    locale.set(userData.language || "en");
    await waitLocale();

    // Pass the user session to avoid auth calls during hydration
    await setUser(userData, user);

    return {};
  } else {
    redirect(303, "/account");
  }
};

export const trailingSlash = "always";
