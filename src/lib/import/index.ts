import langauges from '$data/languages.iso.json';

export enum TaskState {
    'NEW' = 'NEW',
    'ASSESSING' = 'ASSESSING',
    'ASSESSED' = 'ASSESSED',
}

export interface Task {
    title: string;
    type: 'application/pdf' | 'images';
    icon: string;
    data: string | ArrayBuffer | string[];
    state: TaskState;
    files: File[];
}



export enum DocumentState {
    NEW = 'NEW',
    ASSESSING = 'ASSESSING',
    ASSESSED = 'ASSESSED',
    PROCESSING = 'PROCESSING',
    PROCESSED = 'PROCESSED',
    ERROR = 'ERROR',
    NONMEDICAL = 'NONMEDICAL',
    CANCELED = 'CANCELED'
}

export interface Document {
    title: string;
    date: string;
    isMedical: boolean;
    state: DocumentState;
    pages: {
        page: number;
        text: string;
        image?: string;
        thumbnail?: string;
    }[];
    metadata?: {
        title: string;
        tags: string[];
        date: string;
        [key : string]: any;
    };
    content: {
        title: string;
        tags: string[];
        date: string;
        summary?: string;
        category: string;
        perfomer?: any;
        patient?: any;
        content?: string;
        localizedContent?: string;
        diagnosis?: {
            description: string;
            code?: string;
        };
        recommendations?: {
            description: string;
            urgency: number;
        }[];
        bodyParts?: {
            identification: string;
            status: string;
            treatment: string;
            urgency: number;
        }[];    

    }
    type: 'application/pdf' | 'images';
    files: string | ArrayBuffer | string[];
    task: Task;
    attachments: {
        file: string;
        type: string;
        thumbnail: string;
    }[];
}


export type DetectedProfileData = {
    fullName: string;
    birthDate?: string;
    identifier?: string;
    adr?: {
        street: string;
        city: string;
        postalCode: string;
        country: string;
    }
    insurance?: {
        number?: string;
        provider?: string;
    };
}


export async function processDocument(document: Document, lanaguage: string = 'en'): Promise<any> {
    const payload = {
        text: document.pages.reduce((acc, page) => acc + page.text, ''),
        language: langauges.find((l) => l.code === lanaguage)?.name || 'English',
    };
    //console.log('Processing document', document.title);

    const response = await fetch('/v1/import/report', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    return result;
}