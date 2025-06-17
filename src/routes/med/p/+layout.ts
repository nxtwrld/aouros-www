
import type { LayoutLoad } from './$types';
import { loadProfiles } from '$lib/profiles';
import { log } from '$lib/logging/logger';

export const prerender = false;
 
export const load: LayoutLoad = (async ({ fetch, parent }) => {
    await parent();
    log.api.debug('loading.profiles...')

    // fetch profiles
    await loadProfiles(fetch);

    return {};

}) satisfies LayoutLoad;