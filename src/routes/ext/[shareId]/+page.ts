import type { PageLoad } from './$types.d';

export const prerender = false;
export const ssr = false;
 
export const load = (async ({ params}) => {
    
    /*
    if (!report) {
        return {
            status: 404,
            error: new Error(`Report ${params.shareId} not found`)
        };
    }*/

    return {
        shareId: params.shareId,
    };

}) satisfies PageLoad;