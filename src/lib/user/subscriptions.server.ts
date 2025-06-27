import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY} from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from "$env/static/public";
import { getClient } from "$lib/supabase";

export async function loadSubscription(userId: string): Promise<{
    profiles: number;
    scans: number;
} | null> {
    
    if (!userId) {
        throw new Error('userId is required for loadSubscription');
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('profiles, scans')
        .eq('id', userId)
        .single()

    if (error) {
        throw error;
    }

    return subscription;
}


export async function updateSubscription(config: {
    profiles: number;
    scans: number;
}, userId: string) {   
    const { profiles, scans } = config;
    
    if (!userId) {
        throw new Error('userId is required for updateSubscription');
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: subscriptionError } = await supabase.from('subscriptions').upsert({
        id: userId,
        profiles,
        scans,
        updated_at: new Date(),
    })

    if (subscriptionError) {
        throw subscriptionError;
    }
}