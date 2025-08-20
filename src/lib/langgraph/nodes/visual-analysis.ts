/**
 * Visual Analysis Node
 *
 * Performs basic visual analysis of medical images to identify
 * the type of imaging, anatomical region, and overall quality.
 * This is the first step in the medical imaging workflow.
 */

import type { MedicalImagingState } from "../state-medical-imaging";
import {
  BaseProcessingNode,
  type BaseProcessingNodeConfig,
  type ProcessingNodeResult,
} from "./_base-processing-node";

export class VisualAnalysisNode extends BaseProcessingNode {
  constructor() {
    const config: BaseProcessingNodeConfig = {
      nodeName: "visual-analysis",
      description: "Basic visual analysis of medical images",
      schemaImportPath: "$lib/configurations/visual-analysis",
      progressStages: [
        {
          stage: "visual_analysis_init",
          progress: 10,
          message: "Initializing visual analysis",
        },
        {
          stage: "visual_analysis_processing",
          progress: 50,
          message: "Analyzing image content",
        },
        {
          stage: "visual_analysis_complete",
          progress: 90,
          message: "Completing visual analysis",
        },
      ],
      featureDetectionTriggers: ["isMedicalImaging"],
    };
    super(config);
  }

  protected getSectionName(): string {
    return "visualAnalysis";
  }

  /**
   * Validate and enhance visual analysis results
   */
  protected async validateAndEnhance(
    aiResult: any,
    state: MedicalImagingState,
  ): Promise<ProcessingNodeResult> {
    const processingTime = Date.now();
    const tokensUsed = state.tokenUsage?.[this.config.nodeName] || 0;

    // Validate the AI result
    const validatedData = this.validateVisualAnalysis(aiResult);

    // Create the visual analysis result
    const imageAnalysis = {
      description: validatedData.visualDescription || "Medical image analysis",
      confidence: validatedData.confidence || 0.5,
      visualElements: this.extractVisualElements(validatedData),
      imageQuality: validatedData.imageQuality || "fair",
      timestamp: new Date().toISOString(),
    };

    return {
      data: {
        imageAnalysis,
        modality: validatedData.modality,
        anatomicalRegion: validatedData.anatomicalRegion,
        viewPosition: validatedData.viewPosition,
        technicalQuality: validatedData.technicalQuality,
      },
      metadata: {
        processingTime,
        tokensUsed,
        confidence: validatedData.confidence || 0.5,
        provider: "enhanced-openai",
      },
    };
  }

  /**
   * Validate visual analysis data
   */
  private validateVisualAnalysis(data: any): any {
    if (!data) return {};

    return {
      modality: data.modality || "Unknown",
      anatomicalRegion: data.anatomicalRegion || "Unknown",
      viewPosition: data.viewPosition || "Unknown",
      imageQuality: data.imageQuality || "fair",
      visualDescription: data.visualDescription || "",
      technicalQuality: data.technicalQuality || {
        contrast: "adequate",
        brightness: "optimal",
        artifacts: false,
      },
      confidence: data.confidence || 0.5,
    };
  }

  /**
   * Extract visual elements from the analysis
   */
  private extractVisualElements(data: any): string[] {
    const elements: string[] = [];

    if (data.modality && data.modality !== "Unknown") {
      elements.push(`Modality: ${data.modality}`);
    }

    if (data.anatomicalRegion && data.anatomicalRegion !== "Unknown") {
      elements.push(`Region: ${data.anatomicalRegion}`);
    }

    if (data.viewPosition && data.viewPosition !== "Unknown") {
      elements.push(`View: ${data.viewPosition}`);
    }

    if (data.imageQuality) {
      elements.push(`Quality: ${data.imageQuality}`);
    }

    return elements;
  }

  /**
   * Check if required fields are present
   */
  protected hasRequiredFields(data: any): boolean {
    return !!(data.modality && data.anatomicalRegion && data.visualDescription);
  }

  /**
   * Calculate confidence for visual analysis
   */
  protected calculateConfidence(data: any): number {
    let confidence = 0.5;

    if (data.modality && data.modality !== "Unknown") confidence += 0.15;
    if (data.anatomicalRegion && data.anatomicalRegion !== "Unknown")
      confidence += 0.15;
    if (data.visualDescription && data.visualDescription.length > 20)
      confidence += 0.1;
    if (data.imageQuality === "excellent" || data.imageQuality === "good")
      confidence += 0.1;

    return Math.min(confidence, 1.0);
  }
}

/**
 * Export the node function for use in the workflow
 */
export const visualAnalysisNode = async (
  state: MedicalImagingState,
): Promise<Partial<MedicalImagingState>> => {
  const node = new VisualAnalysisNode();
  const result = await node.process(state);

  // Map the result to the state structure
  return {
    imageAnalysis: result.visualAnalysis?.imageAnalysis,
    imagingMetadata: {
      ...state.imagingMetadata,
      modality: result.visualAnalysis?.modality,
      bodyPartExamined: result.visualAnalysis?.anatomicalRegion,
      viewPosition: result.visualAnalysis?.viewPosition,
    },
  };
};
