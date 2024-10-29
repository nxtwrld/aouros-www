// src/routes/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types'

const getURL = (redirect: string = '/') => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:5174/'
  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`
  url = `${url}auth/confirm?next=${encodeURIComponent(redirect)}`
  console.log('url', url)
  return url
}


export const load: PageServerLoad = async ({ url, locals: { safeGetSession } }) => {
  const { session } = await safeGetSession()

  // if the user is already logged in return them to the account page
  if (session) {
    console.log('session', session)
    redirect(303, '/account')
  }

  return { url: url.origin }
}

export const actions: Actions = {
  default: async (event) => {


    const {
      url,
      request,
      locals: { supabase },
    } = event;


    const redirectPath = new URL(request.url).searchParams.get('redirect') || '/'
    const formData = await request.formData()
    const email = formData.get('email') as string
    const validEmail = /^[\w-\.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email)

    if (!validEmail) {
      return fail(400, { errors: { email: 'Please enter a valid email address' }, email })
    }

    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: getURL(redirectPath)
      }
     })

    if (error) {
      return fail(400, {
        success: false,
        email,
        message: `There was an issue, Please contact support.`,
      })
    }

    return {
      success: true,
      message: 'Please check your email for a magic link to log into the website.',
    }
  },
}