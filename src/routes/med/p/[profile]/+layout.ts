
import type { PageLoad } from './$types';
import { profileList } from '$slib/med/patients/store';
import { type Profile } from '$slib/med/types.d.ts';


export const prerender = false;
 
export const load = (async ({ params}) => {

    const profile: Profile = profileList.find(profile => profile.uid === params.profile);



    if (!profile) {
        return {
            status: 404,
            error: new Error(`Profile ${params.profile} not found`)
        };
    }


    return { 
        profile
    };

}) satisfies PageLoad;