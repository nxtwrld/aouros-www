import type { VCard } from "$lib/contact/types.d";

export enum SexEnum {
    male,
    female
}


export interface Profile {
    id: string;
    language: string;
    vcard: any;
    health: any;
    fullName: string;
    insurance: any;
    publicKey: string;
    avatarUrl: string;
    status: string;
    publicKey: string;
    language: string;
    profileDocumentId: string;
    healthDocumentId: string;
}

export interface ProfileNew {
    fullName: string;
    birthDate?: string;
    language?: string;
    insurance?: any;
    vcard?: VCard;
    health?: any;
}


export enum ANALYZE_STEPS {
    transcript =  'transcript',
    diagnosis = 'diagnosis'
}



export type Signal = {
    signal: string;
    value: any;
    unit: string;
    reference: string;
    date: string;
    urgency?: number;
    source?: 'input' | string;
}

