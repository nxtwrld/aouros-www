import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_KEY} from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from "$env/static/public";
import { getClient } from "$lib/supabase";

export async function loadSubscription(userId?: string): Promise<{
    profiles: number;
    scans: number;
} | null> {
    
    // If userId not provided, fall back to client auth (for backward compatibility during migration)
    let userIdToUse = userId;
    
    if (!userIdToUse) {
        const supabaseAnon = getClient();
        const { data: { user: userSession }, error: userError } = await supabaseAnon.auth.getUser();
        if (userError || !userSession) {
            throw userError;
        }
        userIdToUse = userSession.id;
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('profiles, scans')
        .eq('id', userIdToUse)
        .single()

    if (error) {
        throw error;
    }

    return subscription;
}


export async function updateSubscription(config: {
    profiles: number;
    scans: number;
}, userId?: string) {   
    const { profiles, scans } = config;
    
    // If userId not provided, fall back to client auth (for backward compatibility during migration)
    let userIdToUse = userId;
    
    if (!userIdToUse) {
        const supabaseAnon = getClient();
        const { data: { user: userSession }, error: userError } = await supabaseAnon.auth.getUser();
        if (userError || !userSession) {
            throw userError;
        }
        userIdToUse = userSession.id;
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error: subscriptionError } = await supabase.from('subscriptions').upsert({
        id: userIdToUse,
        profiles,
        scans,
        updated_at: new Date(),
    })

    if (subscriptionError) {
        throw subscriptionError;
    }
}