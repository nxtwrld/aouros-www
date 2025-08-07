/**
 * Visual Configuration for SessionMoe Visualizer
 * Centralized color and opacity settings for easy customization
 */

// ============================================================================
// OPACITY SETTINGS
// ============================================================================

export const OPACITY = {
  // Default states
  DEFAULT_NODE: 1.0,
  DEFAULT_LINK: 0.2,
  
  // Interactive states - hover/focus
  ACTIVE_NODE: 1.0,
  ACTIVE_LINK: 0.9,
  
  // Inactive states during highlighting
  INACTIVE_NODE_HOVER: 0.5,      // When hovering others
  INACTIVE_NODE_FOCUS: 0.5,     // When focusing others  
  INACTIVE_LINK_HOVER: 0.2,      // When hovering others
  INACTIVE_LINK_FOCUS: 0.1,     // When focusing others
  
  // Combined highlighting (hover OR focus)
  INACTIVE_NODE_HIGHLIGHTED: 0.5,
  INACTIVE_LINK_HIGHLIGHTED: 0.1,
  
  // Reset state
  RESET_NODE: 1.0,
  RESET_LINK: 0.2,
  
  // CSS hover effects
  CSS_HOVER_NODE: 0.9,
  CSS_HOVER_LINK: 0.8,
  
  // Focus mode (when node is selected)
  FOCUS_ACTIVE: 1.0,
  FOCUS_INACTIVE: 0.1,
  FOCUS_LINK_ACTIVE: 0.9,
  FOCUS_LINK_INACTIVE: 0.1,
  
  // Grayscale filter opacity
  GRAYSCALE_FILTER: 0.8,
  
  // UI element opacities
  NODE_BADGE: 0.8,
  TOOLTIP_BACKGROUND: 0.9,
  MOBILE_OVERLAY: 0.3,
  
  // Shadow opacities
  SHADOW_LIGHT: 0.1,
  SHADOW_MEDIUM: 0.2,
  SHADOW_HEAVY: 0.3,
  
  // Background opacities  
  HIGH_PRIORITY_BG: 0.2,
  NORMAL_PRIORITY_BG: 0.2,
  TOOLTIP_WHITE_BG: 0.8
} as const;

// ============================================================================
// COLOR SETTINGS
// ============================================================================

export const COLORS = {
  // Default link color
  DEFAULT_LINK: '#000000',
  
  // Node type colors (HSLA format for intensity variations)
  NODES: {
    // Symptoms
    SYMPTOM_TRANSCRIPT: 'hsla(120, 60%, 60%, {intensity})',    // Green
    SYMPTOM_SUSPECTED: 'hsla(30, 70%, 60%, {intensity})',     // Orange
    SYMPTOM_MEDICAL_HISTORY: 'hsla(200, 60%, 60%, {intensity})', // Blue
    SYMPTOM_FAMILY_HISTORY: 'hsla(280, 60%, 60%, {intensity})', // Purple
    SYMPTOM_SOCIAL_HISTORY: 'hsla(40, 70%, 60%, {intensity})', // Yellow-Orange
    SYMPTOM_MEDICATION_HISTORY: 'hsla(180, 60%, 60%, {intensity})', // Cyan
    
    // Medical elements
    DIAGNOSIS: 'hsla(220, 70%, 60%, {intensity})',            // Blue
    TREATMENT: 'hsla(160, 70%, 60%, {intensity})',            // Teal
    
    // Actions
    QUESTION: 'hsla(40, 80%, 60%, {intensity})',              // Yellow
    ALERT: 'hsla(0, 80%, 60%, {intensity})',                 // Red
    
    // Default/fallback
    DEFAULT: 'hsla(0, 0%, 60%, {intensity})'                 // Gray
  },
  
  // Relationship type colors (for link coloring during hover)
  RELATIONSHIPS: {
    // Supportive relationships
    SUPPORTS: '#4ade80',      // Green
    CONFIRMS: '#4ade80',      // Green
    SUGGESTS: '#fb923c',      // Orange
    INDICATES: '#fb923c',     // Orange
    
    // Negative relationships  
    CONTRADICTS: '#f87171',   // Red
    RULES_OUT: '#f87171',     // Red
    
    // Treatment relationships
    TREATS: '#60a5fa',        // Blue
    MANAGES: '#60a5fa',       // Blue
    REQUIRES: '#60a5fa',      // Blue
    
    // Investigation relationships
    INVESTIGATES: '#a78bfa',  // Purple
    CLARIFIES: '#a78bfa',     // Purple
    EXPLORES: '#a78bfa',      // Purple
    
    // Default/fallback
    DEFAULT: '#6b7280'        // Gray
  },
  
  // Legend colors (for display consistency)
  LEGEND: {
    SYMPTOM: 'hsla(120, 60%, 60%, 0.8)',
    DIAGNOSIS: 'hsla(220, 70%, 60%, 0.8)', 
    TREATMENT: 'hsla(160, 70%, 60%, 0.8)',
    QUESTION: 'hsla(40, 80%, 60%, 0.8)',
    ALERT: 'hsla(0, 80%, 60%, 0.8)'
  },
  
  // Source type colors (for legend and node differentiation)
  SOURCES: {
    TRANSCRIPT: '#10b981',
    MEDICAL_HISTORY: '#3b82f6',
    FAMILY_HISTORY: '#8b5cf6', 
    SOCIAL_HISTORY: '#f59e0b',
    MEDICATION_HISTORY: '#06b6d4',
    SUSPECTED: '#f97316'
  },
  
  // Priority/severity colors
  PRIORITY: {
    HIGH: '#dc2626',          // Red
    MEDIUM: '#f59e0b',        // Orange  
    LOW: '#6b7280'            // Gray
  },
  
  // UI element colors
  UI: {
    TEXT_PRIMARY: '#1f2937',
    TEXT_SECONDARY: '#6b7280',
    BACKGROUND: '#f8fafc',
    SURFACE: '#ffffff',
    BORDER: '#e2e8f0',
    ERROR: '#dc2626',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    INFO: '#3b82f6'
  }
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get node color with proper intensity based on priority
 */
export function getNodeColor(type: string, priority: number = 5, source?: string): string {
  // Priority-based intensity (1=critical/dark, 10=low/light)
  const intensity = Math.max(0.3, 1 - (priority - 1) / 9 * 0.7);
  
  switch (type) {
    case 'symptom':
      if (source === 'suspected') return COLORS.NODES.SYMPTOM_SUSPECTED.replace('{intensity}', intensity.toString());
      if (source === 'medical_history') return COLORS.NODES.SYMPTOM_MEDICAL_HISTORY.replace('{intensity}', intensity.toString());
      if (source === 'family_history') return COLORS.NODES.SYMPTOM_FAMILY_HISTORY.replace('{intensity}', intensity.toString());
      if (source === 'social_history') return COLORS.NODES.SYMPTOM_SOCIAL_HISTORY.replace('{intensity}', intensity.toString());
      if (source === 'medication_history') return COLORS.NODES.SYMPTOM_MEDICATION_HISTORY.replace('{intensity}', intensity.toString());
      return COLORS.NODES.SYMPTOM_TRANSCRIPT.replace('{intensity}', intensity.toString());
    case 'diagnosis':
      return COLORS.NODES.DIAGNOSIS.replace('{intensity}', intensity.toString());
    case 'treatment':
      return COLORS.NODES.TREATMENT.replace('{intensity}', intensity.toString());
    case 'question':
      return COLORS.NODES.QUESTION.replace('{intensity}', intensity.toString());
    case 'alert':
      return COLORS.NODES.ALERT.replace('{intensity}', intensity.toString());
    default:
      return COLORS.NODES.DEFAULT.replace('{intensity}', intensity.toString());
  }
}

/**
 * Get relationship color for link highlighting
 */
export function getLinkColor(relationship: string): string {
  const normalizedRel = relationship.toLowerCase();
  
  switch (normalizedRel) {
    case 'supports':
    case 'confirms': 
      return COLORS.RELATIONSHIPS.SUPPORTS;
    case 'contradicts':
    case 'rules_out':
      return COLORS.RELATIONSHIPS.CONTRADICTS;
    case 'treats':
    case 'manages':
    case 'requires':
      return COLORS.RELATIONSHIPS.TREATS;
    case 'investigates':
    case 'clarifies':
    case 'explores':
      return COLORS.RELATIONSHIPS.INVESTIGATES;
    case 'suggests':
    case 'indicates':
      return COLORS.RELATIONSHIPS.SUGGESTS;
    default:
      return COLORS.RELATIONSHIPS.DEFAULT;
  }
}

/**
 * Get source color for differentiation
 */
export function getSourceColor(source: string): string {
  switch (source) {
    case 'transcript': return COLORS.SOURCES.TRANSCRIPT;
    case 'medical_history': return COLORS.SOURCES.MEDICAL_HISTORY;
    case 'family_history': return COLORS.SOURCES.FAMILY_HISTORY;
    case 'social_history': return COLORS.SOURCES.SOCIAL_HISTORY;
    case 'medication_history': return COLORS.SOURCES.MEDICATION_HISTORY;
    case 'suspected': return COLORS.SOURCES.SUSPECTED;
    default: return COLORS.UI.TEXT_SECONDARY;
  }
}

/**
 * Get priority-based color
 */
export function getPriorityColor(priority: number): string {
  if (priority <= 3) return COLORS.PRIORITY.HIGH;
  if (priority <= 6) return COLORS.PRIORITY.MEDIUM;
  return COLORS.PRIORITY.LOW;
}