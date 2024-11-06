import { fail, redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import { loadProfile } from '$slib/med/profiles';
import { loadDocuments } from '$slib/med/documents';

export const load: LayoutServerLoad = async ({ locals: { supabase }, params }) => {
    
 
  const profile = await loadProfile(params.profile);
  const documents = await loadDocuments(params.profile);
  
  
  if (!profile) {
    redirect(303, '/med/p')
  }
  //console.log(profile)

    return { profile, documents };
 
}