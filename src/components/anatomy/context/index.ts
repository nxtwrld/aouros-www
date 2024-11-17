import type { IContext } from './types.d.ts';
import Immunity from "./Immunity";
import _objects from '$components/anatomy/objects.json';


export default {
    Immunity
}



interface AnatomyObjects {[key: string]: {
    files: string[],
    objects: string[],
    color?: string,
    opacity?: number
}};

const objects = _objects as AnatomyObjects;
const anatomyLayers: string[] = Object.keys(objects);
const anatomyObjects: {[key: string]: string} = Object.keys(objects).reduce((acc, key) => {
    objects[key].objects.forEach((obj) => {
        acc[obj.toLowerCase()] = key;
    });
    return acc;
}, {} as {[key: string]: string});



export function createContextFromTags(tags: string[], objects?: any[]): IContext {
    const layers: string[] = [];
    const focus: string[] = [];

    tags.forEach((tag) => {
        tag = tag.toLowerCase().replace(/ /ig, '_');
        if (anatomyLayers.includes(tag)) {
            layers.push(tag);
        }
        const layer = anatomyObjects[tag];
        if (layer) {
            layers.push(layer);
            focus.push(tag);
        }
    });



    return {
        name : crypto.getRandomValues(new Uint32Array(1))[0].toString(16),
        layers : [...new Set(layers)],
        focus: [...new Set(focus)]
    
    }
}