// Enhanced Document Schema Registry - Centralized access to specialized medical schemas
// Provides document type-specific AI extraction schemas for medical specialties

import { surgicalSchema } from "./surgical";
import { pathologySchema } from "./pathology";
import { cardiologySchema } from "./cardiology";
import { radiologySchema } from "./radiology";
import { oncologySchema } from "./oncology";
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";

export interface EnhancedSchemaCapabilities {
  schema: FunctionDefinition;
  confidence: number;
  specialty: string;
  documentTypes: string[];
  processingComplexity: "low" | "medium" | "high";
  averageTokens: number;
}

export const enhancedSchemaRegistry: Record<string, EnhancedSchemaCapabilities> = {
  surgical: {
    schema: surgicalSchema,
    confidence: 0.95,
    specialty: "surgery",
    documentTypes: ["operative_report", "surgical_note", "procedure_note"],
    processingComplexity: "high",
    averageTokens: 2500,
  },
  pathology: {
    schema: pathologySchema,
    confidence: 0.92,
    specialty: "pathology",
    documentTypes: ["pathology_report", "biopsy_report", "histology_report", "cytology_report"],
    processingComplexity: "high",
    averageTokens: 3000,
  },
  cardiology: {
    schema: cardiologySchema,
    confidence: 0.90,
    specialty: "cardiology",
    documentTypes: ["ecg_report", "echo_report", "stress_test", "cardiac_cath", "holter_report"],
    processingComplexity: "medium",
    averageTokens: 2000,
  },
  radiology: {
    schema: radiologySchema,
    confidence: 0.88,
    specialty: "radiology",
    documentTypes: ["ct_report", "mri_report", "xray_report", "ultrasound_report", "mammography_report"],
    processingComplexity: "medium",
    averageTokens: 1800,
  },
  oncology: {
    schema: oncologySchema,
    confidence: 0.93,
    specialty: "oncology",
    documentTypes: ["oncology_note", "treatment_plan", "tumor_board", "chemotherapy_note"],
    processingComplexity: "high",
    averageTokens: 3500,
  },
};

/**
 * Document type patterns for automatic schema detection
 */
export const documentTypePatterns: Record<string, RegExp[]> = {
  surgical: [
    /operative\s+report/i,
    /surgical\s+procedure/i,
    /operation\s+note/i,
    /procedure\s+report/i,
    /surgery\s+performed/i,
    /intraoperative/i,
    /postoperative/i,
  ],
  pathology: [
    /pathology\s+report/i,
    /histopathology/i,
    /biopsy\s+report/i,
    /cytology\s+report/i,
    /specimen\s+examination/i,
    /microscopic\s+examination/i,
    /gross\s+description/i,
  ],
  cardiology: [
    /electrocardiogram/i,
    /ecg\s+report/i,
    /echocardiogram/i,
    /stress\s+test/i,
    /cardiac\s+catheterization/i,
    /holter\s+monitor/i,
    /cardiac\s+mri/i,
    /nuclear\s+stress/i,
  ],
  radiology: [
    /ct\s+scan/i,
    /mri\s+scan/i,
    /x-ray\s+report/i,
    /ultrasound\s+report/i,
    /mammography/i,
    /radiologic\s+examination/i,
    /imaging\s+study/i,
    /diagnostic\s+imaging/i,
  ],
  oncology: [
    /oncology\s+note/i,
    /chemotherapy/i,
    /radiation\s+therapy/i,
    /tumor\s+board/i,
    /cancer\s+treatment/i,
    /immunotherapy/i,
    /targeted\s+therapy/i,
    /oncologic\s+assessment/i,
  ],
};

/**
 * Detects document type based on content analysis
 */
export function detectDocumentType(content: string): string | null {
  const normalizedContent = content.toLowerCase();
  
  // Score each document type based on pattern matches
  const scores: Record<string, number> = {};
  
  for (const [docType, patterns] of Object.entries(documentTypePatterns)) {
    scores[docType] = 0;
    
    for (const pattern of patterns) {
      const matches = normalizedContent.match(pattern);
      if (matches) {
        scores[docType] += matches.length;
      }
    }
  }
  
  // Find the document type with the highest score
  const bestMatch = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort(([_, a], [__, b]) => b - a)[0];
  
  return bestMatch ? bestMatch[0] : null;
}

/**
 * Gets the appropriate schema for a document type
 */
export function getSchemaForDocumentType(documentType: string): EnhancedSchemaCapabilities | null {
  return enhancedSchemaRegistry[documentType] || null;
}

/**
 * Gets schema based on content analysis
 */
export function getSchemaForContent(content: string): EnhancedSchemaCapabilities | null {
  const detectedType = detectDocumentType(content);
  return detectedType ? getSchemaForDocumentType(detectedType) : null;
}

/**
 * Lists all available enhanced schemas
 */
export function listAvailableSchemas(): string[] {
  return Object.keys(enhancedSchemaRegistry);
}

/**
 * Gets schema metadata without the full schema definition
 */
export function getSchemaMetadata(schemaName: string): Omit<EnhancedSchemaCapabilities, 'schema'> | null {
  const schemaCapabilities = enhancedSchemaRegistry[schemaName];
  if (!schemaCapabilities) return null;
  
  const { schema, ...metadata } = schemaCapabilities;
  return metadata;
}

// Export individual schemas
export {
  surgicalSchema,
  pathologySchema,
  cardiologySchema,
  radiologySchema,
  oncologySchema,
};