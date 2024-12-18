import { createServerClient } from '@supabase/ssr';

import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';



const options: Handle = async ({ event, resolve }) => {
  /* SETUP CORDS for /api routes */
  if(event.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  return resolve(event);
  /*
  const response = resolve(event);
  if (event.url.pathname.startsWith('/api')) {
    response.headers.append('Access-Control-Allow-Origin', `*`);
  }

  return response;*/
  
};


const supabase: Handle = async ({ event, resolve }) => {

  /* SETUP CORDS for /api routes */
  /*
    if(event.request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }


  /**
   * Creates a Supabase client specific to this server request.
   *
   * The Supabase client gets the Auth token from the request cookies.
   */
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {

      get: (key) => event.cookies.get(key),
      /**
       * SvelteKit's cookies API requires `path` to be explicitly set in
       * the cookie options. Setting `path` to `/` replicates previous/
       * standard behavior.
       */
      set: (key, value, options) => {
        console.log('SET COOKIE', key, value, options)
        event.cookies.set(key, value, { ...options, path: '/' })
      },
      remove: (key, options) => {
        event.cookies.delete(key, { ...options, path: '/' })
      },
    },
  })


  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function also calls `getUser()` to validate the
   * JWT before returning the session.
   */
  event.locals.safeGetSession = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await event.locals.supabase.auth.getSession()

    if (sessionError) {
      // JWT validation has failed
      console.error('Error getting session:', sessionError.message)
    }
    if (!session) {
      console.log('session is null', session);
      //return { session: null, user: null }
    }

    const {
      data: { user },
      error: userError,
    } = await event.locals.supabase.auth.getUser()
    if (userError) {
      // JWT validation has failed
      console.error('Error getting user:', userError.message)
      return { session: null, user: null }
    }

    return { session, user }
  }

  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      /**
       * Supabase libraries use the `content-range` and `x-supabase-api-version`
       * headers, so we need to tell SvelteKit to pass it through.
       */
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })

  if (event.url.pathname.startsWith('/v1')) {
        response.headers.append('Access-Control-Allow-Origin', `*`);
  }

  return response;
}

const authGuard: Handle = async ({ event, resolve }) => {
  console.log('event::::::::::::::::::::::::::::::::', event.url.pathname )
  const { session, user } = await event.locals.safeGetSession()

  event.locals.session = session;
  event.locals.user = user;

  if (!event.locals.session && event.url.pathname.startsWith('/med')) {
    return new Response(null, {
      status: 303,
      headers: { location: '/auth?redirect='+ event.url.pathname }
    })
  }

  if (event.locals.session && event.url.pathname === '/auth') {
    return new Response(null, {
      status: 303,
      headers: { location: '/account' }
    })
  }

  return resolve(event)
}

export const handle: Handle = sequence(options, supabase, authGuard);