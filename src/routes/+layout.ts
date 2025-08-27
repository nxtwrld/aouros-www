import { PUBLIC_MIXPANEL_TOKEN } from "$env/static/public";
import mixpanel from "mixpanel-browser";
import {
  createBrowserClient,
  createServerClient,
  isBrowser,
  parse,
} from "@supabase/ssr";
import {
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL,
} from "$env/static/public";
import type { LayoutLoad } from "./$types";
import { setClient } from "$lib/supabase";
import { session as CurrentSession } from "$lib/user";
import "$lib/i18n"; // Import to initialize. Important :)
import { locale, waitLocale } from "svelte-i18n";
import "$lib/config/logging-config"; // Initialize logging from environment variables

mixpanel.init(PUBLIC_MIXPANEL_TOKEN, { debug: false });

export const trailingSlash = "always";

export const load: LayoutLoad = async ({ data, depends, fetch, url }) => {
  /**
   * Declare a dependency so the layout can be invalidated, for example, on
   * session refresh.
   */
  depends("supabase:auth");

  // Create supabase client with proper error handling
  const supabase = isBrowser()
    ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: {
          fetch,
        },
      })
    : createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: {
          fetch,
        },
        cookies: {
          get(key: string) {
            return data?.cookies?.find((cookie) => cookie.name === key)?.value;
          },
          set(key: string, value: string, options?: any) {
            // Server-side cookie setting not implemented in client context
          },
          remove(key: string, options?: any) {
            // Server-side cookie removal not implemented in client context
          },
        },
      });

  /**
   * Use session and user data from server (via safeGetSession)
   * instead of calling getSession/getUser directly
   */
  const session = data?.session || null;
  const user = data?.user || null;

  // Determine and set the appropriate locale
  let userLanguage = null;
  
  // If user is authenticated, try to fetch their language preference
  if (session && user) {
    try {
      // Check if we're on a route that needs user data
      const needsUserData = url.pathname.startsWith('/med') || url.pathname.startsWith('/account');
      
      if (needsUserData) {
        const userData = await fetch("/v1/med/user")
          .then(r => r.json())
          .catch(() => null);
          
        if (userData?.language) {
          userLanguage = userData.language;
        }
      }
    } catch (e) {
      // Fail silently, will use fallback
    }
  }
  
  // Set locale based on priority: user preference > browser language > default
  if (userLanguage) {
    locale.set(userLanguage);
  } else if (!import.meta.env.SSR) {
    locale.set(window.navigator.language);
  } else {
    locale.set("en");
  }

  await waitLocale();

  // Only set session and client if we have valid data
  if (session) {
    CurrentSession.set(session);
  }
  setClient(supabase);

  return { session, supabase, user };
};
