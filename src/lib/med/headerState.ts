import {writable,  type Writable } from "svelte/store";
import { type Profile } from "./types.d";

export type HeaderState = {
    title: string;
    user: Profile | null;
    profile: Profile | null;    
    showBack: boolean;
};


export const headerState: Writable<HeaderState> = writable({
    title: "Med",
    user: null,
    profile: null,
    showBack: false
});



export function setProfile(profile: Profile) {
    headerState.update(state => ({...state, profile}));
}


export default headerState;

