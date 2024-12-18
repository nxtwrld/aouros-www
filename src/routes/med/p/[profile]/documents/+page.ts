import type { PageLoad } from './$types'


export const load: PageLoad = async ({ parent, url }) => {
    await parent();

    const searchParams = new URLSearchParams(url.search);
    const tags = (searchParams.get('tags') || '').split(',');


    return {
        filters: {
            tags
        }
    }

}