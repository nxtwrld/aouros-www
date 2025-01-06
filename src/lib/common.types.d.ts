export enum LinkType {
    Report = "report",
    Contact = "contact",
    Question = "question",
    Medication = "medication",
    Focus = "focus",
    Vaccination = "vaccination",
    Allergy = "allergy",
    Other = "other"
}

export interface Link {
    title?: string;
    uid: string;
    type: LinkType;
    details?: any;
}



