import { PUBLIC_MIXPANEL_TOKEN } from "$env/static/public";
import mixpanel from 'mixpanel-browser';
import { createBrowserClient, createServerClient, isBrowser, parse } from '@supabase/ssr'
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'
import type { LayoutLoad } from './$types'
import { setClient } from '$slib/supabase'
import { session } from "$slib/user";

mixpanel.init(PUBLIC_MIXPANEL_TOKEN, { debug: true });


export const trailingSlash = 'always';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
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
        cookies: {
          get(key) {
            const cookie = parse(document.cookie)
            return cookie[key]
          },
        },
      })
    : createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: {
          fetch,
        },
        cookies: {
          get() {
            return JSON.stringify(data.session)
          },
        },
      })
    
  setClient(supabase)

  /**
   * It's fine to use `getSession` here, because on the client, `getSession` is
   * safe, and on the server, it reads `session` from the `LayoutData`, which
   * safely checked the session using `safeGetSession`.
   */
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  session.set(currentSession);

  return { supabase, session: currentSession, user }
}