import { writable, type Writable } from "svelte/store";
import { type Patient } from "$slib/med/types.d";


const store: Writable<Patient> = writable();



export default store;