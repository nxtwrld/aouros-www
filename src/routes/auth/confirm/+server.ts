// src/routes/auth/confirm/+server.ts
import type { EmailOtpType } from '@supabase/supabase-js'
import { error, redirect } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const token_hash = url.searchParams.get('token_hash')
  const type = 'email'; //url.searchParams.get('type') as EmailOtpType | null
  const next = url.searchParams.get('next') ?? '/med'

 /**
   * Clean up the redirect URL by deleting the Auth flow parameters.
   *
   * `next` is preserved for now, because it's needed in the error case.
   */
  const redirectTo = new URL(url)
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {

    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {

      const { data: { user } } = await supabase.auth.getUser();

      // check profiles table if the user is already exists
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`email, avatar_url, vcard, role, status, created_at, last_seen_at`)
          .eq('id', user.id)
          .single()

        if (profileError) {
          redirectTo.pathname = '/account'
        }
        redirectTo.searchParams.delete('next')
        redirect(303, redirectTo)
      }
    }
  }

  //redirectTo.pathname = '/auth/error';
  //redirect(303, redirectTo)
}