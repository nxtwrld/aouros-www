import { PUBLIC_MIXPANEL_TOKEN } from "$env/static/public";
import mixpanel from 'mixpanel-browser';
import { createBrowserClient, createServerClient, isBrowser, parse } from '@supabase/ssr'
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'
import type { LayoutLoad } from './$types'
import { setClient } from '$lib/supabase'
import { session } from "$lib/user";
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
        cookies: {
          get(key) {
            const cookie = parse(document.cookie)
            console.log('COOKIE', key, cookie[key])
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
/*
  const tasks = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
    waitLocale()
  ])

  const currentSession = tasks[0].data.session
  const user = tasks[1].data.user*/
  
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession()


  const {
    data: { user }
  } = (currentSession) ? await supabase.auth.getUser() : { data: { user: null } }

  await waitLocale()

  //console.log('TASKS', tasks);
  if (currentSession == null) console.log('session is null');
  else console.log('sesion is correct')
  session.set(currentSession);



  return { supabase, session: currentSession, user }
}