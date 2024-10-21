import { writable, type Writable, get } from "svelte/store";
import { type Patient } from "$slib/med/types.d";
import profilesDummy from "./patients.json"

export const patientsStore: Writable<Patient[]> = writable(profilesDummy);


export const patients = get(patientsStore)

export default patientsStore
