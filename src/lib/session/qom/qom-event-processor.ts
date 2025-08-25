// QOM Event Processor
// Processes SSE events and updates QOM execution state

import { qomActions } from "$lib/session/stores/qom-execution-store";
import type {
  QOMEvent,
  NodeStartedEvent,
  NodeProgressEvent,
  NodeCompletedEvent,
  NodeFailedEvent,
  ExpertTriggeredEvent,
  RelationshipAddedEvent,
  ModelSwitchedEvent,
  QOMCompletedEvent,
  QOMInitializedEvent,
} from "$components/session/types/qom";
import { transformQOMState } from "./qom-transformer";

// Event processor class to handle incoming SSE events
export class QOMEventProcessor {
  private eventQueue: QOMEvent[] = [];
  private processingQueue = false;
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY = 100; // ms to wait before processing batch

  constructor() {
    // Bind methods to preserve context
    this.processEvent = this.processEvent.bind(this);
    this.processBatch = this.processBatch.bind(this);
  }

  // Main entry point for processing QOM events
  processEvent(event: QOMEvent) {
    console.log("📊 Processing QOM event:", event.type, event);

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
      // Group expert_triggered events for batch processing
      const expertEvents = eventsToProcess.filter(
        (e) => e.type === "expert_triggered",
      ) as ExpertTriggeredEvent[];
      const otherEvents = eventsToProcess.filter(
        (e) => e.type !== "expert_triggered",
      );

      // Process non-expert events first
      otherEvents.forEach((event) => {
        this.processIndividualEvent(event);
      });

      // Batch process expert events by parent
      if (expertEvents.length > 0) {
        this.processExpertEventsBatch(expertEvents);
      }
    } catch (error) {
      console.error("❌ Error processing QOM event batch:", error);
    } finally {
      this.processingQueue = false;
      this.batchTimeout = null;
    }
  }

  // Process expert events in batches by parent to avoid layout thrashing
  private processExpertEventsBatch(expertEvents: ExpertTriggeredEvent[]) {
    // Group experts by parent ID
    const expertsByParent = new Map<string, ExpertTriggeredEvent[]>();

    expertEvents.forEach((event) => {
      const parentId = event.parentId;
      if (!expertsByParent.has(parentId)) {
        expertsByParent.set(parentId, []);
      }
      expertsByParent.get(parentId)!.push(event);
    });

    // Process each parent's experts as a batch
    expertsByParent.forEach((events, parentId) => {
      console.log(
        `🎯 Batch processing ${events.length} experts for parent: ${parentId}`,
      );

      if (events.length === 1) {
        // Single expert - use individual processing
        this.handleExpertTriggered(events[0]);
      } else {
        // Multiple experts - use batch processing
        this.handleMultipleExpertsTriggered(events);
      }
    });
  }

  // Handle multiple experts triggered from the same parent
  private handleMultipleExpertsTriggered(events: ExpertTriggeredEvent[]) {
    const parentId = events[0].parentId;
    console.log(
      `🎯 Batch adding ${events.length} experts from ${parentId}:`,
      events.map((e) => e.expertName),
    );

    // Create all expert nodes
    const expertNodes: any[] = events.map((event) => ({
      id: event.expertId,
      name: event.expertName,
      type: "specialist",
      category: "ai_generated",
      layer: 0,
      parent: event.parentId,
      children: ["consensus_merger"],
      state: "pending",
      provider: "openai",
      model: "gpt-4",
      triggerConditions: event.triggerConditions,
      triggered: true,
      x: 0,
      y: 0,
    }));

    // Add all experts in a single batch operation
    qomActions.addNodes(expertNodes, {
      insertBetween: {
        parents: [parentId],
        children: ["consensus_merger"],
      },
    });
  }

  // Process individual event
  private processIndividualEvent(event: QOMEvent) {
    switch (event.type) {
      case "qom_initialized":
        this.handleQOMInitialized(event as QOMInitializedEvent);
        break;

      case "node_started":
        this.handleNodeStarted(event as NodeStartedEvent);
        break;

      case "node_progress":
        this.handleNodeProgress(event as NodeProgressEvent);
        break;

      case "node_completed":
        this.handleNodeCompleted(event as NodeCompletedEvent);
        break;

      case "node_failed":
        this.handleNodeFailed(event as NodeFailedEvent);
        break;

      case "expert_triggered":
        this.handleExpertTriggered(event as ExpertTriggeredEvent);
        break;

      case "relationship_added":
        this.handleRelationshipAdded(event as RelationshipAddedEvent);
        break;

      case "model_switched":
        this.handleModelSwitched(event as ModelSwitchedEvent);
        break;

      case "qom_completed":
        this.handleQOMCompleted(event as QOMCompletedEvent);
        break;

      default:
        console.warn("🤷 Unknown QOM event type:", (event as any).type);
    }
  }

  private handleQOMInitialized(event: QOMInitializedEvent) {
    console.log("🚀 QOM initialized:", event.qomModelId);

    // Process through store actions which handles the complex update logic
    qomActions.processEvent(event);
  }

  private handleNodeStarted(event: NodeStartedEvent) {
    console.log(`⚡ Node started: ${event.nodeName} (${event.nodeId})`);

    qomActions.updateNodeState(event.nodeId, "running", {
      startTime: event.timestamp,
      provider: event.provider,
      model: event.model,
    });
  }

  private handleNodeProgress(event: NodeProgressEvent) {
    console.log(`📈 Node progress: ${event.nodeId} - ${event.progress}%`);

    qomActions.updateNodeState(event.nodeId, "running", {
      progress: event.progress,
    });
  }

  private handleNodeCompleted(event: NodeCompletedEvent) {
    console.log(`✅ Node completed: ${event.nodeId} in ${event.duration}ms`);

    qomActions.updateNodeState(event.nodeId, "completed", {
      endTime: Date.now(),
      duration: event.duration,
      cost: event.cost,
      tokenUsage: event.tokenUsage,
      output: event.output,
    });
  }

  private handleNodeFailed(event: NodeFailedEvent) {
    console.log(`❌ Node failed: ${event.nodeId} - ${event.error}`);

    qomActions.updateNodeState(event.nodeId, "failed", {
      error: event.error,
    });

    // If there's a fallback model and retry is planned, update the model
    if (event.willRetry && event.fallbackModel) {
      setTimeout(() => {
        qomActions.updateNodeState(event.nodeId, "running", {
          model: event.fallbackModel,
          startTime: Date.now(),
        });
      }, 2000); // Wait 2 seconds before retry
    }
  }

  private handleExpertTriggered(event: ExpertTriggeredEvent) {
    console.log(
      `🎯 Expert triggered: ${event.expertName} by ${event.parentId}`,
    );

    // Use the generic addParallelExpert method
    qomActions.addParallelExpert(event);
  }

  private handleRelationshipAdded(event: RelationshipAddedEvent) {
    console.log(
      `🔗 Relationship added: ${event.sourceId} -> ${event.targetId} (${event.relationshipType})`,
    );

    qomActions.processEvent(event);
  }

  private handleModelSwitched(event: ModelSwitchedEvent) {
    console.log(
      `🔄 Model switched for ${event.nodeId}: ${event.fromModel} -> ${event.toModel}`,
    );

    qomActions.updateNodeState(event.nodeId, "running", {
      model: event.toModel,
    });
  }

  private handleQOMCompleted(event: QOMCompletedEvent) {
    console.log(
      `🏁 QOM completed: ${event.successCount}/${event.nodeCount} nodes succeeded`,
    );

    qomActions.processEvent(event);
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
      hasPendingBatch: this.batchTimeout !== null,
    };
  }
}

// Singleton instance
export const qomEventProcessor = new QOMEventProcessor();

// Helper function to validate QOM events
export function isValidQOMEvent(event: any): event is QOMEvent {
  if (!event || typeof event !== "object") {
    return false;
  }

  const validEventTypes = [
    "qom_initialized",
    "node_started",
    "node_progress",
    "node_completed",
    "node_failed",
    "expert_triggered",
    "relationship_added",
    "model_switched",
    "qom_completed",
  ];

  return validEventTypes.includes(event.type);
}
