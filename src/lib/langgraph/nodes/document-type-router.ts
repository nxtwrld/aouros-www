// Document Type Router Node - AI Feature Detection Based Routing
// Uses comprehensive AI feature detection to determine which sections to populate

import type { DocumentProcessingState } from "../state";
import { log } from "$lib/logging/logger";
import { isStateTransitionDebuggingEnabled } from "$lib/config/logging-config";

export interface DocumentTypeAnalysis {
  detectedSections: string[];
  confidence: number;
  documentType: string;
  detectedType: string; // Add the missing detectedType property
  medicalSpecialty: string[];
  urgencyLevel: number;
  language: string;
  contentFeatures: {
    medicalTermDensity: number;
    structuredData: boolean;
    reportLength: number;
    specialtyIndicators: string[];
  };
  sectionFlags: Record<string, boolean>;
}

export interface ProcessingGroup {
  id: string;
  name: string;
  processors: string[];
  dependencies: string[];
  canRunInParallel: boolean;
}

export interface ProcessingPlan {
  parallelGroups: ProcessingGroup[];
  sequentialSteps: string[];
  estimatedDuration: number;
  totalProcessors: number;
}

export class DocumentTypeRouter {
  /**
   * Analyzes AI feature detection results to determine document sections
   */
  static analyzeDocumentSections(
    aiDetectionResults: Record<string, any>,
    content: string,
    metadata?: Record<string, any>,
  ): DocumentTypeAnalysis {
    const analysis: DocumentTypeAnalysis = {
      detectedSections: [],
      confidence: 0.9, // High confidence since AI did the detection
      documentType: aiDetectionResults.documentType || "clinical_report",
      detectedType: aiDetectionResults.detectedType || aiDetectionResults.documentType || "clinical_report",
      medicalSpecialty: aiDetectionResults.medicalSpecialty || [
        "general_medicine",
      ],
      urgencyLevel: aiDetectionResults.urgencyLevel || 1,
      language: aiDetectionResults.language || "en",
      contentFeatures: this.extractContentFeatures(content),
      sectionFlags: {},
    };

    // Extract section flags from AI detection results
    analysis.sectionFlags = this.extractSectionFlags(aiDetectionResults);

    // Build detected sections list from AI flags
    analysis.detectedSections = this.buildDetectedSectionsList(
      analysis.sectionFlags,
    );

    // Enhance with metadata if available
    if (metadata) {
      this.enhanceWithMetadata(analysis, metadata);
    }

    return analysis;
  }

  /**
   * Extracts section flags from AI detection results
   */
  private static extractSectionFlags(
    aiResults: Record<string, any>,
  ): Record<string, boolean> {
    const flags: Record<string, boolean> = {};

    // Core medical sections
    flags.hasSummary = aiResults.hasSummary || false;
    flags.hasDiagnosis = aiResults.hasDiagnosis || false;
    flags.hasBodyParts = aiResults.hasBodyParts || false;
    flags.hasPerformer = aiResults.hasPerformer || false;
    flags.hasRecommendations = aiResults.hasRecommendations || false;
    flags.hasSignals = aiResults.hasSignals || false;
    flags.hasPrescriptions = aiResults.hasPrescriptions || false;
    flags.hasImmunizations = aiResults.hasImmunizations || false;

    // Medical specialty sections
    flags.hasImaging = aiResults.hasImaging || false;
    flags.hasDental = aiResults.hasDental || false;
    flags.hasAdmission = aiResults.hasAdmission || false;
    flags.hasProcedures = aiResults.hasProcedures || false;
    flags.hasAnesthesia = aiResults.hasAnesthesia || false;
    flags.hasSpecimens = aiResults.hasSpecimens || false;
    flags.hasMicroscopic = aiResults.hasMicroscopic || false;
    flags.hasMolecular = aiResults.hasMolecular || false;
    flags.hasECG = aiResults.hasECG || false;
    flags.hasEcho = aiResults.hasEcho || false;
    flags.hasTriage = aiResults.hasTriage || false;
    flags.hasTreatments = aiResults.hasTreatments || false;
    flags.hasAssessment = aiResults.hasAssessment || false;

    // Enhanced specialty sections
    flags.hasTumorCharacteristics = aiResults.hasTumorCharacteristics || false;
    flags.hasTreatmentPlan = aiResults.hasTreatmentPlan || false;
    flags.hasTreatmentResponse = aiResults.hasTreatmentResponse || false;
    flags.hasImagingFindings = aiResults.hasImagingFindings || false;
    flags.hasGrossFindings = aiResults.hasGrossFindings || false;
    flags.hasSpecialStains = aiResults.hasSpecialStains || false;
    flags.hasAllergies = aiResults.hasAllergies || false;
    flags.hasMedications = aiResults.hasMedications || false;
    flags.hasSocialHistory = aiResults.hasSocialHistory || false;

    return flags;
  }

  /**
   * Builds detected sections list from AI flags
   */
  private static buildDetectedSectionsList(
    flags: Record<string, boolean>,
  ): string[] {
    const sections: string[] = [];

    Object.entries(flags).forEach(([flag, isPresent]) => {
      if (isPresent) {
        // Convert hasXxx flag to section name
        const sectionName = flag.replace(/^has/, "").toLowerCase();
        sections.push(sectionName);
      }
    });

    return sections;
  }

  /**
   * Extracts content features for analysis
   */
  private static extractContentFeatures(content: string) {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;

    // Medical terminology density
    const medicalTerms = this.getMedicalTerms();
    const medicalWordCount = words.filter((word) =>
      medicalTerms.some((term) => word.includes(term)),
    ).length;
    const medicalTermDensity =
      totalWords > 0 ? medicalWordCount / totalWords : 0;

    // Structured data indicators
    const structuredIndicators = [
      /:\s*\d+/g, // Numbers with colons (lab values)
      /\d+\s*-\s*\d+/g, // Ranges
      /\d+\.\d+/g, // Decimal values
      /\d+%/g, // Percentages
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
      "diagnosis",
      "treatment",
      "medication",
      "procedure",
      "surgery",
      "pathology",
      "biopsy",
      "microscopic",
      "histology",
      "specimen",
      "cardiac",
      "ecg",
      "echo",
      "catheter",
      "rhythm",
      "radiology",
      "imaging",
      "scan",
      "contrast",
      "findings",
      "oncology",
      "tumor",
      "cancer",
      "chemotherapy",
      "radiation",
      "patient",
      "clinical",
      "medical",
      "therapeutic",
      "diagnostic",
    ];
  }

  /**
   * Extracts specialty-specific indicators
   */
  private static extractSpecialtyIndicators(content: string): string[] {
    const indicators: string[] = [];
    const lowerContent = content.toLowerCase();

    const specialtyPatterns = {
      surgical: [
        "operative",
        "incision",
        "suture",
        "anesthesia",
        "postoperative",
      ],
      pathology: [
        "microscopic",
        "specimen",
        "histology",
        "immunohistochemistry",
        "cytology",
      ],
      cardiology: ["ecg", "echo", "cardiac", "heart rate", "blood pressure"],
      radiology: ["ct scan", "mri", "x-ray", "ultrasound", "contrast"],
      oncology: ["chemotherapy", "radiation", "tumor", "metastasis", "staging"],
    };

    for (const [specialty, patterns] of Object.entries(specialtyPatterns)) {
      const matchCount = patterns.filter((pattern) =>
        lowerContent.includes(pattern),
      ).length;

      if (matchCount > 0) {
        indicators.push(`${specialty}:${matchCount}`);
      }
    }

    return indicators;
  }

  /**
   * Creates a parallel processing plan based on detected sections
   */
  static createProcessingPlan(detectedSections: string[]): ProcessingPlan {
    const plan: ProcessingPlan = {
      parallelGroups: [],
      sequentialSteps: [],
      estimatedDuration: 0,
      totalProcessors: 0,
    };

    // Always start with medical analysis (sequential)
    plan.sequentialSteps.push("medical-analysis");

    // Group 1: Quantitative Analysis (can run in parallel)
    const quantitativeProcessors: string[] = [];
    if (
      detectedSections.some((s) =>
        ["signals", "laboratory", "ecg", "echo"].includes(s),
      )
    ) {
      quantitativeProcessors.push("signal-processing");
    }
    if (detectedSections.some((s) => ["ecg", "echo"].includes(s))) {
      quantitativeProcessors.push("cardiac-analysis");
    }

    if (quantitativeProcessors.length > 0) {
      plan.parallelGroups.push({
        id: "quantitative-analysis",
        name: "Quantitative Analysis Group",
        processors: quantitativeProcessors,
        dependencies: ["medical-analysis"],
        canRunInParallel: true,
      });
    }

    // Group 2: Imaging Analysis (can run in parallel)
    const imagingProcessors: string[] = [];
    if (
      detectedSections.some((s) => ["imaging", "imagingfindings"].includes(s))
    ) {
      imagingProcessors.push("imaging-processing");
    }
    if (detectedSections.includes("imaging")) {
      imagingProcessors.push("dicom-processing");
    }

    if (imagingProcessors.length > 0) {
      plan.parallelGroups.push({
        id: "imaging-analysis",
        name: "Imaging Analysis Group",
        processors: imagingProcessors,
        dependencies: ["medical-analysis"],
        canRunInParallel: true,
      });
    }

    // Group 3: Tissue Analysis (can run in parallel)
    const tissueProcessors: string[] = [];
    if (
      detectedSections.some((s) =>
        [
          "specimens",
          "microscopic",
          "molecular",
          "grossfindings",
          "specialstains",
        ].includes(s),
      )
    ) {
      tissueProcessors.push("pathology-processing");
    }
    if (detectedSections.includes("molecular")) {
      tissueProcessors.push("genetic-analysis");
    }

    if (tissueProcessors.length > 0) {
      plan.parallelGroups.push({
        id: "tissue-analysis",
        name: "Tissue Analysis Group",
        processors: tissueProcessors,
        dependencies: ["medical-analysis"],
        canRunInParallel: true,
      });
    }

    // Group 4: Clinical Procedures (can run in parallel)
    const clinicalProcessors: string[] = [];
    if (
      detectedSections.some((s) => ["procedures", "anesthesia"].includes(s))
    ) {
      clinicalProcessors.push("procedure-processing");
    }
    if (
      detectedSections.some((s) => ["treatments", "treatmentplan"].includes(s))
    ) {
      clinicalProcessors.push("treatment-analysis");
    }

    if (clinicalProcessors.length > 0) {
      plan.parallelGroups.push({
        id: "clinical-procedures",
        name: "Clinical Procedures Group",
        processors: clinicalProcessors,
        dependencies: ["medical-analysis"],
        canRunInParallel: true,
      });
    }

    // Oncology processing (depends on pathology if present)
    if (
      detectedSections.some((s) =>
        ["tumorcharacteristics", "treatmentplan", "treatmentresponse"].includes(
          s,
        ),
      )
    ) {
      const dependencies = ["medical-analysis"];
      if (tissueProcessors.length > 0) {
        dependencies.push("tissue-analysis");
      }
      plan.sequentialSteps.push("oncology-processing");
    }

    // Cross-validation aggregator (after all parallel groups)
    if (plan.parallelGroups.length > 0) {
      plan.sequentialSteps.push("cross-validation-aggregator");
    }

    // Always end with quality gate
    plan.sequentialSteps.push("quality-gate");

    // Calculate totals
    plan.totalProcessors =
      plan.sequentialSteps.length +
      plan.parallelGroups.reduce(
        (sum, group) => sum + group.processors.length,
        0,
      );

    // Estimate duration (simplified: parallel groups count as 1 unit)
    plan.estimatedDuration =
      plan.sequentialSteps.length + plan.parallelGroups.length;

    return plan;
  }

  /**
   * Converts processing plan to simple step array (backwards compatibility)
   */
  static getProcessingSteps(detectedSections: string[]): string[] {
    const plan = this.createProcessingPlan(detectedSections);
    const steps: string[] = [];

    // Add sequential steps
    steps.push(...plan.sequentialSteps);

    // Add all processors from parallel groups (flattened)
    for (const group of plan.parallelGroups) {
      steps.push(...group.processors);
    }

    return steps;
  }

  /**
   * Enhances analysis with available metadata
   */
  private static enhanceWithMetadata(
    analysis: DocumentTypeAnalysis,
    metadata: Record<string, any>,
  ): void {
    // Use metadata hints to boost confidence
    if (metadata.documentType) {
      if (metadata.documentType === analysis.documentType) {
        analysis.confidence = Math.min(analysis.confidence + 0.1, 1.0);
      }
    }

    // Check for specialty in metadata
    if (metadata.specialty) {
      const specialtyMatch = analysis.medicalSpecialty.includes(
        metadata.specialty.toLowerCase(),
      );
      if (specialtyMatch) {
        analysis.confidence = Math.min(analysis.confidence + 0.05, 1.0);
      }
    }

    // Source system hints
    if (metadata.source) {
      const sourceHints = {
        surgical_system: "surgery",
        pathology_lab: "pathology",
        cardiology_dept: "cardiology",
        radiology_pacs: "radiology",
        oncology_ehr: "oncology",
      };

      const hintedSpecialty =
        sourceHints[metadata.source as keyof typeof sourceHints];
      if (
        hintedSpecialty &&
        analysis.medicalSpecialty.includes(hintedSpecialty)
      ) {
        analysis.confidence = Math.min(analysis.confidence + 0.05, 1.0);
      }
    }
  }
}

/**
 * LangGraph node implementation for AI-based document routing
 */
export async function documentTypeRouterNode(
  state: DocumentProcessingState,
): Promise<Partial<DocumentProcessingState>> {
  log.analysis.info("Analyzing AI feature detection results for processing routing");
  
  // Debug logging: what state do we have? (only if enabled)
  if (isStateTransitionDebuggingEnabled()) {
    log.analysis.debug("Document router received state", {
      hasFeatureDetection: !!state.featureDetection,
      hasFeatureDetectionResults: !!state.featureDetectionResults,
      featureDetectionType: state.featureDetection?.type,
      featureDetectionConfidence: state.featureDetection?.confidence,
      featureResultsIsMedical: state.featureDetectionResults?.isMedical,
      featureResultsDocType: state.featureDetectionResults?.documentType
    });
  }

  // Emit progress start
  state.emitProgress?.(
    "document_type_router",
    0,
    "Starting document type analysis",
  );

  try {
    // Extract AI feature detection results
    state.emitProgress?.(
      "document_type_router",
      20,
      "Analyzing AI feature detection results",
    );

    const aiResults = state.featureDetectionResults;
    if (!aiResults || !aiResults.isMedical) {
      log.analysis.warn("No AI feature detection results or not medical content", {
        hasFeatureDetection: !!state.featureDetection,
        confidence: state.featureDetection?.confidence,
        type: state.featureDetection?.type,
        features: state.featureDetection?.features
      });
      state.emitComplete?.(
        "document_type_router",
        "Document identified as non-medical",
        {
          documentType: "non_medical",
          skipProcessing: true,
        },
      );
      return {
        documentTypeAnalysis: {
          detectedSections: [],
          confidence: 0,
          documentType: "non_medical",
          detectedType: "non_medical",
          medicalSpecialty: [],
          urgencyLevel: 1,
          language: "en",
          contentFeatures: {
            medicalTermDensity: 0,
            structuredData: false,
            reportLength: 0,
            specialtyIndicators: [],
          },
          sectionFlags: {},
        },
        nextSteps: ["quality-gate"], // Skip processing for non-medical content
      };
    }

    // Extract content for feature analysis
    state.emitProgress?.(
      "document_type_router",
      40,
      "Extracting content for analysis",
    );

    const textContent = state.content?.map((c) => c.text || "").join(" ") || "";

    // Perform analysis based on AI detection
    state.emitProgress?.(
      "document_type_router",
      60,
      "Analyzing document sections and type",
    );

    const analysis = DocumentTypeRouter.analyzeDocumentSections(
      aiResults,
      textContent,
      state.metadata,
    );

    // Create parallel processing plan
    state.emitProgress?.(
      "document_type_router",
      80,
      "Creating processing plan",
    );

    const processingPlan = DocumentTypeRouter.createProcessingPlan(
      analysis.detectedSections,
    );

    // Get simple steps for backwards compatibility
    const nextSteps = DocumentTypeRouter.getProcessingSteps(
      analysis.detectedSections,
    );

    console.log(`📊 Document routing analysis complete:`);
    console.log(`   Document type: ${analysis.documentType}`);
    console.log(
      `   Medical specialty: ${analysis.medicalSpecialty.join(", ")}`,
    );
    console.log(
      `   Detected sections: ${analysis.detectedSections.join(", ")}`,
    );
    console.log(`   Urgency level: ${analysis.urgencyLevel}`);
    console.log(`   Language: ${analysis.language}`);

    // Emit completion with analysis results
    state.emitComplete?.(
      "document_type_router",
      "Document type analysis completed",
      {
        documentType: analysis.documentType,
        sectionsDetected: analysis.detectedSections.length,
        medicalSpecialty: analysis.medicalSpecialty,
        processingComplexity: determineProcessingComplexity(
          analysis.detectedSections,
        ),
        totalProcessors: processingPlan.totalProcessors,
      },
    );

    // Log parallel processing plan
    console.log(`
📋 Processing Plan:`);
    console.log(
      `   Sequential steps: ${processingPlan.sequentialSteps.join(" → ")}`,
    );
    if (processingPlan.parallelGroups.length > 0) {
      console.log(`   Parallel groups:`);
      for (const group of processingPlan.parallelGroups) {
        console.log(`     - ${group.name}: [${group.processors.join(", ")}]`);
      }
    }
    console.log(`   Total processors: ${processingPlan.totalProcessors}`);
    console.log(
      `   Estimated duration: ${processingPlan.estimatedDuration} units`,
    );

    return {
      documentTypeAnalysis: analysis,
      nextSteps,
      processingPlan,
      processingComplexity: determineProcessingComplexity(
        analysis.detectedSections,
      ),
    };
  } catch (error) {
    console.error("❌ Error in document type router:", error);

    // Emit error
    state.emitError?.(
      "document_type_router",
      "Document type analysis failed",
      error,
    );

    // Fallback to minimal processing
    return {
      documentTypeAnalysis: {
        detectedSections: [],
        confidence: 0,
        documentType: "unknown",
        detectedType: "unknown",
        medicalSpecialty: [],
        urgencyLevel: 1,
        language: "en",
        contentFeatures: {
          medicalTermDensity: 0,
          structuredData: false,
          reportLength: 0,
          specialtyIndicators: [],
        },
        sectionFlags: {},
      },
      nextSteps: ["quality-gate"],
      processingErrors: [
        ...(state.processingErrors || []),
        `Document routing failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

/**
 * Determines processing complexity based on detected sections
 */
function determineProcessingComplexity(
  detectedSections: string[],
): "low" | "medium" | "high" {
  if (detectedSections.length === 0) return "low";

  // High complexity sections require advanced processing
  const highComplexitySections = [
    "molecular",
    "tumorcharacteristics",
    "treatmentplan",
    "treatmentresponse",
    "imagingfindings",
    "specialstains",
    "anesthesia",
  ];

  // Medium complexity sections require moderate processing
  const mediumComplexitySections = [
    "specimens",
    "microscopic",
    "procedures",
    "imaging",
    "grossfindings",
    "ecg",
    "echo",
    "triage",
    "treatments",
    "assessment",
  ];

  if (
    detectedSections.some((section) => highComplexitySections.includes(section))
  ) {
    return "high";
  }

  if (
    detectedSections.some((section) =>
      mediumComplexitySections.includes(section),
    )
  ) {
    return "medium";
  }

  return "low";
}
