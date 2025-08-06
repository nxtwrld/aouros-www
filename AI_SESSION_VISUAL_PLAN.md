# AI Session Visual Implementation Plan

## Overview

This document provides a comprehensive plan for implementing the visual components of the AI-powered medical session analysis system. The implementation focuses on creating responsive, mobile-friendly visualizations using D3.js for the Sankey diagram and Svelte components for the UI, all designed to work seamlessly during real-time doctor-patient consultations.

## Location

There will be a new path at `src/routes/med/p/[profile]/session-moe` where we will implment this new
medicl session analysis system.

New Svelte and d3 components will be created in `src/components/session/` folder


## Design Principles

### Mobile-First Responsive Design
- **Breakpoints**: Mobile (<640px), Tablet (640-1024px), Desktop (>1024px)
- **Touch-First Interactions**: All interactions designed for touch, enhanced for mouse
- **Adaptive Layouts**: Vertical stacking on mobile, side-by-side on desktop
- **Performance**: Optimized for lower-powered mobile devices
- **Offline Capability**: Progressive enhancement for intermittent connectivity

### Real-Time Considerations
- **Non-Blocking Updates**: UI never freezes during analysis
- **Progressive Rendering**: Show partial results immediately
- **Smooth Transitions**: Animated updates that don't distract
- **Optimistic UI**: Immediate visual feedback for all actions
- **Discoverability**: Major symptoms, diagnosis and treatments are visible. Others are collapsed and visibility is toggle on click/hover. Same applies for question nodes.

## Sample JSON Data Structures

> **Note**: This schema follows the unified MoE visualization format defined in `config/session-moe-output.json`. All relationships are embedded within nodes using the `relationships` property, eliminating the need for separate links.

### Initial Analysis (T1 - First 2 minutes of consultation)

```json
{
  "sessionId": "session_20240315_142300",
  "timestamp": "2024-03-15T14:25:00Z",
  "analysisVersion": 1,
  "nodes": {
    "symptoms": [
      {
        "id": "sym_1",
        "text": "Severe headache",
        "severity": 8,
        "duration": 3,
        "confidence": 0.95,
        "source": "transcript",
        "quote": "I've had this terrible headache for three days now",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "supports",
            "direction": "outgoing",
            "strength": 0.9,
            "reasoning": "Primary symptom consistent with migraine"
          },
          {
            "nodeId": "diag_2",
            "relationship": "supports", 
            "direction": "outgoing",
            "strength": 0.6,
            "reasoning": "Could indicate tension headache but less likely"
          },
          {
            "nodeId": "diag_3",
            "relationship": "supports",
            "direction": "outgoing", 
            "strength": 0.3,
            "reasoning": "Severe headache can be sign of meningitis"
          }
        ]
      },
      {
        "id": "sym_2",
        "text": "Sensitivity to light",
        "severity": 6,
        "confidence": 0.88,
        "source": "transcript",
        "quote": "Bright lights really bother me",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "confirms",
            "direction": "outgoing",
            "strength": 0.85,
            "reasoning": "Photophobia is classic migraine symptom"
          },
          {
            "nodeId": "diag_2",
            "relationship": "contradicts",
            "direction": "outgoing",
            "strength": 0.8,
            "reasoning": "Photophobia uncommon in tension headaches"
          }
        ]
      },
      {
        "id": "sym_3",
        "text": "Nausea",
        "severity": 5,
        "confidence": 0.92,
        "source": "transcript",
        "quote": "I feel sick to my stomach",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "supports",
            "direction": "outgoing",
            "strength": 0.7,
            "reasoning": "Nausea commonly accompanies migraines"
          }
        ]
      },
      {
        "id": "sym_4",
        "text": "History of migraines",
        "severity": 4,
        "confidence": 0.95,
        "source": "medical_history",
        "relevance": 0.85,
        "documentId": "doc_2023_11_15",
        "quote": "Patient has documented history of chronic migraines",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "confirms",
            "direction": "outgoing",
            "strength": 0.8,
            "reasoning": "Strong predictor for recurrent migraine episodes"
          }
        ]
      },
      {
        "id": "sym_5", 
        "text": "Possible neck stiffness",
        "severity": 7,
        "confidence": 0.3,
        "source": "suspected",
        "suggestedBy": "diag_3",
        "relationships": [
          {
            "nodeId": "diag_3",
            "relationship": "supports",
            "direction": "outgoing",
            "strength": 0.9,
            "reasoning": "Neck stiffness is key sign of meningeal irritation"
          }
        ]
      }
    ],
    "diagnoses": [
      {
        "id": "diag_1",
        "name": "Migraine",
        "probability": 0.78,
        "priority": 3,
        "icd10": "G43.909",
        "reasoning": "Classic presentation with photophobia and nausea plus history",
        "relationships": [
          {
            "nodeId": "sym_1",
            "relationship": "supports",
            "direction": "incoming", 
            "strength": 0.9,
            "reasoning": "Severe headache supports migraine diagnosis"
          },
          {
            "nodeId": "sym_2",
            "relationship": "confirms",
            "direction": "incoming",
            "strength": 0.85, 
            "reasoning": "Photophobia confirms migraine"
          },
          {
            "nodeId": "sym_3",
            "relationship": "supports",
            "direction": "incoming",
            "strength": 0.7,
            "reasoning": "Nausea supports migraine"
          },
          {
            "nodeId": "sym_4",
            "relationship": "confirms",
            "direction": "incoming",
            "strength": 0.8,
            "reasoning": "Previous history confirms pattern"
          }
        ]
      },
      {
        "id": "diag_2", 
        "name": "Tension headache",
        "probability": 0.45,
        "priority": 6,
        "icd10": "G44.209",
        "reasoning": "Duration matches but photophobia contradicts",
        "relationships": [
          {
            "nodeId": "sym_1",
            "relationship": "supports",
            "direction": "incoming",
            "strength": 0.6,
            "reasoning": "Headache could be tension-type"
          },
          {
            "nodeId": "sym_2", 
            "relationship": "contradicts",
            "direction": "incoming",
            "strength": 0.8,
            "reasoning": "Photophobia uncommon in tension headaches"
          }
        ]
      },
      {
        "id": "diag_3",
        "name": "Meningitis",
        "probability": 0.15,
        "priority": 1,
        "icd10": "G03.9", 
        "reasoning": "Low probability but critical to rule out",
        "relationships": [
          {
            "nodeId": "sym_1",
            "relationship": "supports",
            "direction": "incoming",
            "strength": 0.3,
            "reasoning": "Severe headache can indicate meningitis"
          }
        ]
      }
    ],
    "treatments": [
      {
        "id": "treat_1",
        "type": "medication",
        "name": "Sumatriptan",
        "dosage": "50mg oral", 
        "priority": 3,
        "confidence": 0.82,
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "treats",
            "direction": "incoming",
            "strength": 0.85,
            "reasoning": "Sumatriptan is first-line migraine treatment"
          }
        ]
      },
      {
        "id": "treat_2",
        "type": "investigation",
        "name": "Neurological examination", 
        "urgency": "immediate",
        "priority": 1,
        "relationships": [
          {
            "nodeId": "diag_3",
            "relationship": "investigates",
            "direction": "outgoing",
            "strength": 0.95,
            "reasoning": "Essential to rule out meningeal signs"
          }
        ]
      }
    ],
    "actions": [
      {
        "id": "q_1",
        "text": "Do you have a fever?",
        "category": "diagnostic_clarification",
        "actionType": "question",
        "priority": 1,
        "status": "pending",
        "relationships": [
          {
            "nodeId": "diag_3",
            "relationship": "excludes",
            "direction": "outgoing", 
            "strength": 0.95,
            "reasoning": "Fever presence critical for meningitis assessment"
          }
        ],
        "impact": {
          "yes": {"diag_3": 0.65, "diag_1": -0.1},
          "no": {"diag_3": -0.12, "diag_1": 0.05}
        }
      },
      {
        "id": "q_2", 
        "text": "Is the pain on one side of your head?",
        "category": "symptom_exploration",
        "actionType": "question",
        "priority": 3,
        "status": "pending",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "clarifies",
            "direction": "outgoing",
            "strength": 0.8,
            "reasoning": "Unilateral pain supports migraine diagnosis"
          }
        ],
        "impact": {
          "yes": {"diag_1": 0.15, "diag_2": -0.2},
          "no": {"diag_2": 0.1, "diag_1": -0.05}
        }
      },
      {
        "id": "safety_1",
        "text": "Monitor for meningeal signs",
        "category": "red_flag",
        "actionType": "alert",
        "priority": 1,
        "status": "pending",
        "relationships": [
          {
            "nodeId": "diag_3",
            "relationship": "monitors",
            "direction": "outgoing",
            "strength": 0.9,
            "reasoning": "Critical safety monitoring for meningitis"
          }
        ],
        "recommendation": "Immediate neurological assessment if fever develops"
      }
    ]
  }
}
```

### Updated Analysis (T2 - After 5 minutes, with answered questions)

This example shows the same case after questions have been answered and new symptoms have been discovered, following our unified schema with embedded relationships.

```json
{
  "sessionId": "session_20240315_142300",
  "timestamp": "2024-03-15T14:28:00Z",
  "analysisVersion": 2,
  "nodes": {
    "symptoms": [
      {
        "id": "sym_1",
        "text": "Severe headache", 
        "severity": 8,
        "duration": 3,
        "confidence": 0.95,
        "source": "transcript",
        "quote": "I've had this terrible headache for three days now",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "supports",
            "direction": "outgoing",
            "strength": 0.9,
            "reasoning": "Primary symptom consistent with migraine"
          },
          {
            "nodeId": "diag_2",
            "relationship": "supports",
            "direction": "outgoing", 
            "strength": 0.4,
            "reasoning": "Headache could indicate tension type but other symptoms contradict"
          },
          {
            "nodeId": "diag_4",
            "relationship": "supports",
            "direction": "outgoing",
            "strength": 0.6,
            "reasoning": "Consistent with medication overuse headache"
          }
        ]
      },
      {
        "id": "sym_2",
        "text": "Sensitivity to light",
        "severity": 6, 
        "confidence": 0.88,
        "source": "transcript",
        "quote": "Bright lights really bother me",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "confirms",
            "direction": "outgoing",
            "strength": 0.85,
            "reasoning": "Photophobia is classic migraine symptom"
          },
          {
            "nodeId": "diag_2",
            "relationship": "contradicts",
            "direction": "outgoing",
            "strength": 0.8,
            "reasoning": "Photophobia uncommon in tension headaches"
          }
        ]
      },
      {
        "id": "sym_3",
        "text": "Nausea",
        "severity": 5,
        "confidence": 0.92,
        "source": "transcript", 
        "quote": "I feel sick to my stomach",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "supports",
            "direction": "outgoing",
            "strength": 0.7,
            "reasoning": "Nausea commonly accompanies migraines"
          }
        ]
      },
      {
        "id": "sym_4", 
        "text": "History of migraines",
        "severity": 4,
        "confidence": 0.95,
        "source": "medical_history",
        "relevance": 0.85,
        "documentId": "doc_2023_11_15",
        "quote": "Patient has documented history of chronic migraines",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "confirms",
            "direction": "outgoing",
            "strength": 0.8,
            "reasoning": "Strong predictor for recurrent migraine episodes"
          }
        ]
      },
      {
        "id": "sym_5",
        "text": "Previous sumatriptan use",
        "severity": 3,
        "confidence": 0.92, 
        "source": "medication_history",
        "documentId": "rx_2023_11_20",
        "relevance": 0.92,
        "quote": "Previously prescribed sumatriptan 50mg",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "supports",
            "direction": "outgoing",
            "strength": 0.75,
            "reasoning": "Previous migraine treatment supports diagnosis"
          },
          {
            "nodeId": "diag_4",
            "relationship": "suggests",
            "direction": "outgoing",
            "strength": 0.6,
            "reasoning": "Previous medication use raises overuse concern"
          }
        ]
      },
      {
        "id": "sym_6",
        "text": "Unilateral right-sided pain",
        "severity": 8,
        "confidence": 0.94,
        "source": "transcript",
        "fromQuestion": "q_2",
        "quote": "Yes, it's mostly on the right side of my head",
        "relationships": [
          {
            "nodeId": "diag_1", 
            "relationship": "confirms",
            "direction": "outgoing",
            "strength": 0.95,
            "reasoning": "Unilateral pain strongly supports migraine diagnosis"
          },
          {
            "nodeId": "diag_2",
            "relationship": "contradicts",
            "direction": "outgoing",
            "strength": 0.7,
            "reasoning": "Unilateral pattern less common in tension headaches"
          }
        ]
      },
      {
        "id": "sym_7",
        "text": "No fever",
        "severity": 1,
        "confidence": 0.98,
        "source": "transcript",
        "fromQuestion": "q_1", 
        "quote": "No, I don't have a fever",
        "relationships": [
          {
            "nodeId": "diag_3",
            "relationship": "rules_out",
            "direction": "outgoing",
            "strength": 0.9,
            "reasoning": "Absence of fever strongly against meningitis"
          }
        ]
      },
      {
        "id": "sym_8",
        "text": "Throbbing quality",
        "severity": 7,
        "confidence": 0.89,
        "source": "transcript",
        "quote": "It feels like pounding or throbbing",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "supports",
            "direction": "outgoing", 
            "strength": 0.88,
            "reasoning": "Throbbing quality characteristic of migraine"
          }
        ]
      }
    ],
    "diagnoses": [
      {
        "id": "diag_1",
        "name": "Migraine", 
        "probability": 0.92,
        "priority": 3,
        "icd10": "G43.909",
        "reasoning": "Classic migraine with unilateral throbbing pain, photophobia, nausea, and positive history",
        "confidence": 0.91,
        "relationships": [
          {
            "nodeId": "treat_1",
            "relationship": "treats",
            "direction": "outgoing",
            "strength": 0.92,
            "reasoning": "Sumatriptan is first-line migraine treatment"
          },
          {
            "nodeId": "treat_3",
            "relationship": "manages",
            "direction": "outgoing",
            "strength": 0.8,
            "reasoning": "Migraine diary helps identify triggers"
          },
          {
            "nodeId": "treat_4", 
            "relationship": "prevents",
            "direction": "outgoing",
            "strength": 0.7,
            "reasoning": "Prophylaxis appropriate for frequent migraines"
          },
          {
            "nodeId": "treat_5",
            "relationship": "relieves",
            "direction": "outgoing",
            "strength": 0.95,
            "reasoning": "Dark quiet environment provides immediate relief"
          }
        ]
      },
      {
        "id": "diag_2",
        "name": "Tension headache",
        "probability": 0.22,
        "priority": 8,
        "icd10": "G44.209", 
        "reasoning": "Unilateral throbbing nature and photophobia inconsistent with tension pattern",
        "confidence": 0.78,
        "relationships": []
      },
      {
        "id": "diag_3",
        "name": "Meningitis",
        "probability": 0.02,
        "priority": 1,
        "icd10": "G03.9",
        "reasoning": "Effectively ruled out by absence of fever and normal presentation",
        "suppressed": true,
        "suppressionReason": "No fever or meningeal signs",
        "relationships": []
      },
      {
        "id": "diag_4",
        "name": "Medication overuse headache",
        "probability": 0.35,
        "priority": 5,
        "icd10": "G44.41",
        "reasoning": "Consider given history of migraine treatment",
        "requiresInvestigation": true,
        "relationships": [
          {
            "nodeId": "treat_3",
            "relationship": "investigates", 
            "direction": "outgoing",
            "strength": 0.85,
            "reasoning": "Medication diary helps assess overuse"
          }
        ]
      }
    ],
    "treatments": [
      {
        "id": "treat_1",
        "type": "medication",
        "name": "Sumatriptan",
        "dosage": "50mg oral",
        "priority": 3,
        "confidence": 0.92,
        "historicalEffectiveness": 0.85,
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "treats",
            "direction": "incoming",
            "strength": 0.92,
            "reasoning": "Sumatriptan is first-line migraine treatment"
          },
          {
            "nodeId": "sym_5",
            "relationship": "suggests",
            "direction": "incoming",
            "strength": 0.8,
            "reasoning": "Previous prescription indicates effectiveness"
          }
        ]
      },
      {
        "id": "treat_3",
        "type": "lifestyle",
        "name": "Migraine diary and trigger identification",
        "priority": 5,
        "duration": "ongoing",
        "confidence": 0.88,
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "manages",
            "direction": "incoming",
            "strength": 0.8,
            "reasoning": "Diary helps manage migraine triggers"
          },
          {
            "nodeId": "diag_4",
            "relationship": "investigates",
            "direction": "incoming", 
            "strength": 0.85,
            "reasoning": "Tracks medication usage patterns"
          }
        ]
      },
      {
        "id": "treat_4",
        "type": "medication",
        "name": "Prophylactic therapy evaluation",
        "description": "Consider beta-blockers or anticonvulsants if frequency >4/month",
        "priority": 6,
        "requiresFollowUp": true,
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "prevents",
            "direction": "incoming",
            "strength": 0.7,
            "reasoning": "Prophylaxis prevents frequent migraines"
          }
        ]
      },
      {
        "id": "treat_5",
        "type": "immediate",
        "name": "Dark, quiet room rest",
        "priority": 2,
        "confidence": 0.95,
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "relieves",
            "direction": "incoming",
            "strength": 0.95,
            "reasoning": "Environmental modification provides immediate relief"
          }
        ]
      }
    ],
    "actions": [
      {
        "id": "q_1",
        "text": "Do you have a fever?",
        "category": "diagnostic_clarification",
        "actionType": "question",
        "priority": 1,
        "status": "answered",
        "answer": "no",
        "relationships": [
          {
            "nodeId": "diag_3",
            "relationship": "excludes",
            "direction": "outgoing",
            "strength": 0.95,
            "reasoning": "Fever absence critical for ruling out meningitis"
          }
        ]
      },
      {
        "id": "q_2",
        "text": "Is the pain on one side of your head?",
        "category": "symptom_exploration", 
        "actionType": "question",
        "priority": 3,
        "status": "answered",
        "answer": "yes, right side",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "clarifies",
            "direction": "outgoing",
            "strength": 0.8,
            "reasoning": "Unilateral location supports migraine diagnosis"
          }
        ]
      },
      {
        "id": "q_3", 
        "text": "How often do you take pain medication?",
        "category": "treatment_selection",
        "actionType": "question",
        "priority": 4,
        "status": "pending",
        "relationships": [
          {
            "nodeId": "diag_4",
            "relationship": "investigates",
            "direction": "outgoing",
            "strength": 0.9,
            "reasoning": "Medication frequency critical for overuse assessment"
          }
        ],
        "impact": {
          "daily": {"diag_4": 0.4, "diag_1": -0.05},
          "weekly": {"diag_4": 0.1},
          "rarely": {"diag_4": -0.3}
        }
      },
      {
        "id": "q_4",
        "text": "Do you experience visual auras before the headache?",
        "category": "diagnostic_clarification",
        "actionType": "question", 
        "priority": 6,
        "status": "pending",
        "subtype": "migraine_with_aura",
        "relationships": [
          {
            "nodeId": "diag_1",
            "relationship": "clarifies",
            "direction": "outgoing",
            "strength": 0.7,
            "reasoning": "Aura presence would specify migraine subtype"
          }
        ]
      },
      {
        "id": "safety_1",
        "text": "Monitor sumatriptan frequency",
        "category": "drug_interaction",
        "actionType": "alert",
        "priority": 7,
        "status": "pending",
        "relationships": [
          {
            "nodeId": "treat_1",
            "relationship": "monitors",
            "direction": "outgoing",
            "strength": 0.8,
            "reasoning": "Prevent medication overuse"
          },
          {
            "nodeId": "diag_4",
            "relationship": "prevents",
            "direction": "outgoing",
            "strength": 0.9,
            "reasoning": "Early warning prevents medication overuse headache"
          }
        ],
        "recommendation": "Track usage to avoid overuse pattern"
      }
    ]
  },
  "userActions": [
    {
      "timestamp": "04:45",
      "action": "suppress",
      "targetId": "diag_3", 
      "reason": "No clinical indicators",
      "confidence": 0.95
    },
    {
      "timestamp": "04:50", 
      "action": "accept",
      "targetId": "diag_1",
      "confidence": 0.95
    }
  ]
}
```

## Component Architecture

### Directory Structure
```
src/components/session/
├── SessionVisualizer.svelte          # Main container component
├── SankeyDiagram.svelte             # D3.js Sankey wrapper
├── TreeDiagram.svelte               # Alternative tree view
├── NodeDetails.svelte               # Node detail panel
├── QuestionManager.svelte           # Question handling
├── MobileNav.svelte                 # Mobile navigation
├── Legend.svelte                    # Visual legend
├── stores/
│   ├── sessionStore.ts              # Session state management
│   ├── visualizationStore.ts        # Visualization preferences
│   └── interactionStore.ts          # User interactions
├── utils/
│   ├── sankeyHelpers.ts             # D3 Sankey utilities
│   ├── treeHelpers.ts               # Tree view utilities
│   ├── dataTransformers.ts          # Data transformation
│   └── responsiveHelpers.ts         # Responsive utilities
└── types/
    └── visualization.d.ts            # TypeScript definitions
```

### Component Specifications

#### 1. SessionVisualizer.svelte (Main Container)
```svelte
<!-- Responsive container with mobile-first design -->
<script lang="ts">
  import { onMount } from 'svelte';
  import SankeyDiagram from './SankeyDiagram.svelte';
  import TreeDiagram from './TreeDiagram.svelte';
  import QuestionManager from './QuestionManager.svelte';
  import NodeDetails from './NodeDetails.svelte';
  import MobileNav from './MobileNav.svelte';
  import { sessionStore, visualizationStore } from './stores';
  
  export let sessionData: SessionAnalysis;
  export let isRealTime: boolean = true;
  
  let viewMode: 'sankey' | 'tree' = 'sankey';
  let selectedNode: string | null = null;
  let isMobile = false;
  let showSidebar = true;
  
  // Responsive breakpoints
  const MOBILE_BREAKPOINT = 640;
  const TABLET_BREAKPOINT = 1024;
  
  onMount(() => {
    checkViewport();
    window.addEventListener('resize', checkViewport);
  });
  
  function checkViewport() {
    isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    showSidebar = window.innerWidth >= TABLET_BREAKPOINT;
  }
</script>

<div class="session-visualizer" class:mobile={isMobile}>
  {#if isMobile}
    <MobileNav {viewMode} on:viewChange />
  {/if}
  
  <div class="visualization-container" class:sidebar-open={showSidebar}>
    {#if viewMode === 'sankey'}
      <SankeyDiagram 
        data={sessionData} 
        {isMobile}
        on:nodeSelect={(e) => selectedNode = e.detail}
      />
    {:else}
      <TreeDiagram 
        data={sessionData}
        {isMobile}
        on:nodeSelect={(e) => selectedNode = e.detail}
      />
    {/if}
  </div>
  
  <aside class="sidebar" class:open={showSidebar}>
    <QuestionManager questions={sessionData.nodes.questions} />
    {#if selectedNode}
      <NodeDetails nodeId={selectedNode} />
    {/if}
  </aside>
</div>

<style>
  .session-visualizer {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  
  .visualization-container {
    flex: 1;
    transition: margin-right 0.3s ease;
  }
  
  .sidebar {
    width: 320px;
    background: var(--color-surface);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  /* Mobile styles */
  .mobile .visualization-container {
    margin-bottom: 60px; /* Space for mobile nav */
  }
  
  .mobile .sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 50vh;
    z-index: 100;
  }
  
  @media (min-width: 640px) {
    .sidebar {
      width: 380px;
    }
  }
  
  @media (min-width: 1024px) {
    .visualization-container.sidebar-open {
      margin-right: 380px;
    }
    
    .sidebar {
      position: fixed;
      right: 0;
      top: 0;
      height: 100vh;
    }
  }
</style>
```

#### 2. SankeyDiagram.svelte (D3.js Integration)
```svelte
<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import * as d3 from 'd3';
  import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
  import { createEventDispatcher } from 'svelte';
  import { generateSankeyLayout, updateSankeyPositions } from './utils/sankeyHelpers';
  
  export let data: SessionAnalysis;
  export let isMobile: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  let container: HTMLElement;
  let svg: d3.Selection<SVGGElement, unknown, null, undefined>;
  let width: number;
  let height: number;
  
  // Mobile-optimized dimensions
  const MOBILE_NODE_HEIGHT = 40;
  const DESKTOP_NODE_HEIGHT = 60;
  const MOBILE_NODE_WIDTH = 100;
  const DESKTOP_NODE_WIDTH = 150;
  
  onMount(() => {
    initializeSankey();
    window.addEventListener('resize', handleResize);
  });
  
  function initializeSankey() {
    const bounds = container.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    
    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g');
    
    // Enable pan and zoom for mobile
    if (isMobile) {
      const zoom = d3.zoom()
        .scaleExtent([0.5, 2])
        .on('zoom', (event) => {
          svg.attr('transform', event.transform);
        });
      
      d3.select(container).select('svg').call(zoom);
    }
    
    renderSankey();
  }
  
  function renderSankey() {
    const nodeHeight = isMobile ? MOBILE_NODE_HEIGHT : DESKTOP_NODE_HEIGHT;
    const nodeWidth = isMobile ? MOBILE_NODE_WIDTH : DESKTOP_NODE_WIDTH;
    
    // Transform data for D3 sankey
    const sankeyData = generateSankeyLayout(data, width, height, isMobile);
    
    // Create sankey generator
    const sankeyGenerator = sankey()
      .nodeWidth(nodeWidth)
      .nodePadding(10)
      .extent([[0, 0], [width, height]]);
    
    const { nodes, links } = sankeyGenerator(sankeyData);
    
    // Render links with mobile-optimized stroke width
    const linkSelection = svg.selectAll('.link')
      .data(links, d => `${d.source.id}-${d.target.id}`);
    
    linkSelection.enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', sankeyLinkHorizontal())
      .style('stroke-width', d => Math.max(1, d.width * (isMobile ? 0.5 : 1)))
      .style('stroke', d => getLinkColor(d.type))
      .style('stroke-opacity', 0.4)
      .on('click', handleLinkClick)
      .on('touchstart', handleLinkClick);
    
    // Render nodes with touch-friendly sizes
    const nodeSelection = svg.selectAll('.node')
      .data(nodes, d => d.id);
    
    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);
    
    nodeEnter.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .style('fill', d => getNodeColor(d.data))
      .style('stroke', '#333')
      .style('cursor', 'pointer')
      .on('click', handleNodeClick)
      .on('touchstart', handleNodeClick);
    
    // Add text labels (abbreviated on mobile)
    nodeEnter.append('text')
      .attr('x', (d.x1 - d.x0) / 2)
      .attr('y', (d.y1 - d.y0) / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', isMobile ? '12px' : '14px')
      .text(d => isMobile ? abbreviateText(d.data.name) : d.data.name);
    
    // Update transitions
    nodeSelection.transition()
      .duration(500)
      .attr('transform', d => `translate(${d.x0},${d.y0})`);
    
    linkSelection.transition()
      .duration(500)
      .attr('d', sankeyLinkHorizontal());
  }
  
  function handleNodeClick(event: Event, node: any) {
    event.preventDefault();
    dispatch('nodeSelect', node.data.id);
  }
  
  function abbreviateText(text: string): string {
    return text.length > 10 ? text.substring(0, 8) + '...' : text;
  }
</script>

<div class="sankey-container" bind:this={container}>
</div>

<style>
  .sankey-container {
    width: 100%;
    height: 100%;
    position: relative;
  }
  
  :global(.link) {
    fill: none;
    cursor: pointer;
  }
  
  :global(.node rect) {
    rx: 4;
    transition: opacity 0.3s;
  }
  
  :global(.node:hover rect) {
    opacity: 0.8;
  }
  
  /* Touch-friendly hit areas */
  @media (pointer: coarse) {
    :global(.node) {
      padding: 10px;
    }
  }
</style>
```

#### 3. QuestionManager.svelte (Collapsible Questions)
```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  
  export let questions: Question[];
  
  const dispatch = createEventDispatcher();
  
  let expandedQuestions = new Set<string>();
  let filter: 'all' | 'pending' | 'answered' = 'pending';
  
  $: filteredQuestions = questions.filter(q => {
    if (filter === 'all') return true;
    if (filter === 'pending') return q.status === 'pending';
    if (filter === 'answered') return q.status === 'answered';
  });
  
  $: groupedQuestions = groupQuestionsByPriority(filteredQuestions);
  
  function groupQuestionsByPriority(questions: Question[]) {
    return {
      critical: questions.filter(q => q.priority === 'critical'),
      high: questions.filter(q => q.priority === 'high'),
      medium: questions.filter(q => q.priority === 'medium'),
      low: questions.filter(q => q.priority === 'low')
    };
  }
  
  function toggleQuestion(id: string) {
    if (expandedQuestions.has(id)) {
      expandedQuestions.delete(id);
    } else {
      expandedQuestions.add(id);
    }
    expandedQuestions = expandedQuestions;
  }
</script>

<div class="question-manager">
  <header>
    <h3>Questions ({questions.length})</h3>
    <div class="filters">
      <button 
        class:active={filter === 'all'}
        on:click={() => filter = 'all'}
      >All</button>
      <button 
        class:active={filter === 'pending'}
        on:click={() => filter = 'pending'}
      >Pending</button>
      <button 
        class:active={filter === 'answered'}
        on:click={() => filter = 'answered'}
      >Answered</button>
    </div>
  </header>
  
  <div class="question-groups">
    {#each Object.entries(groupedQuestions) as [priority, questions]}
      {#if questions.length > 0}
        <div class="priority-group" class:critical={priority === 'critical'}>
          <h4>{priority} Priority ({questions.length})</h4>
          {#each questions as question}
            <div class="question-card" class:expanded={expandedQuestions.has(question.id)}>
              <button 
                class="question-header"
                on:click={() => toggleQuestion(question.id)}
              >
                <span class="question-text">{question.text}</span>
                <span class="question-status" class:answered={question.status === 'answered'}>
                  {question.status}
                </span>
              </button>
              
              {#if expandedQuestions.has(question.id)}
                <div class="question-details" transition:slide>
                  <p class="question-type">Type: {question.type}</p>
                  {#if question.targetDiagnosis}
                    <p>Target: {question.targetDiagnosis}</p>
                  {/if}
                  {#if question.status === 'pending'}
                    <div class="quick-answers">
                      <button on:click={() => dispatch('answer', {id: question.id, answer: 'yes'})}>
                        Yes
                      </button>
                      <button on:click={() => dispatch('answer', {id: question.id, answer: 'no'})}>
                        No
                      </button>
                      <button on:click={() => dispatch('answer', {id: question.id, answer: 'unknown'})}>
                        Unknown
                      </button>
                    </div>
                  {:else}
                    <p class="answer">Answer: {question.answer}</p>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .question-manager {
    padding: 1rem;
    height: 100%;
    overflow-y: auto;
  }
  
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .filters {
    display: flex;
    gap: 0.5rem;
  }
  
  .filters button {
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--color-border);
    background: transparent;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .filters button.active {
    background: var(--color-primary);
    color: white;
  }
  
  .priority-group {
    margin-bottom: 1.5rem;
  }
  
  .priority-group.critical {
    border-left: 4px solid var(--color-error);
    padding-left: 0.5rem;
  }
  
  .question-card {
    background: var(--color-surface-2);
    border-radius: 8px;
    margin-bottom: 0.5rem;
    overflow: hidden;
  }
  
  .question-header {
    width: 100%;
    padding: 1rem;
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .question-status {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--color-warning-bg);
    color: var(--color-warning);
    border-radius: 4px;
  }
  
  .question-status.answered {
    background: var(--color-success-bg);
    color: var(--color-success);
  }
  
  .question-details {
    padding: 0 1rem 1rem;
    background: var(--color-surface);
  }
  
  .quick-answers {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .quick-answers button {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    background: white;
    border-radius: 4px;
    cursor: pointer;
  }
  
  /* Mobile optimizations */
  @media (max-width: 640px) {
    .question-manager {
      padding: 0.75rem;
    }
    
    .question-header {
      padding: 0.75rem;
    }
    
    .question-text {
      font-size: 0.875rem;
    }
  }
</style>
```

## Implementation Strategy

### Phase 1: Core Components (Week 1)
1. Set up component structure and TypeScript types
2. Implement SessionVisualizer container with responsive layout
3. Create basic SankeyDiagram with D3.js integration
4. Implement data transformation utilities

### Phase 2: Interactivity (Week 2)
1. Add node/link selection and highlighting
2. Implement QuestionManager with collapsible UI
3. Create NodeDetails panel
4. Add touch gestures for mobile

### Phase 3: Real-time Updates (Week 3)
1. Implement smooth transitions for data updates
2. Add diff-based rendering for performance
3. Create update queue for rapid changes
4. Test with SSE integration

### Phase 4: Advanced Features (Week 4)
1. Implement TreeDiagram alternative view
2. Add accept/suppress functionality
3. Create visual filtering and search
4. Implement accessibility features

## Mobile-Specific Considerations

### Touch Interactions
- **Tap**: Select node/link
- **Double-tap**: Expand node details
- **Pinch**: Zoom in/out
- **Swipe**: Pan diagram
- **Long-press**: Show context menu

### Performance Optimizations
- **Virtualization**: Render only visible nodes
- **Debounced updates**: Batch rapid changes
- **Progressive rendering**: Show critical paths first
- **Simplified graphics**: Reduce visual complexity on mobile

### Responsive Behaviors
- **Portrait mode**: Vertical layout with bottom sheet
- **Landscape mode**: Side-by-side with collapsible sidebar
- **Tablet**: Full desktop experience with touch enhancements
- **Fold detection**: Adapt to foldable devices

## Accessibility Features

1. **Keyboard Navigation**
   - Tab through nodes
   - Arrow keys for navigation
   - Space/Enter for selection
   - Escape to close panels

2. **Screen Reader Support**
   - ARIA labels for all interactive elements
   - Live regions for updates
   - Descriptive link relationships
   - Summary statistics announced

3. **Visual Accessibility**
   - High contrast mode
   - Colorblind-friendly palettes
   - Focus indicators
   - Reduced motion option

## Testing Strategy

### Unit Tests
- Data transformation functions
- Layout calculations
- State management
- Event handlers

### Integration Tests
- Real-time update handling
- Mobile/desktop switching
- Gesture recognition
- Performance benchmarks

### E2E Tests
- Complete user workflows
- Mobile device simulation
- Network condition testing
- Accessibility compliance

## Performance Metrics

### Target Performance
- **Initial render**: < 100ms
- **Update render**: < 50ms
- **Interaction response**: < 16ms
- **Memory usage**: < 50MB

### Optimization Techniques
- Request Animation Frame for smooth updates
- Web Workers for heavy calculations
- Canvas fallback for 500+ nodes
- Lazy loading for off-screen content

## Conclusion

This implementation plan provides a comprehensive approach to building a responsive, mobile-friendly visualization system for real-time medical session analysis. The architecture prioritizes performance, usability, and accessibility while maintaining the sophisticated analytical capabilities required for medical consultations.