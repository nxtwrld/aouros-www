import { fail, redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession } }) => {
    
  const { session } = await safeGetSession()

  if (!session) {
    redirect(303, '/auth')
  }


  
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