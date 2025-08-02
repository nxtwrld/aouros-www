# AI Session Visual Implementation Plan

## Overview

This document provides a comprehensive plan for implementing the visual components of the AI-powered medical session analysis system. The implementation focuses on creating responsive, mobile-friendly visualizations using D3.js for the Sankey diagram and Svelte components for the UI, all designed to work seamlessly during real-time doctor-patient consultations.

## Location

There will be a new path at `src/routes/med/p/[profile]/session-moe` where we will implment this new
medicl session analysis system.


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

## Sample JSON Data Structures

### Initial Analysis (T1 - First 2 minutes of consultation)

```json
{
  "sessionId": "session_20240315_142300",
  "timestamp": "2024-03-15T14:25:00Z",
  "analysisVersion": 1,
  "metadata": {
    "duration": 120,
    "expertsCompleted": ["gp_expert", "diagnostic_expert", "inquiry_expert"],
    "totalConfidence": 0.72,
    "contextSources": 3
  },
  "nodes": {
    "symptoms": [
      {
        "id": "sym_1",
        "text": "Severe headache",
        "severity": "high",
        "duration": "3 days",
        "confidence": 0.95,
        "source": "transcript",
        "timestamp": "00:45"
      },
      {
        "id": "sym_2",
        "text": "Sensitivity to light",
        "severity": "moderate",
        "confidence": 0.88,
        "source": "transcript",
        "timestamp": "01:15"
      },
      {
        "id": "sym_3",
        "text": "Nausea",
        "severity": "moderate",
        "confidence": 0.92,
        "source": "transcript",
        "timestamp": "01:30"
      }
    ],
    "contextInputs": [
      {
        "id": "ctx_1",
        "text": "History of migraines",
        "relevance": 0.85,
        "source": "medical_history",
        "documentId": "doc_2023_11_15"
      }
    ],
    "diagnoses": [
      {
        "id": "diag_1",
        "name": "Migraine",
        "probability": 0.78,
        "priority": "high",
        "icd10": "G43.909",
        "reasoning": "Classic presentation with photophobia and nausea",
        "supportingSymptoms": ["sym_1", "sym_2", "sym_3"],
        "contextSupport": ["ctx_1"]
      },
      {
        "id": "diag_2",
        "name": "Tension headache",
        "probability": 0.45,
        "priority": "medium",
        "icd10": "G44.209",
        "reasoning": "Duration and severity match, but photophobia less common",
        "supportingSymptoms": ["sym_1"],
        "contradictingSymptoms": ["sym_2"]
      },
      {
        "id": "diag_3",
        "name": "Meningitis",
        "probability": 0.15,
        "priority": "critical",
        "icd10": "G03.9",
        "reasoning": "Low probability but high severity condition to rule out",
        "supportingSymptoms": ["sym_1", "sym_2", "sym_3"],
        "redFlags": ["Requires immediate evaluation if fever present"]
      }
    ],
    "questions": [
      {
        "id": "q_1",
        "text": "Do you have a fever?",
        "type": "exclusionary",
        "priority": "critical",
        "targetDiagnosis": "diag_3",
        "impact": {
          "yes": {"diag_3": 0.65, "diag_1": -0.1},
          "no": {"diag_3": -0.12, "diag_1": 0.05}
        },
        "status": "pending"
      },
      {
        "id": "q_2",
        "text": "Is the pain on one side of your head?",
        "type": "confirmatory",
        "priority": "high",
        "targetDiagnosis": "diag_1",
        "impact": {
          "yes": {"diag_1": 0.15, "diag_2": -0.2},
          "no": {"diag_2": 0.1, "diag_1": -0.05}
        },
        "status": "pending"
      }
    ],
    "treatments": [
      {
        "id": "treat_1",
        "type": "medication",
        "name": "Sumatriptan",
        "dosage": "50mg oral",
        "priority": "high",
        "forDiagnosis": ["diag_1"],
        "contraindications": [],
        "confidence": 0.82
      },
      {
        "id": "treat_2",
        "type": "investigation",
        "name": "Neurological examination",
        "urgency": "immediate",
        "forDiagnosis": ["diag_3"],
        "reasoning": "Rule out meningeal signs"
      }
    ]
  },
  "links": [
    {
      "source": "sym_1",
      "target": "diag_1",
      "strength": 0.9,
      "type": "supports"
    },
    {
      "source": "sym_2",
      "target": "diag_1",
      "strength": 0.85,
      "type": "supports"
    },
    {
      "source": "sym_3",
      "target": "diag_1",
      "strength": 0.7,
      "type": "supports"
    },
    {
      "source": "ctx_1",
      "target": "diag_1",
      "strength": 0.8,
      "type": "confirms"
    },
    {
      "source": "sym_1",
      "target": "diag_2",
      "strength": 0.6,
      "type": "supports"
    },
    {
      "source": "sym_2",
      "target": "diag_2",
      "strength": 0.2,
      "type": "contradicts"
    },
    {
      "source": "diag_1",
      "target": "treat_1",
      "strength": 0.85,
      "type": "treats"
    },
    {
      "source": "diag_3",
      "target": "treat_2",
      "strength": 0.95,
      "type": "requires"
    },
    {
      "source": "diag_1",
      "target": "q_2",
      "strength": 0.8,
      "type": "clarifies"
    },
    {
      "source": "diag_3",
      "target": "q_1",
      "strength": 0.95,
      "type": "excludes"
    }
  ]
}
```

### Updated Analysis (T2 - After 5 minutes, with answered questions)

```json
{
  "sessionId": "session_20240315_142300",
  "timestamp": "2024-03-15T14:28:00Z",
  "analysisVersion": 2,
  "metadata": {
    "duration": 300,
    "expertsCompleted": ["gp_expert", "diagnostic_expert", "treatment_expert", "inquiry_expert", "safety_monitor"],
    "totalConfidence": 0.86,
    "contextSources": 5,
    "questionsAnswered": 2,
    "newFindings": 3
  },
  "nodes": {
    "symptoms": [
      {
        "id": "sym_1",
        "text": "Severe headache",
        "severity": "high",
        "duration": "3 days",
        "confidence": 0.95,
        "source": "transcript",
        "timestamp": "00:45"
      },
      {
        "id": "sym_2",
        "text": "Sensitivity to light",
        "severity": "moderate",
        "confidence": 0.88,
        "source": "transcript",
        "timestamp": "01:15"
      },
      {
        "id": "sym_3",
        "text": "Nausea",
        "severity": "moderate",
        "confidence": 0.92,
        "source": "transcript",
        "timestamp": "01:30"
      },
      {
        "id": "sym_4",
        "text": "Unilateral pain (right side)",
        "severity": "high",
        "confidence": 0.94,
        "source": "transcript",
        "timestamp": "03:45",
        "fromQuestion": "q_2"
      },
      {
        "id": "sym_5",
        "text": "No fever",
        "confidence": 0.98,
        "source": "transcript",
        "timestamp": "03:20",
        "fromQuestion": "q_1"
      },
      {
        "id": "sym_6",
        "text": "Throbbing quality",
        "severity": "moderate",
        "confidence": 0.89,
        "source": "transcript",
        "timestamp": "04:30"
      }
    ],
    "contextInputs": [
      {
        "id": "ctx_1",
        "text": "History of migraines",
        "relevance": 0.85,
        "source": "medical_history",
        "documentId": "doc_2023_11_15"
      },
      {
        "id": "ctx_2",
        "text": "Previous sumatriptan prescription",
        "relevance": 0.92,
        "source": "medication_history",
        "documentId": "rx_2023_11_20"
      },
      {
        "id": "ctx_3",
        "text": "Mother has chronic migraines",
        "relevance": 0.75,
        "source": "family_history",
        "confidence": 0.88
      }
    ],
    "diagnoses": [
      {
        "id": "diag_1",
        "name": "Migraine",
        "probability": 0.92,
        "priority": "high",
        "icd10": "G43.909",
        "reasoning": "Classic migraine presentation with unilateral throbbing pain, photophobia, and positive family history",
        "supportingSymptoms": ["sym_1", "sym_2", "sym_3", "sym_4", "sym_6"],
        "contextSupport": ["ctx_1", "ctx_2", "ctx_3"],
        "confidence": 0.91
      },
      {
        "id": "diag_2",
        "name": "Tension headache",
        "probability": 0.22,
        "priority": "low",
        "icd10": "G44.209",
        "reasoning": "Unilateral and throbbing nature inconsistent with tension pattern",
        "supportingSymptoms": ["sym_1"],
        "contradictingSymptoms": ["sym_2", "sym_4", "sym_6"],
        "confidence": 0.78
      },
      {
        "id": "diag_3",
        "name": "Meningitis",
        "probability": 0.02,
        "priority": "low",
        "icd10": "G03.9",
        "reasoning": "Ruled out by absence of fever and normal neurological status",
        "contradictingSymptoms": ["sym_5"],
        "suppressed": true,
        "suppressionReason": "No fever or meningeal signs"
      },
      {
        "id": "diag_4",
        "name": "Medication overuse headache",
        "probability": 0.35,
        "priority": "medium",
        "icd10": "G44.41",
        "reasoning": "Consider given history of migraine treatment",
        "supportingSymptoms": ["sym_1"],
        "contextSupport": ["ctx_2"],
        "requiresInvestigation": true
      }
    ],
    "questions": [
      {
        "id": "q_1",
        "text": "Do you have a fever?",
        "type": "exclusionary",
        "priority": "critical",
        "status": "answered",
        "answer": "no",
        "timestamp": "03:20"
      },
      {
        "id": "q_2",
        "text": "Is the pain on one side of your head?",
        "type": "confirmatory",
        "priority": "high",
        "status": "answered",
        "answer": "yes, right side",
        "timestamp": "03:45"
      },
      {
        "id": "q_3",
        "text": "How often do you take pain medication?",
        "type": "exploratory",
        "priority": "high",
        "targetDiagnosis": "diag_4",
        "impact": {
          "daily": {"diag_4": 0.4, "diag_1": -0.05},
          "weekly": {"diag_4": 0.1},
          "rarely": {"diag_4": -0.3}
        },
        "status": "pending"
      },
      {
        "id": "q_4",
        "text": "Do you experience visual auras before the headache?",
        "type": "confirmatory",
        "priority": "medium",
        "targetDiagnosis": "diag_1",
        "subtype": "migraine_with_aura",
        "status": "pending"
      }
    ],
    "treatments": [
      {
        "id": "treat_1",
        "type": "medication",
        "name": "Sumatriptan",
        "dosage": "50mg oral",
        "priority": "high",
        "forDiagnosis": ["diag_1"],
        "contraindications": [],
        "confidence": 0.92,
        "historicalEffectiveness": 0.85,
        "basedOnContext": ["ctx_2"]
      },
      {
        "id": "treat_3",
        "type": "lifestyle",
        "name": "Migraine diary and trigger identification",
        "priority": "medium",
        "forDiagnosis": ["diag_1", "diag_4"],
        "duration": "ongoing",
        "confidence": 0.88
      },
      {
        "id": "treat_4",
        "type": "medication",
        "name": "Prophylactic therapy evaluation",
        "description": "Consider beta-blockers or anticonvulsants if frequency >4/month",
        "priority": "medium",
        "forDiagnosis": ["diag_1"],
        "requiresFollowUp": true
      },
      {
        "id": "treat_5",
        "type": "immediate",
        "name": "Dark, quiet room rest",
        "priority": "high",
        "forDiagnosis": ["diag_1"],
        "confidence": 0.95
      }
    ],
    "safetyAlerts": [
      {
        "id": "safety_1",
        "type": "drug_interaction",
        "severity": "low",
        "message": "Monitor sumatriptan frequency to avoid medication overuse",
        "relatedTreatments": ["treat_1"],
        "relatedDiagnoses": ["diag_4"]
      }
    ]
  },
  "links": [
    {
      "source": "sym_1",
      "target": "diag_1",
      "strength": 0.9,
      "type": "supports"
    },
    {
      "source": "sym_2",
      "target": "diag_1",
      "strength": 0.85,
      "type": "supports"
    },
    {
      "source": "sym_3",
      "target": "diag_1",
      "strength": 0.7,
      "type": "supports"
    },
    {
      "source": "sym_4",
      "target": "diag_1",
      "strength": 0.95,
      "type": "confirms"
    },
    {
      "source": "sym_6",
      "target": "diag_1",
      "strength": 0.88,
      "type": "supports"
    },
    {
      "source": "ctx_1",
      "target": "diag_1",
      "strength": 0.8,
      "type": "confirms"
    },
    {
      "source": "ctx_2",
      "target": "diag_1",
      "strength": 0.75,
      "type": "supports"
    },
    {
      "source": "ctx_3",
      "target": "diag_1",
      "strength": 0.7,
      "type": "supports"
    },
    {
      "source": "sym_1",
      "target": "diag_2",
      "strength": 0.4,
      "type": "supports"
    },
    {
      "source": "sym_4",
      "target": "diag_2",
      "strength": 0.2,
      "type": "contradicts"
    },
    {
      "source": "sym_5",
      "target": "diag_3",
      "strength": 0.9,
      "type": "contradicts"
    },
    {
      "source": "ctx_2",
      "target": "diag_4",
      "strength": 0.6,
      "type": "suggests"
    },
    {
      "source": "diag_1",
      "target": "treat_1",
      "strength": 0.92,
      "type": "treats"
    },
    {
      "source": "diag_1",
      "target": "treat_3",
      "strength": 0.8,
      "type": "manages"
    },
    {
      "source": "diag_1",
      "target": "treat_4",
      "strength": 0.7,
      "type": "prevents"
    },
    {
      "source": "diag_1",
      "target": "treat_5",
      "strength": 0.95,
      "type": "relieves"
    },
    {
      "source": "diag_4",
      "target": "treat_3",
      "strength": 0.85,
      "type": "investigates"
    },
    {
      "source": "diag_1",
      "target": "q_4",
      "strength": 0.7,
      "type": "clarifies"
    },
    {
      "source": "diag_4",
      "target": "q_3",
      "strength": 0.9,
      "type": "investigates"
    }
  ],
  "userActions": [
    {
      "timestamp": "04:45",
      "action": "suppress",
      "targetId": "diag_3",
      "reason": "No clinical indicators"
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