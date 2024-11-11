
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
    type: 'application/pdf' | 'images';
    files: string | ArrayBuffer | string[];
}

export async function processDocument(document: Document) {
    const payload = {
        text: document.pages.reduce((acc, page) => acc + page.text, '')
    };
    console.log('Processing document', document.title);

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