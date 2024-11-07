import profiles from './profiles';
import profile from './profile';
import user from "$slib/user"
import { getClient } from "$slib/supabase"
import type Insurance from '$scomponents/onboarding/Insurance.svelte';
import type { Profile } from '$slib/med/types.d';


export async function loadProfile(id: string): Promise<Profile> {
    const supabase = getClient();
    //const { data, error } = await supabase.from('profiles').select('id, vcard, health, fullName, language, avatarUrl, birthDate, insurance, publicKey').eq('id', id).single();
    const { data , error } = await supabase.from('profiles_links')
    .select('profiles!profiles_links_profile_id_fkey(id, vcard, health, fullName, language, avatarUrl, birthDate, insurance, publicKey), status')
    .eq('profile_id', id)
    .eq('parent_id', user.getId()).single();
    if (error) {
        throw error;
    }
    return {
        ...data.profiles,
        status: data.status,
        insurance: JSON.parse(data.profiles.insurance),
        health: JSON.parse(data.profiles.health),
        vcard: JSON.parse(data.profiles.vcard)
    } as Profile;
}


export async function loadProfiles(): Promise<Profile[]> {

    const supabase = getClient();
    const { data , error } = await supabase.from('profiles_links')
        .select('profiles!profiles_links_profile_id_fkey(id, vcard, health, fullName, language, avatarUrl, birthDate, insurance, publicKey), status')
        .eq('parent_id', user.getId());
    if (error) {
        throw error;
    }

    return data.map(d => {
        return {
            ...d.profiles,
            status: d.status,
            insurance: JSON.parse(d.profiles.insurance),
            health: JSON.parse(d.profiles.health),
            vcard: JSON.parse(d.profiles.vcard)
        }
    }) as Profile[];

}

/** 
 *  Removes links between a parent and a profile
*/
export async function removeLinkedParent(profile_id: string) {
    const supabase = getClient();
    const { error } = await supabase.from('profiles_links').delete().eq('parent_id', profile_id).eq('profile_id', user.getId());
    if (error) {
        throw error;
    }
}

/** 
 *  Removes links between a profile and a parent
*/
export async function removeLinkedProfile(profile_id: string) {
    const supabase = getClient();
    const { error } = await supabase.from('profiles_links').delete().eq('profile_id', profile_id).eq('parent_id', user.getId());
    if (error) {
        throw error;
    }
}


export { profiles, profile };