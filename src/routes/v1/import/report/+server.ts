
import { error, json } from '@sveltejs/kit';
import { analyze } from '$lib/import.server/analyzeReport';


/** @type {import('./$types.d').RequestHandler} */
export async function POST({ request }) {
	//const str = url.searchParams.get('drug');


    const data = await request.json();
    if (data.images === undefined && data.text === undefined) {
        error(400, { message: 'No image or text provided' });
    }


    const result = await analyze(data);
    

    return json(result);
}

