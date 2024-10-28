import type { VCard } from "$lib/contact/types.d";

export enum SexEnum {
    male,
    female
}

export interface Patient extends VCard {
    uid: string;
    name: string;
    sex : SexEnum,
    birthdate: Date;
    location: string;
}



export enum ANALYZE_STEPS {
    transcript =  'transcript',
    diagnosis = 'diagnosis'
}