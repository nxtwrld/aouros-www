
import type { LayoutLoad } from './$types';
import { profiles }  from '$lib/med/profiles';
import { importDocuments } from '$lib/med/documents';
import { mapProfileData } from '$lib/med/profiles';
import { loadProfiles } from '$lib/med/profiles';

export const prerender = false;
 
export const load: LayoutLoad = (async ({ fetch, parent }) => {
    await parent();
    console.log('loading.profiles...')

    // fetch profiles
    await loadProfiles(fetch);

    return {};

}) satisfies LayoutLoad;