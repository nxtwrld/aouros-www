# Dynamic Workflow Extension - Feature-Detection Driven

## 🎯 Core Concept: Feature-Detection → Dynamic Node Selection

The workflow should **automatically select and configure processing nodes** based on what the feature-detection phase actually discovers in each document, rather than using static node lists.

## 🔍 Current Feature Detection Results Structure

```typescript
// Example feature detection output
state.featureDetectionResults = {
  documentType: "emergency_record",
  hasECG: true,
  hasImaging: false, 
  hasTriage: true,
  hasSignals: true,
  hasPrescriptions: false,
  hasAnesthesia: false,
  confidence: 0.92,
  sections: ["triage", "ecg", "vitals", "assessment"]
}
```

## 🎛️ Dynamic Node Selection Rules

### `src/lib/configurations/workflows/dynamic-rules.json`

```json
{
  "version": "1.0.0",
  "description": "Dynamic node selection based on feature detection",
  "selectionRules": {
    "featureBasedNodes": {
      "hasECG": {
        "nodes": ["ecg-processing"],
        "priority": 2,
        "required": true,
        "conditions": {
          "confidence": ">= 0.7"
        }
      },
      "hasTriage": {
        "nodes": ["triage-processing"],
        "priority": 3,
        "required": true,
        "conditions": {
          "confidence": ">= 0.6",
          "documentType": ["emergency_record", "triage_note"]
        }
      },
      "hasSignals": {
        "nodes": ["signal-processing"],
        "priority": 1,
        "required": true,
        "conditions": {
          "confidence": ">= 0.5"
        }
      },
      "hasImaging": {
        "nodes": ["imaging-processing"],
        "priority": 2,
        "required": false,
        "conditions": {
          "confidence": ">= 0.8"
        }
      },
      "hasPrescriptions": {
        "nodes": ["prescription-processing"],
        "priority": 2,
        "required": false,
        "conditions": {
          "confidence": ">= 0.7"
        }
      },
      "hasAnesthesia": {
        "nodes": ["anesthesia-processing"],
        "priority": 3,
        "required": false,
        "conditions": {
          "confidence": ">= 0.8",
          "documentType": ["operative_note", "anesthesia_record"]
        }
      },
      "hasMicroscopic": {
        "nodes": ["microscopic-processing"],
        "priority": 3,
        "required": false,
        "conditions": {
          "confidence": ">= 0.8",
          "documentType": ["pathology_report"]
        }
      },
      "hasSpecimens": {
        "nodes": ["specimens-processing"],
        "priority": 4,
        "required": false,
        "conditions": {
          "confidence": ">= 0.7"
        }
      },
      "hasAdmission": {
        "nodes": ["admission-processing"],
        "priority": 4,
        "required": false,
        "conditions": {
          "confidence": ">= 0.6",
          "documentType": ["admission_note", "discharge_summary"]
        }
      },
      "hasImmunization": {
        "nodes": ["immunization-processing"],
        "priority": 3,
        "required": false,
        "conditions": {
          "confidence": ">= 0.7",
          "documentType": ["immunization_record", "vaccination_card"]
        }
      },
      "hasDental": {
        "nodes": ["dental-processing"],
        "priority": 4,
        "required": false,
        "conditions": {
          "confidence": ">= 0.7",
          "documentType": ["dental_record", "oral_health_assessment"]
        }
      }
    },
    "alwaysInclude": {
      "core": ["medical-analysis"],
      "conditions": {
        "confidence": ">= 0.3"
      }
    },
    "combinationRules": {
      "emergency_combo": {
        "trigger": {
          "documentType": "emergency_record",
          "AND": ["hasTriage", "hasECG"]
        },
        "action": {
          "boost_priority": ["triage-processing", "ecg-processing"],
          "reduce_timeout": 0.5,
          "parallel_execution": true
        }
      },
      "surgical_combo": {
        "trigger": {
          "documentType": "operative_note",
          "OR": ["hasAnesthesia", "hasProcedures"]
        },
        "action": {
          "add_nodes": ["procedures-processing"],
          "sequential_execution": ["anesthesia-processing", "procedures-processing"]
        }
      },
      "pathology_combo": {
        "trigger": {
          "documentType": "pathology_report",
          "AND": ["hasMicroscopic", "hasSpecimens"]
        },
        "action": {
          "add_nodes": ["specimens-processing"],
          "dependency": {
            "microscopic-processing": ["specimens-processing"]
          }
        }
      }
    }
  },
  "executionStrategy": {
    "parallelization": {
      "max_concurrent": 5,
      "priority_groups": {
        "1": "sequential",
        "2": "parallel", 
        "3": "parallel",
        "4": "parallel"
      }
    },
    "fallback": {
      "on_feature_detection_failure": ["medical-analysis"],
      "on_low_confidence": {
        "threshold": 0.3,
        "action": "include_core_only"
      }
    }
  }
}
```

## 🏗️ Dynamic Workflow Engine

### `src/lib/langgraph/orchestration/dynamic-orchestrator.ts`

```typescript
export interface DynamicNodeSelection {
  selectedNodes: string[];
  executionPlan: ExecutionPlan;
  reasoning: SelectionReasoning;
}

export interface SelectionReasoning {
  triggeredFeatures: string[];
  appliedRules: string[];
  priorityAdjustments: Record<string, number>;
  excludedNodes: { node: string; reason: string }[];
}

export class DynamicWorkflowOrchestrator {
  private rules: DynamicRules;

  constructor() {
    this.loadDynamicRules();
  }

  /**
   * Dynamically select nodes based on feature detection results
   */
  async selectNodesFromFeatures(
    featureResults: any,
    documentContext: any
  ): Promise<DynamicNodeSelection> {
    const selection: DynamicNodeSelection = {
      selectedNodes: [],
      executionPlan: { stages: [], totalNodes: 0 },
      reasoning: {
        triggeredFeatures: [],
        appliedRules: [],
        priorityAdjustments: {},
        excludedNodes: []
      }
    };

    // 1. Always include core nodes
    const coreNodes = this.rules.selectionRules.alwaysInclude.core;
    selection.selectedNodes.push(...coreNodes);
    selection.reasoning.appliedRules.push("always_include_core");

    // 2. Feature-based node selection
    for (const [feature, detected] of Object.entries(featureResults)) {
      if (detected && this.rules.selectionRules.featureBasedNodes[feature]) {
        const rule = this.rules.selectionRules.featureBasedNodes[feature];
        
        // Check conditions
        if (this.evaluateConditions(rule.conditions, featureResults, documentContext)) {
          selection.selectedNodes.push(...rule.nodes);
          selection.reasoning.triggeredFeatures.push(feature);
          selection.reasoning.appliedRules.push(`feature_${feature}`);
          
          // Apply priority adjustments
          rule.nodes.forEach(node => {
            selection.reasoning.priorityAdjustments[node] = rule.priority;
          });
        } else {
          selection.reasoning.excludedNodes.push({
            node: rule.nodes.join(','),
            reason: `Conditions not met for ${feature}`
          });
        }
      }
    }

    // 3. Apply combination rules
    selection = this.applyCombinationRules(selection, featureResults, documentContext);

    // 4. Create execution plan
    selection.executionPlan = this.createDynamicExecutionPlan(selection);

    return selection;
  }

  /**
   * Evaluate rule conditions against feature results
   */
  private evaluateConditions(
    conditions: any,
    featureResults: any,
    documentContext: any
  ): boolean {
    // Confidence check
    if (conditions.confidence) {
      const confidenceCheck = this.evaluateExpression(
        conditions.confidence,
        featureResults.confidence || 0
      );
      if (!confidenceCheck) return false;
    }

    // Document type check
    if (conditions.documentType) {
      const docType = featureResults.documentType;
      if (Array.isArray(conditions.documentType)) {
        if (!conditions.documentType.includes(docType)) return false;
      } else {
        if (conditions.documentType !== docType) return false;
      }
    }

    return true;
  }

  /**
   * Apply combination rules for complex scenarios
   */
  private applyCombinationRules(
    selection: DynamicNodeSelection,
    featureResults: any,
    documentContext: any
  ): DynamicNodeSelection {
    for (const [ruleName, rule] of Object.entries(this.rules.selectionRules.combinationRules)) {
      if (this.evaluateTrigger(rule.trigger, featureResults)) {
        // Apply rule actions
        if (rule.action.boost_priority) {
          rule.action.boost_priority.forEach(node => {
            selection.reasoning.priorityAdjustments[node] = 
              (selection.reasoning.priorityAdjustments[node] || 0) + 1;
          });
        }

        if (rule.action.add_nodes) {
          selection.selectedNodes.push(...rule.action.add_nodes);
        }

        selection.reasoning.appliedRules.push(`combo_${ruleName}`);
      }
    }

    return selection;
  }

  /**
   * Create optimized execution plan based on selected nodes
   */
  private createDynamicExecutionPlan(selection: DynamicNodeSelection): ExecutionPlan {
    const nodes = selection.selectedNodes.map(nodeId => ({
      nodeId,
      priority: selection.reasoning.priorityAdjustments[nodeId] || 3
    }));

    // Group by priority for execution stages
    const priorityGroups = this.groupByPriority(nodes);
    
    const stages = priorityGroups.map((group, index) => ({
      name: `stage_${index + 1}`,
      nodes: group.map(n => n.nodeId),
      execution: this.rules.executionStrategy.parallelization.priority_groups[group[0].priority] || "parallel",
      priority: group[0].priority
    }));

    return {
      stages,
      totalNodes: selection.selectedNodes.length,
      reasoning: selection.reasoning
    };
  }

  /**
   * Evaluate trigger expressions (AND/OR logic)
   */
  private evaluateTrigger(trigger: any, featureResults: any): boolean {
    if (trigger.AND) {
      return trigger.AND.every(feature => featureResults[feature]);
    }
    if (trigger.OR) {
      return trigger.OR.some(feature => featureResults[feature]);
    }
    
    // Simple feature check
    return Object.entries(trigger).every(([key, value]) => {
      if (key === 'documentType') {
        return featureResults.documentType === value;
      }
      return featureResults[key] === value;
    });
  }
}
```

## 🎯 Dynamic Workflow Examples

### Example 1: Emergency Document
```typescript
// Input
featureResults = {
  documentType: "emergency_record",
  hasECG: true,
  hasTriage: true,
  hasSignals: true,
  confidence: 0.9
}

// Dynamic Output
selectedNodes = [
  "medical-analysis",     // Always included
  "signal-processing",    // hasSignals detected
  "ecg-processing",       // hasECG detected (priority boosted)
  "triage-processing"     // hasTriage detected (priority boosted)
]

executionPlan = {
  stages: [
    { name: "core", nodes: ["medical-analysis", "signal-processing"], execution: "sequential" },
    { name: "emergency", nodes: ["ecg-processing", "triage-processing"], execution: "parallel" }
  ]
}
```

### Example 2: Pathology Report
```typescript
// Input
featureResults = {
  documentType: "pathology_report",
  hasMicroscopic: true,
  hasSpecimens: true,
  hasSignals: false,
  confidence: 0.85
}

// Dynamic Output  
selectedNodes = [
  "medical-analysis",
  "microscopic-processing",
  "specimens-processing"    // Added by combination rule
]

executionPlan = {
  stages: [
    { name: "core", nodes: ["medical-analysis"], execution: "sequential" },
    { name: "pathology", nodes: ["specimens-processing"], execution: "sequential" },
    { name: "analysis", nodes: ["microscopic-processing"], execution: "sequential" }
  ]
}
// Note: specimens-processing runs before microscopic-processing due to dependency
```

## 🚀 Benefits of Dynamic Approach

### 1. **True Adaptability**
- Workflow changes based on actual document content
- No processing of irrelevant sections
- Optimal resource usage

### 2. **Intelligent Prioritization**
- Emergency documents get boosted priority
- Complex combinations trigger specialized workflows
- Fallback strategies for edge cases

### 3. **Easy Configuration**
- Add new feature → Add JSON rule
- Modify priority → Change number
- New combinations → Add rule

### 4. **Debugging & Observability**
```typescript
// Every selection includes reasoning
reasoning: {
  triggeredFeatures: ["hasECG", "hasTriage"],
  appliedRules: ["feature_hasECG", "combo_emergency_combo"],
  priorityAdjustments: { "ecg-processing": 1, "triage-processing": 1 },
  excludedNodes: [{ node: "dental-processing", reason: "Feature not detected" }]
}
```

This dynamic approach ensures the workflow **adapts intelligently** to what's actually found in each document, rather than running a static set of nodes regardless of content.