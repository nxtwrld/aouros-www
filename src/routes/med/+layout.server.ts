import { fail, redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'




export const load: LayoutServerLoad = async ({ locals: { safeGetSession } }) => {
  const { session, user } = await safeGetSession()
  
  // The auth guard in hooks should have already redirected unauthenticated users
  if (!session) {
    console.error('[Med] No session found - redirecting to auth')
    redirect(303, '/auth')
  }
  
  console.log('[Med] Loading for user:', user?.email)
  
  
  /*
  console.log('loading.user...')
  const user = await loadUser(supabase);
  

  if (!user) {
    redirect(303, '/account')
  }
  if (user.subscription == 'individual') {
    redirect(303, '/med/p/'+user.id)
  }
*/

  return { session };
 
}