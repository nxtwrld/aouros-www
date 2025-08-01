// Shared types for import functionality
// This file contains types that are used both client and server side
// DO NOT import any server-only modules here

import type { TokenUsage } from "$lib/ai/types.d";

export interface Assessment {
  pages: AssessmentPage[];
  documents: AssessmentDocument[];
  tokenUsage: TokenUsage;
}

export interface AssessmentDocument {
  title: string;
  date: string;
  language: string;
  isMedical: boolean;
  pages: number[];
}

export interface AssessmentPage {
  page: number;
  language: string;
  text: string;
  images: {
    type: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    data: string;
  }[];
  image?: string;
  thumbnail?: string;
}

export enum Types {
  featureDetection = "featureDetection",
  report = "report",
  laboratory = "laboratory",
  dental = "dental",
  imaging = "imaging",
  prescription = "prescription",
  immunization = "immunization",
  dicom = "dicom",
  fhir = "fhir",
}

export interface ReportAnalysis {
  type: Types;
  fhirType: string;
  fhir: any;
  cagegory: string;
  isMedical: boolean;
  tags: string[];
  hasPrescription: boolean;
  hasImmunization: boolean;
  hasLabOrVitals: boolean;
  content?: string;
  report?: any;
  signals?: any;
  text: string;
  imaging?: any;
  prescriptions?: any;
  immunizations?: any;
  results?: {
    test: string;
    value: string;
    unit: string;
    reference: string;
  }[];
  recommendations?: string[];
  tokenUsage: TokenUsage;
  // Add missing properties that are being accessed in the code
  title?: string;
  summary?: string;
}
