import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_KEY} from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from "$env/static/public";
import { getClient } from "$slib/supabase";

export async function loadSubscription(): Promise<{
    profiles: number;
    scans: number;
} | null> {
    
    const supabaseAnon = getClient();

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: { user: userSession }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !userSession) {
        throw userError;
    }

    const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('profiles, scans')
        .eq('id', userSession?.id)
        .single()

    if (error) {
        throw error;
    }

    return subscription;
}


export async function updateSubscription(config: {
    profiles: number;
    scans: number;
}) {   
    const supabaseAnon = getClient();
    const { profiles, scans } = config;

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: { user: userSession }, error: userError } = await supabaseAnon.auth.getUser();

    if (userError || !userSession) {
        throw userError;
    }

    const { error: subscriptionError } = await supabase.from('subscriptions').upsert({
        id: userSession?.id,
        profiles,
        scans,
        updated_at: new Date(),
    })

    if (subscriptionError) {
        throw subscriptionError;
    }
}