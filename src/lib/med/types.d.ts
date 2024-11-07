import type { VCard } from "$lib/contact/types.d";

export enum SexEnum {
    male,
    female
}


export interface Profile {
    id: string;
    langauge: string;
    vcard: any;
    health: any;
    fullName: string;
    birthDate: string;
    insurance: any;
    publicKey: string;
    avatarUrl: string;
    status: string;
}


export enum ANALYZE_STEPS {
    transcript =  'transcript',
    diagnosis = 'diagnosis'
}