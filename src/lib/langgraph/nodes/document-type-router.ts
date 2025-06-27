// Document Type Router Node - Intelligent routing based on document content analysis
// Selects appropriate specialized schema for enhanced medical document processing

import type { DocumentProcessingState } from "../state";
import { 
  detectDocumentType, 
  getSchemaForDocumentType,
  enhancedSchemaRegistry,
  type EnhancedSchemaCapabilities 
} from "$lib/configurations/enhanced";
import { FEATURE_FLAGS } from "$lib/utils/feature-flags";

export interface DocumentTypeAnalysis {
  detectedType: string | null;
  confidence: number;
  alternativeTypes: Array<{ type: string; confidence: number }>;
  contentFeatures: {
    medicalTermDensity: number;
    structuredData: boolean;
    reportLength: number;
    specialtyIndicators: string[];
  };
  schemaRecommendation: EnhancedSchemaCapabilities | null;
}

export class DocumentTypeRouter {
  /**
   * Analyzes document content to determine optimal processing schema
   */
  static analyzeDocumentType(
    content: string,
    metadata?: Record<string, any>
  ): DocumentTypeAnalysis {
    const analysis: DocumentTypeAnalysis = {
      detectedType: null,
      confidence: 0,
      alternativeTypes: [],
      contentFeatures: this.extractContentFeatures(content),
      schemaRecommendation: null,
    };

    // Primary detection using pattern matching
    const primaryDetection = detectDocumentType(content);
    
    if (primaryDetection) {
      analysis.detectedType = primaryDetection;
      analysis.schemaRecommendation = getSchemaForDocumentType(primaryDetection);
    }

    // Calculate confidence score based on multiple factors
    analysis.confidence = this.calculateConfidence(content, analysis);

    // Find alternative document types with lower confidence
    analysis.alternativeTypes = this.findAlternativeTypes(content, primaryDetection);

    // Enhance with metadata if available
    if (metadata) {
      this.enhanceWithMetadata(analysis, metadata);
    }

    return analysis;
  }

  /**
   * Extracts content features for analysis
   */
  private static extractContentFeatures(content: string) {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;

    // Medical terminology density
    const medicalTerms = this.getMedicalTerms();
    const medicalWordCount = words.filter(word => 
      medicalTerms.some(term => word.includes(term))
    ).length;
    const medicalTermDensity = totalWords > 0 ? medicalWordCount / totalWords : 0;

    // Structured data indicators
    const structuredIndicators = [
      /:\s*\d+/g,           // Numbers with colons (lab values)
      /\d+\s*-\s*\d+/g,     // Ranges
      /\d+\.\d+/g,          // Decimal values
      /\d+%/g,              // Percentages
      /\b\d+\s*(mg|ml|cm|mm|g|kg)\b/g, // Units
    ];
    
    const structuredMatches = structuredIndicators.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);
    
    const structuredData = structuredMatches > 5; // Threshold for structured content

    // Specialty indicators
    const specialtyIndicators = this.extractSpecialtyIndicators(content);

    return {
      medicalTermDensity,
      structuredData,
      reportLength: content.length,
      specialtyIndicators,
    };
  }

  /**
   * Medical terminology for density calculation
   */
  private static getMedicalTerms(): string[] {
    return [
      'diagnosis', 'treatment', 'medication', 'procedure', 'surgery',
      'pathology', 'biopsy', 'microscopic', 'histology', 'specimen',
      'cardiac', 'ecg', 'echo', 'catheter', 'rhythm',
      'radiology', 'imaging', 'scan', 'contrast', 'findings',
      'oncology', 'tumor', 'cancer', 'chemotherapy', 'radiation',
      'patient', 'clinical', 'medical', 'therapeutic', 'diagnostic'
    ];
  }

  /**
   * Extracts specialty-specific indicators
   */
  private static extractSpecialtyIndicators(content: string): string[] {
    const indicators: string[] = [];
    const lowerContent = content.toLowerCase();

    const specialtyPatterns = {
      surgical: ['operative', 'incision', 'suture', 'anesthesia', 'postoperative'],
      pathology: ['microscopic', 'specimen', 'histology', 'immunohistochemistry', 'cytology'],
      cardiology: ['ecg', 'echo', 'cardiac', 'heart rate', 'blood pressure'],
      radiology: ['ct scan', 'mri', 'x-ray', 'ultrasound', 'contrast'],
      oncology: ['chemotherapy', 'radiation', 'tumor', 'metastasis', 'staging']
    };

    for (const [specialty, patterns] of Object.entries(specialtyPatterns)) {
      const matchCount = patterns.filter(pattern => 
        lowerContent.includes(pattern)
      ).length;
      
      if (matchCount > 0) {
        indicators.push(`${specialty}:${matchCount}`);
      }
    }

    return indicators;
  }

  /**
   * Calculates confidence score for document type detection
   */
  private static calculateConfidence(
    content: string, 
    analysis: DocumentTypeAnalysis
  ): number {
    if (!analysis.detectedType) return 0;

    let confidence = 0.5; // Base confidence

    // Pattern match strength (primary factor)
    const patternMatches = this.countPatternMatches(content, analysis.detectedType);
    confidence += Math.min(patternMatches * 0.1, 0.3);

    // Medical terminology density
    if (analysis.contentFeatures.medicalTermDensity > 0.1) {
      confidence += 0.1;
    }

    // Structured data presence
    if (analysis.contentFeatures.structuredData) {
      confidence += 0.1;
    }

    // Document length appropriateness
    const expectedLength = this.getExpectedDocumentLength(analysis.detectedType);
    const lengthScore = this.calculateLengthScore(
      analysis.contentFeatures.reportLength, 
      expectedLength
    );
    confidence += lengthScore * 0.1;

    // Specialty indicator strength
    const specialtyScore = this.calculateSpecialtyScore(
      analysis.contentFeatures.specialtyIndicators,
      analysis.detectedType
    );
    confidence += specialtyScore * 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Counts pattern matches for a specific document type
   */
  private static countPatternMatches(content: string, docType: string): number {
    const patterns = {
      surgical: [
        /operative\s+report/gi,
        /surgical\s+procedure/gi,
        /operation\s+performed/gi,
        /incision/gi,
        /suture/gi
      ],
      pathology: [
        /pathology\s+report/gi,
        /microscopic\s+examination/gi,
        /gross\s+description/gi,
        /histology/gi,
        /specimen/gi
      ],
      cardiology: [
        /ecg|electrocardiogram/gi,
        /echocardiogram/gi,
        /cardiac\s+catheterization/gi,
        /stress\s+test/gi,
        /heart\s+rate/gi
      ],
      radiology: [
        /ct\s+scan/gi,
        /mri\s+scan/gi,
        /x-ray/gi,
        /ultrasound/gi,
        /radiologic/gi
      ],
      oncology: [
        /chemotherapy/gi,
        /radiation\s+therapy/gi,
        /tumor/gi,
        /oncology/gi,
        /cancer\s+treatment/gi
      ]
    };

    const docPatterns = patterns[docType as keyof typeof patterns] || [];
    return docPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);
  }

  /**
   * Gets expected document length for type
   */
  private static getExpectedDocumentLength(docType: string): { min: number; max: number } {
    const lengths = {
      surgical: { min: 1000, max: 5000 },
      pathology: { min: 800, max: 4000 },
      cardiology: { min: 500, max: 2500 },
      radiology: { min: 300, max: 2000 },
      oncology: { min: 1200, max: 6000 }
    };

    return lengths[docType as keyof typeof lengths] || { min: 500, max: 3000 };
  }

  /**
   * Calculates length appropriateness score
   */
  private static calculateLengthScore(
    actualLength: number, 
    expected: { min: number; max: number }
  ): number {
    if (actualLength >= expected.min && actualLength <= expected.max) {
      return 1.0; // Perfect length
    }
    
    if (actualLength < expected.min) {
      return Math.max(0, actualLength / expected.min);
    }
    
    // Too long - diminishing returns
    const excess = actualLength - expected.max;
    return Math.max(0.5, 1.0 - (excess / expected.max) * 0.5);
  }

  /**
   * Calculates specialty indicator score
   */
  private static calculateSpecialtyScore(indicators: string[], docType: string): number {
    const relevantIndicator = indicators.find(indicator => 
      indicator.startsWith(docType + ':')
    );
    
    if (!relevantIndicator) return 0;
    
    const count = parseInt(relevantIndicator.split(':')[1]);
    return Math.min(count / 3, 1.0); // Normalize to 0-1
  }

  /**
   * Finds alternative document types with confidence scores
   */
  private static findAlternativeTypes(
    content: string, 
    primaryType: string | null
  ): Array<{ type: string; confidence: number }> {
    const alternatives: Array<{ type: string; confidence: number }> = [];
    
    for (const docType of Object.keys(enhancedSchemaRegistry)) {
      if (docType === primaryType) continue;
      
      const patternMatches = this.countPatternMatches(content, docType);
      if (patternMatches > 0) {
        const confidence = Math.min(patternMatches * 0.1, 0.8);
        alternatives.push({ type: docType, confidence });
      }
    }
    
    return alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  /**
   * Enhances analysis with available metadata
   */
  private static enhanceWithMetadata(
    analysis: DocumentTypeAnalysis, 
    metadata: Record<string, any>
  ): void {
    // Use metadata hints to boost confidence
    if (metadata.documentType && metadata.documentType === analysis.detectedType) {
      analysis.confidence = Math.min(analysis.confidence + 0.2, 1.0);
    }
    
    // Check for specialty in metadata
    if (metadata.specialty) {
      const specialtyMatch = analysis.detectedType === metadata.specialty.toLowerCase();
      if (specialtyMatch) {
        analysis.confidence = Math.min(analysis.confidence + 0.15, 1.0);
      }
    }
    
    // Source system hints
    if (metadata.source) {
      const sourceHints = {
        'surgical_system': 'surgical',
        'pathology_lab': 'pathology',
        'cardiology_dept': 'cardiology',
        'radiology_pacs': 'radiology',
        'oncology_ehr': 'oncology'
      };
      
      const hintedType = sourceHints[metadata.source as keyof typeof sourceHints];
      if (hintedType === analysis.detectedType) {
        analysis.confidence = Math.min(analysis.confidence + 0.1, 1.0);
      }
    }
  }
}

/**
 * LangGraph node implementation for document type routing
 */
export async function documentTypeRouterNode(
  state: DocumentProcessingState
): Promise<Partial<DocumentProcessingState>> {
  console.log("🔍 Analyzing document type for specialized processing");

  // Skip if feature flag disabled
  if (!FEATURE_FLAGS.ENABLE_ENHANCED_SCHEMAS) {
    console.log("📋 Enhanced schemas disabled, using standard processing");
    return {
      documentTypeAnalysis: {
        detectedType: "standard",
        confidence: 1.0,
        alternativeTypes: [],
        contentFeatures: {
          medicalTermDensity: 0,
          structuredData: false,
          reportLength: 0,
          specialtyIndicators: [],
        },
        schemaRecommendation: null,
      },
    };
  }

  try {
    // Extract content for analysis
    const textContent = state.content
      ?.map(c => c.text || '')
      .join(' ') || '';

    if (!textContent.trim()) {
      console.warn("⚠️ No text content available for document type analysis");
      return {
        documentTypeAnalysis: {
          detectedType: null,
          confidence: 0,
          alternativeTypes: [],
          contentFeatures: {
            medicalTermDensity: 0,
            structuredData: false,
            reportLength: 0,
            specialtyIndicators: [],
          },
          schemaRecommendation: null,
        },
      };
    }

    // Perform document type analysis
    const analysis = DocumentTypeRouter.analyzeDocumentType(
      textContent,
      state.metadata
    );

    console.log(`📊 Document type analysis complete:`);
    console.log(`   Detected: ${analysis.detectedType || 'none'}`);
    console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.log(`   Schema: ${analysis.schemaRecommendation?.specialty || 'standard'}`);
    
    if (analysis.alternativeTypes.length > 0) {
      console.log(`   Alternatives: ${analysis.alternativeTypes.map(alt => 
        `${alt.type}(${(alt.confidence * 100).toFixed(1)}%)`
      ).join(', ')}`);
    }

    return {
      documentTypeAnalysis: analysis,
      selectedSchema: analysis.schemaRecommendation?.schema || null,
      processingComplexity: analysis.schemaRecommendation?.processingComplexity || "low",
    };
  } catch (error) {
    console.error("❌ Error in document type router:", error);
    
    // Fallback to standard processing
    return {
      documentTypeAnalysis: {
        detectedType: "error",
        confidence: 0,
        alternativeTypes: [],
        contentFeatures: {
          medicalTermDensity: 0,
          structuredData: false,
          reportLength: 0,
          specialtyIndicators: [],
        },
        schemaRecommendation: null,
      },
      processingErrors: [
        ...(state.processingErrors || []),
        `Document type routing failed: ${error.message}`
      ],
    };
  }
}