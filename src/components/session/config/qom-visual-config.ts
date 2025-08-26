// QOM Visual Configuration
// D3 Force Simulation and Visual Styling for QOM Visualization

import type {
  QOMVisualizationConfig,
  D3QOMNode,
  D3QOMLink,
} from "../types/qom";

export const QOM_VISUAL_CONFIG: QOMVisualizationConfig = {
  layout: {
    type: "force",
    width: 1200,
    height: 800,
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    layerSpacing: 250,
    nodeSpacing: 200,
    panelWidth: 150,
    panelHeight: 60,
  },

  forces: {
    // Link force strength - stronger for direct triggers, weaker for contributions
    linkStrength: (link: D3QOMLink) => {
      if (link.type === "triggers") return 0.8;
      if (link.type === "refines") return 0.6;
      if (link.type === "contributes") return 0.3;
      return 0.4;
    },

    // Charge force - repulsion between nodes
    chargeStrength: -800,

    // Collision radius - prevent overlap
    collisionRadius: (node: D3QOMNode) => {
      return (node.radius || 40) + 10;
    },

    // Center force - keep graph centered
    centerForce: 0.05,

    // Layer force - push nodes to their hierarchical layer
    layerForce: 0.8,
  },

  animations: {
    duration: 300,
    exitDuration: 200,
    enterDelay: 50,
    particleSpeed: 2000, // ms for particle to travel link
    pulseInterval: 1500, // ms between pulses for running nodes
  },

  styles: {
    nodes: {
      pending: {
        fill: "#F8FAFC",
        stroke: "#CBD5E1",
        strokeWidth: 2,
        opacity: 0.8,
        radius: 30,
        strokeDasharray: "4,2",
      },
      running: {
        fill: "#FEF3C7",
        stroke: "#F59E0B",
        strokeWidth: 4,
        opacity: 1,
        radius: 35,
        strokeDasharray: undefined,
        glow: "drop-shadow(0 0 12px rgba(245, 158, 11, 0.4))",
      },
      completed: {
        fill: "#ECFDF5",
        stroke: "#10B981",
        strokeWidth: 3,
        opacity: 1,
        radius: 32,
        strokeDasharray: undefined,
        innerStroke: "#6EE7B7",
      },
      failed: {
        fill: "#FEF2F2",
        stroke: "#EF4444",
        strokeWidth: 3,
        opacity: 1,
        radius: 30,
        strokeDasharray: undefined,
        pattern: "diagonal-lines",
      },
      skipped: {
        fill: "#F8FAFC",
        stroke: "#CBD5E1",
        strokeWidth: 1,
        opacity: 0.6,
        radius: 28,
        strokeDasharray: "2,4",
      },
    },

    links: {
      data_flow: {
        stroke: "#10B981",
        strokeWidth: 12, // Much thicker
        strokeDasharray: undefined,
        opacity: 0.9,
        markerEnd: "url(#arrowhead-green)",
      },
      triggers: {
        stroke: "#3B82F6",
        strokeWidth: 10, // Much thicker
        strokeDasharray: undefined,
        opacity: 0.8,
        markerEnd: "url(#arrowhead-blue)",
      },
      refines: {
        stroke: "#EF4444",
        strokeWidth: 8, // Much thicker
        strokeDasharray: "8,4",
        opacity: 0.7,
        markerEnd: "url(#arrowhead-red)",
      },
      contributes: {
        stroke: "#6366F1",
        strokeWidth: 8, // Much thicker
        strokeDasharray: "6,3",
        opacity: 0.7,
        markerEnd: "url(#arrowhead-purple)",
      },
      merges: {
        stroke: "#8B5CF6",
        strokeWidth: 10, // Much thicker
        strokeDasharray: undefined,
        opacity: 0.7,
        markerEnd: "url(#arrowhead-purple)",
      },
      inactive: {
        stroke: "#D1D5DB",
        strokeWidth: 4, // Thicker even when inactive
        strokeDasharray: "4,4",
        opacity: 0.4,
        markerEnd: undefined,
      },
    },
  },
};

// Node color by category
export const NODE_CATEGORY_COLORS: Record<string, string> = {
  session_data: "#10B981", // Green for data source
  analysis: "#3B82F6", // Blue for primary analysis
  safety: "#EC4899", // Pink for safety monitoring
  consensus: "#6366F1", // Indigo for consensus building
  cardiology: "#EF4444", // Red for cardiac specialists
  neurology: "#8B5CF6", // Purple for neuro specialists
  pulmonology: "#06B6D4", // Cyan for respiratory
  emergency: "#F59E0B", // Orange for emergency
  gastroenterology: "#84CC16", // Lime for gastro
  infectious_disease: "#F97316", // Orange for infectious
  dermatology: "#A78BFA", // Light purple for dermatology
  rheumatology: "#14B8A6", // Teal for rheumatology
  psychiatry: "#F472B6", // Pink for psychiatry
  pediatrics: "#FBBF24", // Yellow for pediatrics
  geriatrics: "#9333EA", // Deep purple for geriatrics
  obstetrics: "#FB7185", // Rose for obstetrics
};

// Get node style based on state and type
export function getNodeStyle(node: D3QOMNode) {
  const stateStyle =
    QOM_VISUAL_CONFIG.styles.nodes[node.state] ||
    QOM_VISUAL_CONFIG.styles.nodes.pending;
  const categoryColor = NODE_CATEGORY_COLORS[node.category] || "#6B7280";

  return {
    ...stateStyle,
    fill:
      node.state === "pending"
        ? stateStyle.fill
        : adjustColorBrightness(categoryColor, 20),
    stroke: node.state === "pending" ? stateStyle.stroke : categoryColor,
  };
}

// Get link style based on type and active state
export function getLinkStyle(link: D3QOMLink) {
  if (!link.active) {
    return QOM_VISUAL_CONFIG.styles.links.inactive;
  }
  return (
    QOM_VISUAL_CONFIG.styles.links[link.type] ||
    QOM_VISUAL_CONFIG.styles.links.inactive
  );
}

// Helper function to adjust color brightness
function adjustColorBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

// Fixed positioning configuration for pipeline layout
export function calculateFixedPosition(
  node: D3QOMNode,
  width: number,
  height: number,
): { x: number; y: number } {
  const margins = QOM_VISUAL_CONFIG.layout.margins;
  const usableWidth = width - margins.left - margins.right;
  const usableHeight = height - margins.top - margins.bottom;

  // Calculate X position for vertical flow
  let x = margins.left + usableWidth / 2; // Default center

  if (node.layer === 2) {
    // Layer 2: Primary Analysis (left) and Safety Monitor (right) - side by side
    if (node.category === "analysis") {
      x = margins.left + usableWidth * 0.3; // Primary Analysis on left
    } else if (node.category === "safety") {
      x = margins.left + usableWidth * 0.7; // Safety Monitor on right
    }
  }
  // All other layers (0, 1, 3, 4) stay centered

  // Calculate Y position for vertical flow - smaller spacing
  const layerHeight = usableHeight / 6; // Smaller spacing between layers
  let y: number;

  if (node.layer === 0) {
    // Session data - top center
    y = margins.top + layerHeight;
  } else if (node.layer === 1) {
    // Symptoms detection - closer to session data
    y = margins.top + layerHeight * 2;
  } else if (node.layer === 2) {
    // Primary analysis and safety monitor - side by side at same Y level
    y = margins.top + layerHeight * 3;
  } else if (node.layer === 3) {
    // Consensus builder - closer to analyzers
    y = margins.top + layerHeight * 4;
  } else if (node.layer === 4) {
    // Final output - closer to consensus
    y = margins.top + layerHeight * 5;
  } else {
    // Default fallback
    y = margins.top + usableHeight / 2;
  }

  return { x, y };
}

// Legacy force simulation configuration (keeping for reference during transition)
export function createForceSimulation(width: number, height: number) {
  return {
    // X force - push nodes to their layer position (processing pipeline)
    forceX: (node: D3QOMNode) => {
      // Layer positioning for processing pipeline:
      // Layer 0: Session Input (left)
      // Layer 1: Primary Analysis + Safety (center-left)
      // Layer 2: Specialist Analysis (center-right)
      // Layer 3: Sub-Specialist Analysis (right)
      // Layer 4: Consensus (far right)
      const layerPositions: Record<number, number> = {
        0: width * 0.12, // Session Data
        1: width * 0.28, // Symptoms Detection + Safety
        2: width * 0.44, // Primary Analysis
        3: width * 0.6, // Specialists
        4: width * 0.76, // Sub-specialists + Consensus
        5: width * 0.92, // Final Output
      };
      return layerPositions[node.layer] ?? width * 0.5;
    },

    // Y force - distribute nodes vertically within their layer
    forceY: (node: D3QOMNode) => {
      // Spread nodes vertically based on category and layer
      if (node.layer === 1) {
        // Primary analysis and safety distributed vertically
        return node.category === "safety" ? height * 0.35 : height * 0.65;
      }
      if (node.layer === 2) {
        // Specialist experts distributed in middle range
        const specialists = [
          "cardiology",
          "neurology",
          "pulmonology",
          "emergency",
        ];
        const index = specialists.indexOf(node.category);
        if (index >= 0) {
          return height * 0.25 + index * ((height * 0.5) / specialists.length);
        }
      }
      if (node.layer === 3) {
        // Sub-specialists positioned based on parent specialist
        return height * 0.4 + Math.random() * height * 0.2;
      }
      if (node.layer === 4) {
        // Consensus merger centered
        return height * 0.5;
      }
      return height / 2;
    },

    // Alpha decay - how quickly the simulation cools down
    alphaDecay: 0.02,

    // Velocity decay - friction
    velocityDecay: 0.4,

    // Alpha targets for different events
    alphaTargets: {
      restart: 0.3,
      nodeAdded: 0.5,
      nodeRemoved: 0.2,
      linkChanged: 0.3,
    },
  };
}

// Enhanced particle animation configuration
export const PARTICLE_CONFIG = {
  radius: 6,
  colors: {
    data_flow: "#10B981",
    triggers: "#3B82F6",
    refines: "#EF4444",
    contributes: "#6366F1",
    merges: "#8B5CF6",
    forward: "#10B981",
    reverse: "#EF4444",
    bidirectional: "#8B5CF6",
    both: "#8B5CF6",
  },
  speed: 1500, // ms to travel full link (faster)
  interval: 2000, // ms between particles (more frequent)
  trail: {
    enabled: true,
    length: 3,
    fadeStep: 0.3,
  },
  glow: {
    enabled: true,
    shadowBlur: 8,
    shadowColor: "currentColor",
  },
};

// Pulse animation for running nodes
export const PULSE_CONFIG = {
  scaleMin: 1,
  scaleMax: 1.2,
  duration: 1000,
  easing: "ease-in-out",
};

// Sequential activation animation
export const ACTIVATION_CONFIG = {
  connectionPulse: {
    duration: 800,
    scaleStart: 1,
    scaleEnd: 1.5,
    opacityStart: 1,
    opacityEnd: 0.3,
  },
  nodeActivation: {
    duration: 600,
    scaleStart: 0.8,
    scaleEnd: 1.0,
    glowDuration: 400,
  },
  flowAnimation: {
    duration: 1000,
    particleSize: 6,
    particleColor: "#10B981",
    particleSpeed: 1.2,
  },
};

// Transition configurations
export const TRANSITIONS = {
  nodeEnter: {
    duration: 200,
    delay: (d: D3QOMNode, i: number) => i * 10,
    initialScale: 0,
    finalScale: 1,
  },
  nodeUpdate: {
    duration: 300,
    easing: "ease-in-out",
  },
  nodeExit: {
    duration: 200,
    finalScale: 0,
    finalOpacity: 0,
  },
  linkEnter: {
    duration: 200,
    delay: 0,
    initialOpacity: (d: D3QOMLink) => getLinkStyle(d).opacity,
    finalOpacity: (d: D3QOMLink) => getLinkStyle(d).opacity,
  },
  linkUpdate: {
    duration: 300,
    easing: "ease-in-out",
  },
  linkExit: {
    duration: 200,
    finalOpacity: 0,
  },
};

// Zoom and pan configuration
export const ZOOM_CONFIG = {
  scaleExtent: [0.3, 3] as [number, number],
  translateExtent: [
    [-500, -500],
    [1700, 1300],
  ] as [[number, number], [number, number]],
  duration: 300,
  wheelDelta: -0.001,
  touchDelta: 0.1, // Increased for faster touch zoom to match SankeyDiagram
};

// Tooltip configuration
export const TOOLTIP_CONFIG = {
  offset: { x: 10, y: 10 },
  maxWidth: 300,
  showDelay: 500,
  hideDelay: 200,
  fadeInDuration: 200,
  fadeOutDuration: 150,
};

// Export functions for D3 integration
export function getNodeRadius(node: D3QOMNode): number {
  // Smaller radius since panels handle visual size
  // This is just for link anchor calculations
  const baseRadius = 25; // Reduced from 45
  const stateMultiplier = node.state === "running" ? 1.1 : 1; // Keep subtle pulse for running state

  return baseRadius * stateMultiplier;
}

export function shouldAnimateLink(link: D3QOMLink): boolean {
  return link.active && (link.type === "triggers" || link.type === "refines");
}

export function getParticleDirection(
  link: D3QOMLink,
): "forward" | "reverse" | "both" {
  if (link.direction === "bidirectional") return "both";
  if (link.type === "refines") return "reverse";
  return "forward";
}
