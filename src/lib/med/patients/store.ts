import { writable, type Writable, get } from "svelte/store";
import { type Profile } from "$slib/med/types.d.ts";
import profilesDummy from "./profiles.json";



export const profiles: Writable<Profile[]> = writable(profilesDummy);


export const profileList = get(profiles)

export default profiles
