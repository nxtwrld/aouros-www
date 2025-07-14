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

      console.log("🎼 Multi-node orchestrator starting");

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
      
      const selectedNodes = nodeRegistry.selectNodes(state.featureDetectionResults);
      
      console.log(`🎯 Selected ${selectedNodes.length} nodes: ${selectedNodes.map(n => n.nodeName).join(', ')}`);

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

      console.log(`📋 Execution plan: ${executionPlan.totalNodes} nodes in ${executionPlan.parallelGroups.length} groups`);

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
          console.log(`🔄 Starting ${node.nodeName}`);
          const nodeResult = await Promise.race([
            node.nodeFunction(currentState),
            this.createNodeTimeout(node.nodeName),
          ]);

          currentState = { ...currentState, ...nodeResult };
          completedNodes++;

          const progress = Math.round((completedNodes / executionPlan.totalNodes) * 100);
          progressCallback(progress, `Completed ${node.nodeName} (${completedNodes}/${executionPlan.totalNodes})`);

          console.log(`✅ ${node.nodeName} completed`);
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

    // Get output mappings from node configurations instead of hardcoded map
    const outputMappings = UniversalNodeFactory.getAllOutputMappings();

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
      // Core medical components (from separate nodes)
      diagnosis: [],
      performer: null,
      patient: null,
      bodyParts: [],
      // Specialized medical sections
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

    console.log("📊 Aggregating results from processed nodes");
    console.log("🔍 Available keys in processedState:", Object.keys(processedState));
    console.log("🔍 ProcessedState data structure:");
    for (const [key, value] of Object.entries(processedState)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        console.log(`  ${key}: ${Object.keys(value).slice(0, 5).join(', ')}${Object.keys(value).length > 5 ? '...' : ''}`);
      } else {
        console.log(`  ${key}: ${typeof value} (${Array.isArray(value) ? `array[${value.length}]` : String(value).slice(0, 50)})`);
      }
    }
    console.log("🔍 Output mappings:", outputMappings);

    // Map each processed node result to the correct interface property using configuration
    for (const [nodeId, mapping] of Object.entries(outputMappings)) {
      console.log(`🔍 Checking for nodeId: ${nodeId} in processedState`);
      
      // The key in processedState is the reportField from output mapping
      // Get the actual storage key used by the node
      const storageKey = mapping?.reportField || nodeId.replace('-processing', '');
      const actualKey = (processedState as any)[storageKey] ? storageKey : 
                        (processedState as any)[nodeId] ? nodeId : null;
      
      console.log(`🔍 Looking for data under key: ${actualKey} (nodeId: ${nodeId}, storageKey: ${storageKey})`);
      
      if (actualKey && (processedState as any)[actualKey]) {
        console.log(`✅ Adding ${nodeId} to report (found data under key: ${actualKey})`);
        
        let nodeData = (processedState as any)[actualKey];
        
        // Handle unwrapping if specified in configuration
        if (mapping?.unwrapField) {
          if (nodeData && typeof nodeData === 'object' && nodeData[mapping.unwrapField]) {
            nodeData = nodeData[mapping.unwrapField];
            console.log(`🔧 Unwrapped ${nodeId} data from field: ${mapping.unwrapField}`);
          }
        }
        
        // Handle main report data (medical-analysis)
        if (mapping?.isMainReport) {
          // Fix: If medical data came back as an array, extract the first object
          if (Array.isArray(nodeData)) {
            console.log(`⚠️ Main report data returned as array, extracting first element`);
            nodeData = nodeData.length > 0 && typeof nodeData[0] === 'object' ? nodeData[0] : {};
          }
          
          // Only merge if we have a valid object, but EXCLUDE any 'report' field to prevent override
          if (nodeData && typeof nodeData === 'object' && !Array.isArray(nodeData)) {
            // Create a copy without the report field to prevent override
            const { report: _, ...dataWithoutReport } = nodeData;
            Object.assign(reportObject, dataWithoutReport);
          }
        } else {
          // For specialized sections, add to report object under the correct property name
          if (mapping?.reportField) {
            reportObject[mapping.reportField] = nodeData;
            
            // Also add as separate field for backward compatibility
            structuredResults[mapping.reportField] = nodeData;
          }
        }
      } else {
        console.log(`❌ No data found for nodeId: ${nodeId} (checked keys: ${storageKey}, ${nodeId})`);
      }
    }

    // Set the main report object
    structuredResults.report = reportObject;
    
    console.log(`📋 Report object created with ${Object.keys(reportObject).length} sections`);


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
    
    // CRITICAL: Delete any existing report property that might be an array and force our object
    if (Array.isArray(aggregatedResults.report)) {
      console.log("🚨 CRITICAL: Report is still an array after aggregation, forcing object override");
      aggregatedResults.report = reportObject;
    };
    
    console.log("✅ Multi-node orchestration completed");

    if (isLangGraphDebuggingEnabled()) {
      log.analysis.debug("Multi-node execution results:", aggregatedResults.multiNodeResults);
      log.analysis.debug("Structured results mapping:", structuredResults);
    }

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