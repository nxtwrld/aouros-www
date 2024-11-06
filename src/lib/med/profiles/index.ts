import profiles from './profiles';
import profile from './profile';
import user from "$slib/user"
import { getClient } from "$slib/supabase"


export async function loadProfile(id: string) {
    const supabase = getClient();
    const { data, error } = await supabase.from('profiles').select('id, vcard, health, fullName, language, avatarUrl, birthDate, insurance, publicKey').eq('id', id).single();
    
    if (error) {
        throw error;
    }
    return data;
}


export async function loadProfiles() {
    const supabase = getClient();
    const { data , error } = await supabase.from('profile-connect').select('profiles!profile-connect_profile_id_fkey(id, vcard, health, fullName, language, avatarUrl, birthDate, insurance, publicKey)').eq('parent_id', user.getId());
    if (error) {
        throw error;
    }

    

    return data.map(d => {
        return {
            ...d.profiles,
            insurance: JSON.parse(d.profiles.insurance),
            health: JSON.parse(d.profiles.health),
            vcard: JSON.parse(d.profiles.vcard)
        }
    }) as any[];

}

export { profiles, profile };