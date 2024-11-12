import lab from './lab.properties.json';
import vital from './vital.properties.json';
import type { SelectOptions } from '$components/forms/Select.svelte';

export type Property = {
    key: string;
    term: string;
    loinc_code?: string;
    units?: string;
    type?: string;
    description?: string;
    category?: string;
    system?: string;
    high?: string;
    low?: string;
    links?: string[];
}

export const properties: Property[] = [...lab, ...vital].sort((a, b) => a.term.localeCompare(b.term));

export default properties;


export const propertyOptions: SelectOptions = properties.map(p => ({ key: p.key, value: p.term }));

export let propertyByKeys: { [key: string]: Property } = properties.reduce((acc, p) => {
    acc[p.key] = p;
    return acc;
}, {} as { [key: string]: Property });

// list all properties keyed by loinc code or key if no loinc code is defined
export const propertyByLoinc:  { [key: string]: Property } = properties.reduce((acc, p) => {
    if (p.loinc_code && p.loinc_code != 'unknown') acc[p.loinc_code] = p;
    else acc[p.key] = p;
    return acc;
}, {} as { [key: string]: Property });