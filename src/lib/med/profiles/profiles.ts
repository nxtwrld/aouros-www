import { writable, type Writable, get } from "svelte/store";
import { type Profile } from "$slib/med/types.d";
import type { set } from "$lib/vault";
import { loadProfiles } from ".";

export const profilesStore: Writable<Profile[]> = writable([]);


async function update() {
    profilesStore.set(await loadProfiles());
}


export default {
    subscribe: profilesStore.subscribe,
    set: profilesStore.set,
    get: () => get(profilesStore),
    update
};
