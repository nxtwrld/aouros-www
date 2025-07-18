import { writable, type Writable, get } from "svelte/store";
import { type Profile } from "$lib/types.d";

const store: Writable<Profile> = writable();

export default {
  ...store,
  get: () => get(store),
};
