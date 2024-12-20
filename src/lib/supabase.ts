//import { createClient } from "@supabase/supabase-js";
//import { env } from '$env/dynamic/public'
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from "$env/static/public";

const clients = new Map<string, SupabaseClient>();

/*

// curently set in layout - maybe do it here....
clients.set('default', createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY));
*/


export function setClient(client: SupabaseClient, clientName: string = 'default') {
    clients.set(clientName, client);
}


export function getClient(clientName: string = 'default'): SupabaseClient {
    const client = clients.get(clientName);
    if (client == undefined) {
        console.log(clientName, clients);
        if (clientName == 'default') {
            clients.set('default', createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY))
            return getClient();
        } else {
            throw new Error (`Supabase client ${clientName} noe found`)
        }
        
    }
    return client;
}