
import { error, json } from '@sveltejs/kit';

/** @type {import('./$types.d').RequestHandler} */
export async function GET({ request, locals: { supabase, safeGetSession }}) {

    console.log('GET user');
    
    try {
        const { session } = await safeGetSession();

        if (!session) {
            return error(401, { message: 'Unauthorized' });
        }

        const { data: { user: userSession }, error: userError } = await supabase.auth.getUser();
        if (userError || !userSession) {
            console.error('[API] /v1/med/user - Auth error:', userError);
            return error(401, { message: 'Authentication failed' });
        }
    const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`fullName, subscription, publicKey, avatarUrl, auth_id, id, language, private_keys(privateKey, key_hash, key_pass)`)
    .eq('auth_id', userSession?.id)
    .single()

    const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('profiles, scans')
    .eq('id', userSession?.id)
    .single()



    if (profileError) {
        if (profileError.code === 'PGRST116') {
            return error(404, { message: 'Profile not found' });
        } else {
            throw profileError;
        }
    }
    if (subscriptionError) {
        throw subscriptionError;
    }

    (profile as any).subscriptionStats = {
        ...subscription,
        default_scans: 10,
        default_profiles: 5
    };

    return json(profile);
    } catch (authError) {
        console.error('[API] /v1/med/user - Unexpected error:', authError);
        return error(500, { message: 'Internal server error' });
    }
}

