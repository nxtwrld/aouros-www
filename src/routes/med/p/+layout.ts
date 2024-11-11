
import type { LayoutLoad } from './$types';
import { profiles }  from '$slib/med/profiles';
import { importDocuments } from '$slib/med/documents';
import { mapProfileData } from '$slib/med/profiles';
import { loadProfiles } from '$slib/med/profiles';

export const prerender = false;
 
export const load: LayoutLoad = (async ({ fetch, parent }) => {
    await parent();
    console.log('loading.profiles...')

    // fetch profiles
    await loadProfiles(fetch);

    return {};

}) satisfies LayoutLoad;