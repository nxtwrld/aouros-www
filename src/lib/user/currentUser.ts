import { writable } from 'svelte/store';

export interface UserState {
  soundEffects: boolean;
}

const defaultState: UserState = {
  soundEffects: true,
};

export const state = writable<UserState>(defaultState); 