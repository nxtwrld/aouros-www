/**
 * Multi-Node Workflow Orchestrator
 * 
 * Orchestrates parallel execution of specialized processing nodes based on
 * feature detection results, replacing the monolithic medical analysis approach.
 */

import type { DocumentProcessingState } from "../state";
import { nodeRegistry, type NodeDefinition } from "../registry/node-registry";
import { log } from "$lib/logging/logger";
import { isLangGraphDebuggingEnabled } from "$lib/config/logging-config";

// Import universal node factory (replaces all individual node imports)
import { UniversalNodeFactory } from "../factories/universal-node-factory";

// All nodes now use Universal Factory - no legacy imports needed

export interface MultiNodeOrchestratorConfig {
  enableParallelExecution: boolean;
  maxConcurrentNodes: number;
  timeoutPerNode: number; // milliseconds
  fallbackToLegacy: boolean;
}

export class MultiNodeOrchestrator {
  private config: MultiNodeOrchestratorConfig;
  private isInitialized: boolean = false;

  constructor(config: Partial<MultiNodeOrchestratorConfig> = {}) {
    this.config = {
      enableParallelExecution: true,
      maxConcurrentNodes: 5,
      timeoutPerNode: 60000, // 1 minute
      fallbackToLegacy: true,
      ...config,
    };
  }

  /**
   * Initialize the orchestrator by registering all available nodes
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🎼 Initializing Multi-Node Orchestrator...");

    // Register all specialized processing nodes
    await this.registerSpecializedNodes();

    this.isInitialized = true;
    console.log(`✅ Multi-Node Orchestrator initialized with ${nodeRegistry.getAllNodes().length} nodes`);
  }

  /**
   * Main orchestration method - replaces monolithic medical analysis
   */
  async orchestrateProcessing(state: DocumentProcessingState): Promise<Partial<DocumentProcessingState>> {
    try {
      await this.initialize();

      // CRITICAL DEBUG: What state are we receiving?
      console.log("🚨 ORCHESTRATOR START - Input state:", {
        stateKeys: Object.keys(state),
        stateReportType: typeof (state as any).report,
        stateReportIsArray: Array.isArray((state as any).report),
        stateReportContent: (state as any).report,
        stateContent: state.content,
        stateText: state.text
      });

      // Emit initial progress
      this.emitProgress(state, 0, "Starting multi-node processing");

      // Check if we have feature detection results
      if (!state.featureDetectionResults) {
        console.warn("⚠️ No feature detection results - falling back to legacy processing");
        if (this.config.fallbackToLegacy) {
          return this.fallbackToLegacyProcessing(state);
        }
        throw new Error("Feature detection results required for multi-node processing");
      }

      // Select nodes based on feature detection
      this.emitProgress(state, 10, "Selecting processing nodes based on detected features");
      
      // Debug logging for feature detection results
      console.log("🔍 Multi-Node Orchestrator - Feature Detection Results:", {
        featureDetectionResults: state.featureDetectionResults,
        availableNodes: nodeRegistry.getAllNodes().map(n => ({
          name: n.nodeName,
          triggers: n.featureDetectionTriggers
        }))
      });
      
      const selectedNodes = nodeRegistry.selectNodes(state.featureDetectionResults);
      
      console.log("🎯 Multi-Node Orchestrator - Selected Nodes:", {
        selectedCount: selectedNodes.length,
        selectedNames: selectedNodes.map(n => n.nodeName),
        triggeredFeatures: Object.entries(state.featureDetectionResults || {})
          .filter(([, value]) => value === true)
          .map(([key]) => key)
      });

      if (selectedNodes.length === 0) {
        console.log("📝 No specialized nodes selected - document may not contain processable medical sections");
        return {
          multiNodeResults: {
            processedNodes: [],
            executionTime: 0,
            message: "No specialized processing required",
          },
        };
      }

      // Create execution plan
      this.emitProgress(state, 20, `Creating execution plan for ${selectedNodes.length} nodes`);
      const executionPlan = nodeRegistry.createExecutionPlan(selectedNodes);

      console.log(`📋 Execution plan created:`, {
        totalNodes: executionPlan.totalNodes,
        parallelGroups: executionPlan.parallelGroups.length,
        executionOrder: executionPlan.executionOrder,
      });

      // Execute nodes according to plan
      this.emitProgress(state, 30, "Executing specialized processing nodes");
      const startTime = Date.now();

      const processedState = await this.executeWithPlan(
        executionPlan,
        state,
        (progress, message) => {
          // Map node execution progress to 30-90% of total progress
          const totalProgress = 30 + (progress * 0.6);
          this.emitProgress(state, totalProgress, message);
        }
      );

      const executionTime = Date.now() - startTime;

      // Final validation and aggregation
      this.emitProgress(state, 90, "Finalizing multi-node processing results");
      const finalResults = this.aggregateResults(processedState, executionPlan, executionTime);

      this.emitProgress(state, 100, "Multi-node processing completed successfully");

      return finalResults;

    } catch (error) {
      log.analysis.error("Multi-node orchestration error:", error);
      
      // Emit error progress
      if (state.progressCallback) {
        state.progressCallback({
          type: "error",
          stage: "multi_node_orchestration",
          progress: 0,
          message: error instanceof Error ? error.message : "Multi-node processing failed",
          timestamp: Date.now(),
        });
      }

      // Fallback to legacy processing if enabled
      if (this.config.fallbackToLegacy) {
        console.log("🔄 Falling back to legacy processing due to error");
        return this.fallbackToLegacyProcessing(state);
      }

      throw error;
    }
  }

  /**
   * Register all specialized processing nodes using the Universal Factory
   * Dramatically simplified - nodes are created dynamically from configuration
   */
  private async registerSpecializedNodes(): Promise<void> {
    const nodesToRegister: NodeDefinition[] = [];

    // Register all nodes from the universal factory configuration
    const allConfigurations = UniversalNodeFactory.getAllConfigurations();
    
    for (const [nodeId, config] of Object.entries(allConfigurations)) {
      // Register all nodes through universal factory (no more legacy exceptions)
      const universalNode: NodeDefinition = {
        nodeName: config.nodeName,
        description: config.description,
        featureDetectionTriggers: config.triggers,
        priority: config.priority,
        nodeFunction: UniversalNodeFactory.createNode(nodeId),
      };
      nodesToRegister.push(universalNode);
    }

    // Register all nodes with the registry
    for (const node of nodesToRegister) {
      nodeRegistry.registerNode(node);
    }

    console.log(`📝 Registered ${nodesToRegister.length} processing nodes (all universal)`);
  }

  /**
   * Execute nodes according to the execution plan
   */
  private async executeWithPlan(
    executionPlan: any,
    state: DocumentProcessingState,
    progressCallback: (progress: number, message: string) => void
  ): Promise<DocumentProcessingState> {
    const executionStats = nodeRegistry.getExecutionStats(executionPlan);
    
    console.log("🚀 Starting multi-node execution:", executionStats);

    if (this.config.enableParallelExecution) {
      return nodeRegistry.executeNodes(executionPlan, state, progressCallback);
    } else {
      // Sequential execution for debugging or specific requirements
      return this.executeSequentially(executionPlan, state, progressCallback);
    }
  }

  /**
   * Execute nodes sequentially (for debugging or specific requirements)
   */
  private async executeSequentially(
    executionPlan: any,
    state: DocumentProcessingState,
    progressCallback: (progress: number, message: string) => void
  ): Promise<DocumentProcessingState> {
    let currentState = { ...state };
    let completedNodes = 0;

    console.log("🔄 Executing nodes sequentially");

    for (const group of executionPlan.parallelGroups) {
      for (const node of group) {
        try {
          console.log(`⚡ Executing ${node.nodeName}...`);
          const nodeResult = await Promise.race([
            node.nodeFunction(currentState),
            this.createNodeTimeout(node.nodeName),
          ]);

          currentState = { ...currentState, ...nodeResult };
          completedNodes++;

          const progress = Math.round((completedNodes / executionPlan.totalNodes) * 100);
          progressCallback(progress, `Completed ${node.nodeName} (${completedNodes}/${executionPlan.totalNodes})`);

          console.log(`✅ Completed ${node.nodeName}`);
        } catch (error) {
          console.error(`❌ Failed ${node.nodeName}:`, error);
          
          // Add error to state but continue processing
          currentState = {
            ...currentState,
            errors: [
              ...(currentState.errors || []),
              {
                node: node.nodeName,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
              },
            ],
          };
          completedNodes++;
        }
      }
    }

    return currentState;
  }

  /**
   * Create a timeout promise for node execution
   */
  private createNodeTimeout(nodeName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Node ${nodeName} timed out after ${this.config.timeoutPerNode}ms`));
      }, this.config.timeoutPerNode);
    });
  }

  /**
   * Aggregate results from all processed nodes
   */
  private aggregateResults(
    processedState: DocumentProcessingState,
    executionPlan: any,
    executionTime: number
  ): Partial<DocumentProcessingState> {
    const processedNodes = executionPlan.executionOrder;
    const errors = processedState.errors || [];
    const successful = processedNodes.length - errors.filter(e => processedNodes.includes(e.node)).length;

    // Map Universal Factory section names to ReportAnalysis interface properties
    // Section names are node names with '-processing' removed, except medical-analysis stays as-is
    const sectionNameMap: Record<string, string> = {
      'medical-analysis': 'medical-analysis', // This contains the main medical data
      'signal-processing': 'signals', 
      'medications-processing': 'medications',
      'prescriptions-processing': 'prescriptions', // Add prescriptions mapping
      'immunization-processing': 'immunizations',
      'imaging-processing': 'imaging',
      'procedures-processing': 'procedures',
      'ecg-processing': 'ecg',
      'echo-processing': 'echo',
      'imaging-findings-processing': 'imagingFindings',
      'allergies-processing': 'allergies',
      'anesthesia-processing': 'anesthesia',
      'microscopic-processing': 'microscopic',
      'triage-processing': 'triage',
      'specimens-processing': 'specimens',
      'admission-processing': 'admission',
      'dental-processing': 'dental',
      
      // Advanced Medical Analysis (Priority 5)
      'tumor-characteristics-processing': 'tumorCharacteristics',
      'treatment-plan-processing': 'treatmentPlan',
      'treatment-response-processing': 'treatmentResponse',
      'gross-findings-processing': 'grossFindings',
      'special-stains-processing': 'specialStains',
      'social-history-processing': 'socialHistory',
      'treatments-processing': 'treatments',
      'assessment-processing': 'assessment',
      'molecular-processing': 'molecular',
      
      // Also check for the actual section names (node names with -processing removed)
      'signal': 'signals',
      'medications': 'medications',
      'prescriptions': 'prescriptions',
      'immunization': 'immunizations',
      'imaging': 'imaging',
      'procedures': 'procedures',
      'ecg': 'ecg',
      'echo': 'echo',
      'imagingFindings': 'imagingFindings',
      'allergies': 'allergies',
      'anesthesia': 'anesthesia',
      'microscopic': 'microscopic',
      'triage': 'triage',
      'specimens': 'specimens',
      'admission': 'admission',
      'dental': 'dental',
      'tumorCharacteristics': 'tumorCharacteristics',
      'treatmentPlan': 'treatmentPlan',
      'treatmentResponse': 'treatmentResponse',
      'grossFindings': 'grossFindings',
      'specialStains': 'specialStains',
      'socialHistory': 'socialHistory',
      'treatments': 'treatments',
      'assessment': 'assessment',
      'molecular': 'molecular',
    };

    // Build properly structured result matching ReportAnalysis interface
    const structuredResults: any = {
      // Preserve core state properties
      tokenUsage: processedState.tokenUsage,
      errors: processedState.errors,
    };

    // Build the main report object by combining all medical sections
    const reportObject: any = {
      recommendations: [],
      summary: "",
      medications: [],
      prescriptions: [],
      signals: [],
      procedures: [],
      imaging: [],
      immunizations: [],
      ecg: [],
      echo: null,
      imagingFindings: null,
      allergies: [],
      anesthesia: [],
      microscopic: [],
      triage: [],
      specimens: [],
      admission: [],
      dental: [],
      // Advanced Medical Analysis
      tumorCharacteristics: null,
      treatmentPlan: null,
      treatmentResponse: null,
      grossFindings: null,
      specialStains: [],
      socialHistory: null,
      treatments: [],
      assessment: null,
      molecular: null,
    };

    // Debug: Log what sections are in the processed state
    console.log("🔍 Multi-Node Aggregation Debug:", {
      processedStateKeys: Object.keys(processedState).filter(k => 
        !['images', 'text', 'language', 'content', 'tokenUsage', 'featureDetection', 'featureDetectionResults', 'errors', 'progressCallback', 'emitProgress', 'emitComplete', 'emitError'].includes(k)
      ),
      sectionNameMap,
      executionOrder: executionPlan.executionOrder
    });

    // Map each Universal Factory section result to the correct interface property
    for (const [sectionName, interfaceProperty] of Object.entries(sectionNameMap)) {
      if ((processedState as any)[sectionName]) {
        console.log(`✅ Mapping section '${sectionName}' to '${interfaceProperty}'`, {
          data: (processedState as any)[sectionName]
        });
        
        if (sectionName === 'medical-analysis') {
          // For the main medical-analysis, this IS the report data - merge it into reportObject
          let medicalData = (processedState as any)[sectionName];
          console.log(`🔍 Medical-analysis data before processing:`, {
            medicalDataType: typeof medicalData,
            medicalDataIsArray: Array.isArray(medicalData),
            medicalDataKeys: medicalData && typeof medicalData === 'object' ? Object.keys(medicalData) : 'not an object',
            medicalDataContent: medicalData,
            hasReportField: medicalData && typeof medicalData === 'object' && 'report' in medicalData,
            reportFieldType: medicalData && typeof medicalData === 'object' && 'report' in medicalData ? typeof medicalData.report : 'no-report-field',
            reportFieldIsArray: medicalData && typeof medicalData === 'object' && 'report' in medicalData ? Array.isArray(medicalData.report) : false
          });
          
          // Fix: If medical data came back as an array, extract the first object
          if (Array.isArray(medicalData)) {
            console.log(`⚠️ Medical-analysis returned as array, extracting first element`);
            medicalData = medicalData.length > 0 && typeof medicalData[0] === 'object' ? medicalData[0] : {};
            console.log(`✅ Extracted medical data:`, {
              extractedType: typeof medicalData,
              extractedKeys: medicalData && typeof medicalData === 'object' ? Object.keys(medicalData) : 'not an object',
              extractedContent: medicalData
            });
          }
          
          // Only merge if we have a valid object, but EXCLUDE any 'report' field to prevent override
          if (medicalData && typeof medicalData === 'object' && !Array.isArray(medicalData)) {
            // Create a copy without the report field to prevent override
            const { report: _, ...medicalDataWithoutReport } = medicalData;
            Object.assign(reportObject, medicalDataWithoutReport);
            console.log(`📋 Merged medical-analysis data into report object (excluding report field):`, {
              medicalDataKeys: Object.keys(medicalData),
              mergedKeys: Object.keys(medicalDataWithoutReport),
              reportObjectKeysAfterMerge: Object.keys(reportObject),
              reportObjectType: typeof reportObject,
              reportObjectIsArray: Array.isArray(reportObject),
              skippedReportField: 'report' in medicalData
            });
          } else {
            console.warn(`⚠️ Invalid medical-analysis data structure, skipping merge:`, {
              medicalDataType: typeof medicalData,
              medicalDataIsArray: Array.isArray(medicalData)
            });
          }
        } else {
          // For specialized sections, add to report object under the correct property name
          const sectionData = (processedState as any)[sectionName];
          reportObject[interfaceProperty] = sectionData;
          
          // Also add as separate field for backward compatibility
          structuredResults[interfaceProperty] = sectionData;
          
          console.log(`📊 Added ${sectionName} to report.${interfaceProperty}:`, {
            dataType: typeof sectionData,
            dataKeys: sectionData && typeof sectionData === 'object' ? Object.keys(sectionData) : []
          });
        }
      } else {
        console.log(`⏭️ Section '${sectionName}' not found in processed state`);
      }
    }

    // Set the main report object
    structuredResults.report = reportObject;
    
    console.log("📋 Final Report Object Created:", {
      reportObjectKeys: Object.keys(reportObject),
      reportObjectType: typeof reportObject,
      hasRecommendations: !!reportObject.recommendations,
      hasMedications: !!reportObject.medications,
      hasProcedures: !!reportObject.procedures
    });

    // Debug what's in processedState that might conflict with our structured results
    console.log("🔍 ProcessedState structure before aggregation:", {
      processedStateKeys: Object.keys(processedState),
      hasReportInProcessedState: 'report' in processedState,
      processedStateReportType: typeof (processedState as any).report,
      processedStateReportContent: (processedState as any).report,
      structuredResultsKeys: Object.keys(structuredResults),
      structuredResultsReportType: typeof structuredResults.report,
      structuredResultsReportKeys: structuredResults.report ? Object.keys(structuredResults.report) : []
    });

    // Build aggregated results carefully to avoid conflicts
    const aggregatedResults = {
      // Start with basic state properties (excluding conflicting report data)
      ...Object.fromEntries(
        Object.entries(processedState).filter(([key]) => 
          !['report', 'medical-analysis'].includes(key) && 
          !Object.keys(structuredResults).includes(key)
        )
      ),
      
      // Apply our properly structured results (this should include the correct report object)
      ...structuredResults,
      
      // Add multi-node execution metadata
      multiNodeResults: {
        processedNodes,
        successfulNodes: successful,
        failedNodes: errors.length,
        executionTime,
        parallelGroups: executionPlan.parallelGroups.length,
        executionStats: nodeRegistry.getExecutionStats(executionPlan),
      },
      
      // FORCE our report object to override any conflicts
      report: reportObject,
    };
    
    // Additional debugging and final check
    console.log("🎯 FINAL REPORT OBJECT VERIFICATION:", {
      aggregatedResultsReportType: typeof aggregatedResults.report,
      aggregatedResultsReportIsArray: Array.isArray(aggregatedResults.report),
      aggregatedResultsReportKeys: aggregatedResults.report && typeof aggregatedResults.report === 'object' && !Array.isArray(aggregatedResults.report) 
        ? Object.keys(aggregatedResults.report) : 'not-an-object',
      reportObjectBuilt: reportObject,
      finalReportAssigned: aggregatedResults.report
    });
    
    // CRITICAL: Delete any existing report property that might be an array and force our object
    if (Array.isArray(aggregatedResults.report)) {
      console.log("🚨 CRITICAL: Report is still an array after aggregation, forcing object override");
      aggregatedResults.report = reportObject;
    };
    
    console.log("📤 Final aggregated results structure:", {
      aggregatedResultsKeys: Object.keys(aggregatedResults),
      finalReportType: typeof aggregatedResults.report,
      finalReportIsArray: Array.isArray(aggregatedResults.report),
      finalReportKeys: aggregatedResults.report && typeof aggregatedResults.report === 'object' && !Array.isArray(aggregatedResults.report) 
        ? Object.keys(aggregatedResults.report) : 'not-an-object',
      finalReportContent: aggregatedResults.report,
      reportObjectContent: reportObject,
      reportObjectType: typeof reportObject,
      reportObjectIsArray: Array.isArray(reportObject)
    });

    // Log summary
    console.log("📊 Multi-node processing summary:", {
      totalNodes: processedNodes.length,
      successful,
      failed: errors.length,
      executionTime: `${executionTime}ms`,
      structuredProperties: Object.keys(structuredResults).filter(k => k !== 'tokenUsage' && k !== 'errors'),
    });

    if (isLangGraphDebuggingEnabled()) {
      log.analysis.debug("Multi-node execution results:", aggregatedResults.multiNodeResults);
      log.analysis.debug("Structured results mapping:", structuredResults);
    }

    // CRITICAL DEBUG: Log what we're actually returning 
    console.log("🚨 CRITICAL DEBUG - What orchestrator is returning:", {
      returnType: typeof aggregatedResults,
      returnKeys: Object.keys(aggregatedResults),
      returnReportType: typeof aggregatedResults.report,
      returnReportIsArray: Array.isArray(aggregatedResults.report),
      returnReportContent: aggregatedResults.report,
      returnMedications: aggregatedResults.medications,
      returnProcedures: aggregatedResults.procedures
    });

    return aggregatedResults;
  }

  /**
   * Fallback to legacy processing
   */
  private async fallbackToLegacyProcessing(state: DocumentProcessingState): Promise<Partial<DocumentProcessingState>> {
    console.log("🔄 Using legacy medical analysis processing");
    
    try {
      // Import legacy analyze function
      const { analyze } = await import("$lib/import.server/analyzeReport");
      
      this.emitProgress(state, 10, "Using legacy medical analysis");
      
      // Convert state.content to text for legacy processing
      let textContent = state.text || "";
      if (state.content && Array.isArray(state.content)) {
        const textParts = state.content
          .filter(item => item.type === "text")
          .map(item => item.text)
          .join("\n");
        textContent = textParts || textContent;
      }
      
      const legacyData = {
        images: [], // Legacy function expects this structure
        text: textContent,
        language: state.language || "English",
      };

      const result = await analyze(legacyData);
      
      this.emitProgress(state, 100, "Legacy medical analysis completed");

      // Convert ReportAnalysis to MedicalAnalysis format
      const medicalAnalysis: any = {
        content: result.content || result,
        tokenUsage: result.tokenUsage || { total: 0 },
        provider: "legacy-analysis",
      };
      
      return {
        medicalAnalysis,
        multiNodeResults: {
          processedNodes: ["legacy-analysis"],
          successfulNodes: 1,
          failedNodes: 0,
          executionTime: 0,
          parallelGroups: 1,
          executionStats: {},
          message: "Used legacy processing as fallback",
        },
      };
    } catch (error) {
      console.error("❌ Legacy processing also failed:", error);
      throw new Error(`Both multi-node and legacy processing failed: ${error}`);
    }
  }

  /**
   * Emit progress updates
   */
  private emitProgress(state: DocumentProcessingState, progress: number, message: string): void {
    if (state.progressCallback) {
      state.progressCallback({
        type: "progress",
        stage: "multi_node_processing",
        progress,
        message,
        timestamp: Date.now(),
      });
    }
    state.emitProgress?.("multi_node_processing", progress, message);
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): any {
    return {
      isInitialized: this.isInitialized,
      registeredNodes: nodeRegistry.getAllNodes().length,
      config: this.config,
      availableNodes: nodeRegistry.getAllNodes().map(n => n.nodeName),
    };
  }
}

/**
 * Global orchestrator instance
 */
export const multiNodeOrchestrator = new MultiNodeOrchestrator();

/**
 * Convenience function for use in workflows
 */
export const executeMultiNodeProcessing = async (
  state: DocumentProcessingState
): Promise<Partial<DocumentProcessingState>> => {
  return multiNodeOrchestrator.orchestrateProcessing(state);
};