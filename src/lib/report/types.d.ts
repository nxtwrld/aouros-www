export enum ReportComponent {
    Findings = 'findings',
    Treatment = 'treatment',
    Medication = 'medication',
    FollowUp = 'follow-up',
    Recommendations = 'recommendations',
    Paragraph = 'paragraph',
    Doctor = 'doctor'
}

export type Report = {
    [key in ReportComponent]: string;
} & {
    [key: string]: string;
};

export type ReportFinal = {
    [key in ReportComponent]?: string;
};

export interface ReportLink {
    id: string;
    title: string;
    type: string;
    metadata: {
        category: string;
        date: string;
    };
} 