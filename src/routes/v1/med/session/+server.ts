
import { error, json } from '@sveltejs/kit';
import { analyze } from '$lib/med/session/analyzeConversation';

/** @type {import('./$types.d').RequestHandler} */
export async function POST({ request }) {
	//const str = url.searchParams.get('drug');


    const data = await request.json();
    if (data.text === undefined) {
        error(400, { message: 'No  text provided' });
    }


    const result = await analyze(data);
    

    return json(result);
}

