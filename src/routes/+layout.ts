import { PUBLIC_MIXPANEL_TOKEN } from "$env/static/public";
import mixpanel from 'mixpanel-browser';
import { createBrowserClient, createServerClient, isBrowser, parse } from '@supabase/ssr'
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'
import type { LayoutLoad } from './$types'
import { setClient } from '$lib/supabase'
import { session as CurrentSession } from "$lib/user";
import '$lib/i18n' // Import to initialize. Important :)
import { locale, waitLocale } from 'svelte-i18n';


mixpanel.init(PUBLIC_MIXPANEL_TOKEN, { debug: false });


export const trailingSlash = 'always';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
  // setting up locale
  if (!import.meta.env.SSR) {
    //await setDefaultLocale(window.navigator.language)
    locale.set(window.navigator.language)
  } else {
      locale.set('en-US')
  }


  console.log('loading.auth...')
  /**
   * Declare a dependency so the layout can be invalidated, for example, on
   * session refresh.
   */
  depends('supabase:auth')
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
          getAll() {
            return data.cookies
          },
        },
      })
  /**
   * It's fine to use `getSession` here, because on the client, `getSession` is
   * safe, and on the server, it reads `session` from the `LayoutData`, which
   * safely checked the session using `safeGetSession`.
   */
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  
  await waitLocale()

  CurrentSession.set(session)
  setClient(supabase)

  return { session, supabase, user }
}