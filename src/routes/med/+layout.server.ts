import { fail, redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import { loadUser } from '$slib/user';

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
    
  const { session } = await safeGetSession()

  if (!session) {
    redirect(303, '/auth')
  }

  const user = await loadUser();
  if (!user) {
    redirect(303, '/account')
  }

  if (user.subscription == 'individual') {
    redirect(303, '/med/p/'+user.id)
  }

  return { session, user };
 
}