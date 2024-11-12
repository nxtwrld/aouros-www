
import { error, json } from '@sveltejs/kit';


/** @type {import('./$types.d').RequestHandler} */
export async function GET({ request, locals: { supabase, safeGetSession }}) {


    const { session } = await safeGetSession();

    if (!session) {
      return error(401, { message: 'Unauthorized' });
    }


    const { data , error: errorDb } = await supabase.from('profiles_links')
        .select('profiles!profiles_links_profile_id_fkey(id, auth_id, owner_id, fullName, language, avatarUrl, publicKey), status')
        .eq('parent_id', session.user.id);

    if (errorDb) {
        return error(500, { message: 'Database error' });
    }


    return json(data);
}



