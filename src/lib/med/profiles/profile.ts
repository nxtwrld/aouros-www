import { writable, type Writable } from "svelte/store";
import { type Profile } from "$slib/med/types.d";


const store: Writable<Profile> = writable();



export default store;