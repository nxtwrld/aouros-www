import { writable } from "svelte/store";
import type { Writable } from "svelte/store";
import type { IContext } from "./context/types.d.ts";
import focused from '$lib/focused';
import ui from '$lib/ui';

export interface State {
    context?: IContext;
}

export const store: Writable<State> = writable({} as State);

ui.on('context', (context: IContext) => {
    store.update((state) => {
        state.context = context;
        if (context && context.focus && context.focus[0]) {
            focused.set({ object: context.focus[0]});
        } else {
            focused.set({ object: null});
        }

        return state;
    });
});



export default store;