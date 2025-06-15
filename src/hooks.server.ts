import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const supabase: Handle = async ({ event, resolve }) => {
  // Only log non-API requests to reduce noise
  if (!event.url.pathname.startsWith('/v1/')) {
    console.log(`[STEP 1] 🚀 Starting request: ${event.request.method} ${event.url.pathname}`)
  }
  
  /**
   * Creates a Supabase client specific to this server request.
   * The Supabase client gets the Auth token from the request cookies.
   */
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key: string) => event.cookies.get(key),
      set: (key: string, value: string, options: any) => {
        event.cookies.set(key, value, { ...options, path: '/' })
      },
      remove: (key: string, options: any) => {
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
    } = await event.locals.supabase.auth.getSession()
    
    if (!session) {
      return { session: null, user: null }
    }

    try {
      const {
        data: { user },
        error,
      } = await event.locals.supabase.auth.getUser()
      
      if (error) {
        return { session: null, user: null }
      }
      
      return { session, user }
    } catch (authError: any) {
      return { session: null, user: null }
    }
  }

  // CRITICAL: Await the response to ensure cookies are properly set
  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      /**
       * Supabase libraries use the `content-range` and `x-supabase-api-version`
       * headers, so we need to tell SvelteKit to pass it through.
       */
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })

  // Only log errors and non-API requests
  if (response.status >= 400 || !event.url.pathname.startsWith('/v1/')) {
    console.log(`[STEP 4] ✅ Request resolved with status: ${response.status} for ${event.url.pathname}`)
  }
  return response
}

const authGuard: Handle = async ({ event, resolve }) => {
  try {
    const { session, user } = await event.locals.safeGetSession()
    event.locals.session = session
    event.locals.user = user

    // Protect routes that require authentication
    const protectedRoutes = ['/private', '/med']
    const isProtectedRoute = protectedRoutes.some(route => event.url.pathname.startsWith(route))
    
    if (!event.locals.session && isProtectedRoute) {
      console.log(`[AUTH] 🔄 Redirecting unauthenticated user from ${event.url.pathname} to /auth`)
      redirect(303, '/auth')
    }

    // Redirect authenticated users away from auth page
    if (event.locals.session && event.url.pathname === '/auth') {
      console.log(`[AUTH] 🔄 Redirecting authenticated user to /med`)
      redirect(303, '/med')
    }

    return resolve(event)
  } catch (error) {
    console.error(`[AUTH ERROR] ❌ Auth guard failed for ${event.url.pathname}:`, error)
    throw error
  }
}

const errorHandler: Handle = async ({ event, resolve }) => {
  try {
    const response = await resolve(event)
    return response
  } catch (error) {
    console.error(`[ERROR] ❌ Unhandled error in ${event.request.method} ${event.url.pathname}:`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack?.slice(0, 200) : undefined
    })
    throw error
  }
}

export const handle: Handle = sequence(supabase, authGuard, errorHandler)