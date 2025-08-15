// DAG Event Processor
// Processes SSE events and updates DAG execution state

import { dagActions } from '$lib/session/stores/dag-execution-store';
import type { 
  DAGEvent,
  NodeStartedEvent,
  NodeProgressEvent,
  NodeCompletedEvent,
  NodeFailedEvent,
  ExpertTriggeredEvent,
  RelationshipAddedEvent,
  ModelSwitchedEvent,
  DAGCompletedEvent,
  DAGInitializedEvent
} from '$components/session/types/dag';
import { transformDAGState } from './dag-transformer';

// Event processor class to handle incoming SSE events
export class DAGEventProcessor {
  private eventQueue: DAGEvent[] = [];
  private processingQueue = false;
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY = 100; // ms to wait before processing batch

  constructor() {
    // Bind methods to preserve context
    this.processEvent = this.processEvent.bind(this);
    this.processBatch = this.processBatch.bind(this);
  }

  // Main entry point for processing DAG events
  processEvent(event: DAGEvent) {
    console.log('📊 Processing DAG event:', event.type, event);

    // Add to queue for batch processing
    this.eventQueue.push(event);

    // Batch process events to avoid too many rapid updates
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  // Process queued events as a batch
  private processBatch() {
    if (this.processingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.processingQueue = true;
    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Process events in order
      eventsToProcess.forEach(event => {
        this.processIndividualEvent(event);
      });
    } catch (error) {
      console.error('❌ Error processing DAG event batch:', error);
    } finally {
      this.processingQueue = false;
      this.batchTimeout = null;
    }
  }

  // Process individual event
  private processIndividualEvent(event: DAGEvent) {
    switch (event.type) {
      case 'dag_initialized':
        this.handleDAGInitialized(event as DAGInitializedEvent);
        break;
        
      case 'node_started':
        this.handleNodeStarted(event as NodeStartedEvent);
        break;
        
      case 'node_progress':
        this.handleNodeProgress(event as NodeProgressEvent);
        break;
        
      case 'node_completed':
        this.handleNodeCompleted(event as NodeCompletedEvent);
        break;
        
      case 'node_failed':
        this.handleNodeFailed(event as NodeFailedEvent);
        break;
        
      case 'expert_triggered':
        this.handleExpertTriggered(event as ExpertTriggeredEvent);
        break;
        
      case 'relationship_added':
        this.handleRelationshipAdded(event as RelationshipAddedEvent);
        break;
        
      case 'model_switched':
        this.handleModelSwitched(event as ModelSwitchedEvent);
        break;
        
      case 'dag_completed':
        this.handleDAGCompleted(event as DAGCompletedEvent);
        break;
        
      default:
        console.warn('🤷 Unknown DAG event type:', (event as any).type);
    }
  }

  private handleDAGInitialized(event: DAGInitializedEvent) {
    console.log('🚀 DAG initialized:', event.dagModelId);
    
    // Process through store actions which handles the complex update logic
    dagActions.processEvent(event);
  }

  private handleNodeStarted(event: NodeStartedEvent) {
    console.log(`⚡ Node started: ${event.nodeName} (${event.nodeId})`);
    
    dagActions.updateNodeState(event.nodeId, 'running', {
      startTime: event.timestamp,
      provider: event.provider,
      model: event.model
    });
  }

  private handleNodeProgress(event: NodeProgressEvent) {
    console.log(`📈 Node progress: ${event.nodeId} - ${event.progress}%`);
    
    dagActions.updateNodeState(event.nodeId, 'running', {
      progress: event.progress
    });
  }

  private handleNodeCompleted(event: NodeCompletedEvent) {
    console.log(`✅ Node completed: ${event.nodeId} in ${event.duration}ms`);
    
    dagActions.updateNodeState(event.nodeId, 'completed', {
      endTime: Date.now(),
      duration: event.duration,
      cost: event.cost,
      tokenUsage: event.tokenUsage,
      output: event.output
    });
  }

  private handleNodeFailed(event: NodeFailedEvent) {
    console.log(`❌ Node failed: ${event.nodeId} - ${event.error}`);
    
    dagActions.updateNodeState(event.nodeId, 'failed', {
      error: event.error
    });

    // If there's a fallback model and retry is planned, update the model
    if (event.willRetry && event.fallbackModel) {
      setTimeout(() => {
        dagActions.updateNodeState(event.nodeId, 'running', {
          model: event.fallbackModel,
          startTime: Date.now()
        });
      }, 2000); // Wait 2 seconds before retry
    }
  }

  private handleExpertTriggered(event: ExpertTriggeredEvent) {
    console.log(`🎯 Expert triggered: ${event.expertName} by ${event.parentId}`);
    
    // Process through store actions which handles node creation and linking
    dagActions.processEvent(event);
    
    // Activate the trigger link
    const linkId = `${event.parentId}_to_${event.expertId}`;
    dagActions.activateLink(linkId);
  }

  private handleRelationshipAdded(event: RelationshipAddedEvent) {
    console.log(`🔗 Relationship added: ${event.sourceId} -> ${event.targetId} (${event.relationshipType})`);
    
    dagActions.processEvent(event);
  }

  private handleModelSwitched(event: ModelSwitchedEvent) {
    console.log(`🔄 Model switched for ${event.nodeId}: ${event.fromModel} -> ${event.toModel}`);
    
    dagActions.updateNodeState(event.nodeId, 'running', {
      model: event.toModel
    });
  }

  private handleDAGCompleted(event: DAGCompletedEvent) {
    console.log(`🏁 DAG completed: ${event.successCount}/${event.nodeCount} nodes succeeded`);
    
    dagActions.processEvent(event);
  }

  // Utility method to clear the event queue
  clearQueue() {
    this.eventQueue = [];
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.processingQueue = false;
  }

  // Get queue status for debugging
  getQueueStatus() {
    return {
      queueLength: this.eventQueue.length,
      processingQueue: this.processingQueue,
      hasPendingBatch: this.batchTimeout !== null
    };
  }
}

// Singleton instance
export const dagEventProcessor = new DAGEventProcessor();

// Helper function to validate DAG events
export function isValidDAGEvent(event: any): event is DAGEvent {
  if (!event || typeof event !== 'object') {
    return false;
  }

  const validEventTypes = [
    'dag_initialized',
    'node_started',
    'node_progress',
    'node_completed',
    'node_failed',
    'expert_triggered',
    'relationship_added',
    'model_switched',
    'dag_completed'
  ];

  return validEventTypes.includes(event.type);
}

// Helper function to create mock events for development/testing
export function createMockDAGEvents(sessionId: string): DAGEvent[] {
  const timestamp = Date.now();
  
  return [
    // 1. DAG initialization with new config
    {
      type: 'dag_initialized',
      dagModelId: 'universal_medical_dag_v2',
      nodes: [],
      links: [],
      timestamp
    } as DAGInitializedEvent,
    
    // 2. Symptoms detector starts processing session data
    {
      type: 'node_started',
      nodeId: 'symptoms_detector',
      nodeName: 'Symptoms Detection',
      model: 'gpt-4',
      provider: 'openai',
      timestamp: timestamp + 1000
    } as NodeStartedEvent,
    
    // 3. Symptoms detector completes and activates primary analyzer
    {
      type: 'node_completed',
      nodeId: 'symptoms_detector',
      duration: 2500,
      cost: 0.018,
      tokenUsage: {
        input: 800,
        output: 400
      }
    } as NodeCompletedEvent,

    // 4. Primary analyzer starts processing detected symptoms
    {
      type: 'node_started',
      nodeId: 'primary_analyzer',
      nodeName: 'Primary Medical Analyzer',
      model: 'gpt-4',
      provider: 'openai',
      timestamp: timestamp + 3500
    } as NodeStartedEvent,

    // 5. Primary analyzer detects complex cardiac case - creates 3 parallel experts
    {
      type: 'expert_triggered',
      parentId: 'primary_analyzer',
      expertId: 'conservative_cardiologist',
      expertName: 'Conservative Cardiologist',
      triggerConditions: ['chest_pain', 'cardiac_risk_factors', 'complex_case'],
      layer: 3,
      parallelGroup: 'cardiology_consultation',
      expertVariation: {
        approach: 'conservative',
        riskTolerance: 'low',
        perspective: 'guideline_based'
      }
    } as ExpertTriggeredEvent,
    
    // 6. Second parallel expert created
    {
      type: 'expert_triggered',
      parentId: 'primary_analyzer',
      expertId: 'interventional_cardiologist',
      expertName: 'Interventional Cardiologist',
      triggerConditions: ['chest_pain', 'high_risk_features', 'acute_presentation'],
      layer: 3,
      parallelGroup: 'cardiology_consultation',
      expertVariation: {
        approach: 'aggressive',
        riskTolerance: 'high',
        perspective: 'interventional_focused'
      }
    } as ExpertTriggeredEvent,
    
    // 7. Third parallel expert created
    {
      type: 'expert_triggered',
      parentId: 'primary_analyzer',
      expertId: 'diabetic_cardiologist',
      expertName: 'Diabetic Cardiology Specialist',
      triggerConditions: ['diabetes', 'cardiac_symptoms', 'silent_ischemia_risk'],
      layer: 3,
      parallelGroup: 'cardiology_consultation', 
      expertVariation: {
        approach: 'evidence_based',
        riskTolerance: 'moderate',
        perspective: 'diabetic_complications'
      }
    } as ExpertTriggeredEvent,
    
    // 8. Primary analyzer completes with expert generation decision
    {
      type: 'node_completed',
      nodeId: 'primary_analyzer',
      duration: 4500,
      cost: 0.032,
      tokenUsage: {
        input: 1500,
        output: 900
      },
      output: {
        symptoms: [],
        diagnoses: [],
        treatments: [],
        questions: [],
        confidence: 0.78,
        reasoning: 'Complex diabetic patient with atypical chest pain requires multiple cardiology perspectives',
        expertId: 'primary_analyzer',
        layer: 2,
        customExpertsGenerated: [
          'conservative_cardiologist',
          'interventional_cardiologist', 
          'diabetic_cardiologist'
        ]
      }
    } as NodeCompletedEvent,
    
    // 9. Parallel cardiology experts start simultaneously
    {
      type: 'node_started',
      nodeId: 'conservative_cardiologist',
      nodeName: 'Conservative Cardiologist',
      model: 'gpt-4',
      provider: 'openai',
      timestamp: timestamp + 6000
    } as NodeStartedEvent,
    
    {
      type: 'node_started',
      nodeId: 'interventional_cardiologist',
      nodeName: 'Interventional Cardiologist',
      model: 'gpt-4',
      provider: 'openai',
      timestamp: timestamp + 6100
    } as NodeStartedEvent,
    
    {
      type: 'node_started',
      nodeId: 'diabetic_cardiologist',
      nodeName: 'Diabetic Cardiology Specialist',
      model: 'gpt-4',
      provider: 'openai',
      timestamp: timestamp + 6200
    } as NodeStartedEvent,
    
    // 10. Parallel experts complete with different recommendations
    {
      type: 'node_completed',
      nodeId: 'conservative_cardiologist',
      duration: 5200,
      cost: 0.045,
      tokenUsage: {
        input: 1800,
        output: 1100
      },
      output: {
        recommendation: 'Outpatient stress testing, medical optimization',
        confidence: 0.82,
        reasoning: 'Standard guideline-based approach appropriate for stable symptoms'
      }
    } as NodeCompletedEvent,
    
    {
      type: 'node_completed',
      nodeId: 'interventional_cardiologist',
      duration: 5800,
      cost: 0.052,
      tokenUsage: {
        input: 2000,
        output: 1200
      },
      output: {
        recommendation: 'Urgent cardiac catheterization, rule out ACS',
        confidence: 0.75,
        reasoning: 'High-risk features warrant aggressive workup to exclude acute coronary syndrome'
      }
    } as NodeCompletedEvent,
    
    {
      type: 'node_completed',
      nodeId: 'diabetic_cardiologist',
      duration: 5500,
      cost: 0.048,
      tokenUsage: {
        input: 1900,
        output: 1150
      },
      output: {
        recommendation: 'Inpatient monitoring, consider silent MI, aggressive diabetes management',
        confidence: 0.88,
        reasoning: 'Diabetic patients have high risk of silent ischemia and atypical presentations'
      }
    } as NodeCompletedEvent,
    
    
    
    // 11. Consensus merger starts after all parallel experts complete
    {
      type: 'node_started',
      nodeId: 'consensus_merger',
      nodeName: 'Medical Consensus Builder',
      model: 'gpt-4-turbo',
      provider: 'openai',
      timestamp: timestamp + 15000
    } as NodeStartedEvent,
    
    // 12. Consensus merger completes with expert synthesis
    {
      type: 'node_completed',
      nodeId: 'consensus_merger',
      duration: 4200,
      cost: 0.035,
      tokenUsage: {
        input: 2500,
        output: 1200
      },
      output: {
        consensusRecommendation: 'Inpatient observation with urgent cardiology consultation and diabetes optimization',
        expertAgreements: [
          'All experts agree on need for cardiology evaluation',
          'All experts recommend diabetes management optimization'
        ],
        expertDisagreements: [
          'Conservative: Outpatient vs Interventional: Urgent cath vs Diabetic: Inpatient monitoring'
        ],
        finalReasoning: 'Diabetic specialist perspective weighted higher due to silent MI risk in diabetic patients',
        confidence: 0.85
      }
    } as NodeCompletedEvent,
    
    // 13. Final output node activates
    {
      type: 'node_started',
      nodeId: 'final_output',
      nodeName: 'Final Medical Analysis',
      model: 'none',
      provider: 'system',
      timestamp: timestamp + 18000
    } as NodeStartedEvent,
    
    // 14. Final output completes
    {
      type: 'node_completed',
      nodeId: 'final_output',
      duration: 500,
      cost: 0.000,
      tokenUsage: {
        input: 0,
        output: 0
      },
      output: {
        finalRecommendations: 'Multi-expert cardiology consultation complete with consensus recommendations',
        parallelExpertsUsed: 3,
        consensusAchieved: true,
        confidenceLevel: 'High (85%)'       
      }
    } as NodeCompletedEvent,
    
    // 15. DAG completes with multi-expert analysis
    {
      type: 'dag_completed',
      totalDuration: 18500,
      totalCost: 0.225,
      nodeCount: 8,  // 5 default + 3 parallel experts
      successCount: 8,
      failureCount: 0,
      parallelExpertsGenerated: 3,
      consensusAchieved: true,
      finalOutput: {
        symptoms: [],
        diagnoses: [],
        treatments: [],
        questions: [],
        confidence: 0.85,
        reasoning: 'Multi-expert cardiology consultation with diabetic specialist consensus',
        expertId: 'consensus_merger',
        layer: 4,
        expertContributions: [
          'Conservative Cardiologist: Guideline-based approach',
          'Interventional Cardiologist: Aggressive workup perspective', 
          'Diabetic Cardiologist: Silent ischemia risk assessment'
        ]
      }
    } as DAGCompletedEvent
  ];
}

// Export a function to simulate DAG execution for development
export function simulateDAGExecution(sessionId: string, intervalMs = 2000) {
  const events = createMockDAGEvents(sessionId);
  let currentIndex = 0;
  
  const interval = setInterval(() => {
    if (currentIndex >= events.length) {
      clearInterval(interval);
      console.log('🎬 DAG simulation completed');
      return;
    }
    
    const event = events[currentIndex];
    console.log(`🎭 Simulating event ${currentIndex + 1}/${events.length}:`, event.type);
    
    dagEventProcessor.processEvent(event);
    currentIndex++;
  }, intervalMs);
  
  return () => clearInterval(interval);
}