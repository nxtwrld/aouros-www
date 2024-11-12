import { fail, redirect } from '@sveltejs/kit'
import type { LayoutLoad } from './$types'
import type { Profile } from '$lib/med/types.d';
import { profiles, profile} from '$lib/med/profiles';
import { importDocuments } from '$lib/med/documents';

export const load: LayoutLoad = async ({ parent, params, fetch }) => {
  await parent();

  console.log('loading.profile...')
  // profiles are already preloaded - just select it
  const p = profiles.get(params.profile) as Profile;
  
  if (!p) {
    // profile not found
    redirect(303, '/med/p')
  }

  // set the profile
  profile.set(p);

  const documentsResponse = await fetch(`/v1/med/profiles/${params.profile}/documents`);

  if (documentsResponse.status === 401) {
    fail(401, 'Unauthorized');
  }

  if (documentsResponse.status !== 200) {
    fail(documentsResponse.status, 'Error loading documents');
  }

  const documents = await importDocuments(await documentsResponse.json());

  return { };
 
}