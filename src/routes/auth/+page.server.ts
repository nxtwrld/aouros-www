import { redirect } from '@sveltejs/kit'

import type { Actions } from './$types'

export const actions: Actions = {
  signup: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData()
    const redirectPath = new URL(request.url).searchParams.get('redirect') || '/'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const password2 = formData.get('password2') as string
    

    if (password !== password2) {
      return { error: 'Passwords do not match',  action: 'signup' }
    }

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      //console.error(error)
      //throw redirect(303, '/auth/error')
      return { error : error.message, action: 'signup' }
    } else {

      throw redirect(303, '/auth/activate')
    }
  },
  login: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData()
    const redirectPath = new URL(request.url).searchParams.get('redirect') || '/'
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      //console.error(error)
      return { error : error.message, action: 'login' }
    } else {
      throw redirect(303, redirectPath)
    }
  },
}