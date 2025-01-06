
import type { LayoutLoad } from './$types';
import { loadProfiles } from '$lib/profiles';

export const prerender = false;
 
export const load: LayoutLoad = (async ({ fetch, parent }) => {
    await parent();
    console.log('loading.profiles...')

    // fetch profiles
    await loadProfiles(fetch);

    return {};

}) satisfies LayoutLoad;