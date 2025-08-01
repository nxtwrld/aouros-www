/**
 * Type definitions for file processing
 */

export interface ProcessedPage {
  page: number;
  type?: string;
  text: string;
  image?: string;
  thumbnail?: string;
}

export interface ProcessedFile {
  pages: ProcessedPage[];
  documents: Array<{
    title: string;
    language: string;
    pages: number[];
  }>;
}
