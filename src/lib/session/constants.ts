/**
 * Session Analysis Constants
 * Centralized configuration for medical session analysis
 */

/**
 * Question Priority Scoring Configuration
 */
export const QUESTION_SCORING = {
  /**
   * Urgency scores based on question category (0-10 scale)
   * Higher scores indicate more urgent medical concerns
   */
  URGENCY_SCORES: {
    red_flag: 10, // Immediate danger signs
    risk_assessment: 8, // Critical risk evaluation
    drug_interaction: 7, // Medication safety
    contraindication: 7, // Treatment contraindications
    allergy: 7, // Allergic reactions
    warning: 6, // General warnings
    diagnostic_clarification: 6, // Diagnostic precision
    symptom_exploration: 4, // Symptom investigation
    treatment_selection: 3, // Treatment options
  } as const,

  /**
   * Scoring algorithm weights (must sum to 1.0)
   */
  WEIGHTS: {
    URGENCY: 0.4, // 40% - Medical urgency of the question category
    RELEVANCE: 0.4, // 40% - Relevance to high-probability diagnoses
    PRIORITY: 0.2, // 20% - Explicit question priority
  },

  /**
   * Configuration for probability scaling
   */
  SCALING: {
    PROBABILITY_MULTIPLIER: 10, // Scale 0-1 probability to 0-10 range
    PRIORITY_INVERSION: 11, // Invert priority (1 becomes 10, 10 becomes 1)
  },
} as const;

/**
 * Medical Classification Constants
 */
export const MEDICAL_CATEGORIES = {
  /**
   * Question categories in order of clinical importance
   */
  QUESTION_CATEGORIES: [
    "red_flag",
    "risk_assessment",
    "drug_interaction",
    "contraindication",
    "allergy",
    "warning",
    "diagnostic_clarification",
    "symptom_exploration",
    "treatment_selection",
  ] as const,

  /**
   * Alert categories for safety concerns
   */
  ALERT_CATEGORIES: [
    "drug_interaction",
    "contraindication",
    "allergy",
    "warning",
    "red_flag",
  ] as const,
} as const;

/**
 * Session Analysis Thresholds
 */
export const ANALYSIS_THRESHOLDS = {
  /**
   * Minimum probability threshold for diagnosis consideration
   */
  MIN_DIAGNOSIS_PROBABILITY: 0.05, // 5%

  /**
   * High confidence threshold for automatic recommendations
   */
  HIGH_CONFIDENCE_THRESHOLD: 0.8, // 80%

  /**
   * Critical priority threshold for urgent questions
   */
  CRITICAL_PRIORITY_THRESHOLD: 8,

  /**
   * Maximum number of questions to show by default
   */
  DEFAULT_QUESTION_LIMIT: 10,
} as const;

/**
 * Type exports for TypeScript support
 */
export type QuestionCategory = keyof typeof QUESTION_SCORING.URGENCY_SCORES;
export type AlertCategory =
  (typeof MEDICAL_CATEGORIES.ALERT_CATEGORIES)[number];
