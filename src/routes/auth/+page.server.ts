// src/routes/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

const getURL = (redirect: string = '/') => {
  let url =
    env?.SITE_URL ??
    env?.VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:5174/'
  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`

  url = `${url}auth/confirm?next=${encodeURIComponent(redirect)}`
  //console.log('getURL', url)
  return url
}


export const load: PageServerLoad = async ({ url, locals: { safeGetSession } }) => {
  const { session } = await safeGetSession()
  const redirectPath = new URL(url).searchParams.get('redirect') || '/account'
  // if the user is already logged in return them to the account page
  if (session) {
    redirect(303, redirectPath)
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


    const redirectPath = new URL(request.url).searchParams.get('redirect') || '/account'
    const formData = await request.formData()
    const email = formData.get('email') as string
    const validEmail = /^[\w-\.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email)

    if (!validEmail) {
      return fail(400, { errors: { email: 'Please enter a valid email address' }, email })
    }
    console.log('email', email, getURL(redirectPath))
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: getURL(redirectPath)
      }
     })

    if (error) {
      console.log('error', error)
      return fail(400, {
        success: false,
        email,
        message: `There was an issue, Please contact support.`,
      })
    }
    console.log('success')
    return {
      success: true,
      message: 'Please check your email for a magic link to log into the website.',
    }
  },
}