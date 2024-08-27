
import { error, json } from '@sveltejs/kit';
import { analyze } from '$slib/analyzeLLM';

/** @type {import('./$types.d').RequestHandler} */
export async function POST({ request }) {
	//const str = url.searchParams.get('drug');


    const data = await request.json();
    if (data.images === undefined) {
        throw error(400, { message: 'No image provided' });
    }


    const result = await analyze(data.images);
    

    return json(result);
}

