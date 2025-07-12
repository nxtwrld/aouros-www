import { writable } from 'svelte/store';
import type { ReportLink } from './types.d';

export interface ReportState {
    links: ReportLink[];
    selectedReport: ReportLink | null;
}

const defaultState: ReportState = {
    links: [],
    selectedReport: null,
};

const store = writable<ReportState>(defaultState);

export default store; 