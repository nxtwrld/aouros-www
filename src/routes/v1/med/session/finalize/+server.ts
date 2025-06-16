
import { error, json } from '@sveltejs/kit';
import { finalize } from '$lib/session/finalizeReport';

/** @type {import('./$types.d').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession, user } }) {

    const { session } = await safeGetSession()

    if (!session || !user) {
        error(401, { message: 'Unauthorized' });
    }


    const data = await request.json();
    if (data.text === undefined) {
        error(400, { message: 'No  text provided' });
    }


    const result = await finalize(data);
    

    return json(result);
}

