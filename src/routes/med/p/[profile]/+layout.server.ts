import { fail, redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import { loadProfile } from '$slib/med/profiles';
import { loadDocuments } from '$slib/med/documents';

export const load: LayoutServerLoad = async ({ locals: { supabase }, params }) => {
    
 
  const profile = await loadProfile(params.profile);
  
    console.log(profile); 
  if (!profile || profile.status != 'approved') {
    redirect(303, '/med/p')
  }
  //console.log(profile)
  const documents = await loadDocuments(params.profile);

    return { profile, documents };
 
}