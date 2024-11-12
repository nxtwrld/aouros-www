import { writable, type Writable, get } from "svelte/store";
import { type Profile } from "$lib/med/types.d";
import profile from './profile'


export const profilesStore: Writable<Profile[]> = writable([]);

function getCustom(id: string| undefined = undefined): Profile[] | Profile{
    if (!id) {
        return get(profilesStore);
    }
    const profile =  get(profilesStore).find(p => p.id === id);

    if (!profile) {
        throw new Error('Profile not found');
    }
    return profile;
}

function setActive(id: string) {
    const p = getCustom(id) as Profile;
    profile.set(p);
}


export default {
    subscribe: profilesStore.subscribe,
    set: profilesStore.set,
    setActive,
    get: getCustom,
};
