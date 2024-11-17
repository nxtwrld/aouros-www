import type { IAnimation } from './animation.d.ts';

export interface IContext {
    name: string;
    layers?: string[];
    focus?: string[];
    animation?: IAnimation;
    objects2D?: HTMLDivElement[];
    shader?: string;
    info?: SvelteComponentConstructor;
}