import { writable, type Writable, get } from "svelte/store";
import { type Patient } from "$slib/med/types.d";

export const profilesStore: Writable<Patient[]> = writable([]);



export default profilesStore;
