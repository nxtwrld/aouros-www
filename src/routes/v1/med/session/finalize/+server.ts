
import { error, json } from '@sveltejs/kit';
import { finalize } from '$lib/med/session/finalizeReport';

/** @type {import('./$types.d').RequestHandler} */
export async function POST({ request }) {
	//const str = url.searchParams.get('drug');


    const data = await request.json();
    if (data.text === undefined) {
        error(400, { message: 'No  text provided' });
    }


    const result = await finalize(data);
    

    return json(result);
}

