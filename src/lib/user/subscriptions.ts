import { getClient } from "$slib/supabase";

export async function loadSubscription(): Promise<{
    profiles: number;
    scans: number;
}> {
    const supabase = getClient();

    const { data: { user: userSession }, error: userError } = await supabase.auth.getUser();
    if (userError || !userSession) {
        throw userError;
    }

    const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('profiles, scans')
        .eq('id', userSession?.id)
        .single()


    if (error || !subscription) {
        throw error;
    }

    return subscription;
}

