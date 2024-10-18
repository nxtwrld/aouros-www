
import type { PageLoad } from './$types';
import { profileList } from '$slib/med/patients/store';




export const prerender = false;
 
export const load = (async ({ params}) => {
    
    /*
    if (!product) {
        return {
            status: 404,
            error: new Error(`Product ${params.product} not found`)
        };
    }
*/

    return { 
        profiles   : profileList
    };

}) satisfies PageLoad;