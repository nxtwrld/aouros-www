//import { createClient } from "@supabase/supabase-js";
//import { env } from '$env/dynamic/public'
import type { SupabaseClient } from "@supabase/supabase-js";

const clients = new Map<string, SupabaseClient>();


export function setClient(client: SupabaseClient, clientName: string = 'default') {
    clients.set(clientName, client);
}


export function getClient(clientName: string = 'default'): SupabaseClient {
    const client = clients.get(clientName);
    if (client == undefined) throw new Error(`Client ${clientName} not found`);
    return client;
}