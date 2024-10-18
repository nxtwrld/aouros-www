export enum SexEnum {
    male,
    female
}

export interface Profile {
    uid: string;
    name: string;
    sex : SexEnum,
    birthdate: Date;
    location: string;
    phone: string;
    email: string;

}
