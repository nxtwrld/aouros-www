
import type { PageServerLoad } from './$types';
import { profiles as store }  from '$slib/med/profiles';
import { loadProfiles } from '$slib/med/profiles';
import { setClient } from '$slib/supabase';


export const prerender = false;
 
export const load = (async ({ locals: { supabase } }) => {
    

    const profiles = await loadProfiles();
    
    store.set(profiles || []);

    console.log('loading.profiles...')
    return { 
        profiles : profiles || []
    };

}) satisfies PageServerLoad;