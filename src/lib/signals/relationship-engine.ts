// Signal Relationship Engine - Analyzes relationships between medical signals
// Identifies correlations, contradictions, and derived values

import type { EnhancedSignal, SignalRelationship } from "$lib/langgraph/state";

export interface PatientContext {
  age?: number;
  sex?: string;
  conditions?: string[];
  medications?: string[];
  allergies?: string[];
}

export interface RelationshipRule {
  sourceSignal: string;
  targetSignal: string;
  type: "derives_from" | "correlates_with" | "contradicts" | "confirms";
  formula?: string;
  condition?: (
    source: EnhancedSignal,
    target: EnhancedSignal,
    context: PatientContext,
  ) => boolean;
  strength: number;
  description: string;
}

export class SignalRelationshipEngine {
  private relationships: RelationshipRule[] = [];

  constructor() {
    this.initializeRelationshipRules();
  }

  /**
   * Analyze relationships between signals
   */
  async analyzeRelationships(
    signals: EnhancedSignal[],
    patientContext: PatientContext,
  ): Promise<SignalRelationship[]> {
    const relationships: SignalRelationship[] = [];

    // Create signal map for quick lookup
    const signalMap = new Map<string, EnhancedSignal>();
    signals.forEach((signal) => {
      signalMap.set(signal.signal.toLowerCase(), signal);
    });

    // Apply relationship rules
    for (const rule of this.relationships) {
      const sourceSignal = signalMap.get(rule.sourceSignal.toLowerCase());
      const targetSignal = signalMap.get(rule.targetSignal.toLowerCase());

      if (sourceSignal && targetSignal) {
        // Check if condition is met (if specified)
        if (
          !rule.condition ||
          rule.condition(sourceSignal, targetSignal, patientContext)
        ) {
          relationships.push({
            type: rule.type,
            targetSignal: rule.targetSignal,
            strength: rule.strength,
            formula: rule.formula,
          });
        }
      }
    }

    // Add calculated relationships
    const calculatedRelationships = this.calculateDerivedRelationships(signals);
    relationships.push(...calculatedRelationships);

    return relationships;
  }

  /**
   * Initialize predefined relationship rules
   */
  private initializeRelationshipRules(): void {
    this.relationships = [
      // Cholesterol relationships
      {
        sourceSignal: "total_cholesterol",
        targetSignal: "hdl_cholesterol",
        type: "correlates_with",
        strength: 0.6,
        description: "Total cholesterol includes HDL component",
      },
      {
        sourceSignal: "total_cholesterol",
        targetSignal: "ldl_cholesterol",
        type: "correlates_with",
        strength: 0.8,
        description: "Total cholesterol includes LDL component",
      },
      {
        sourceSignal: "ldl_cholesterol",
        targetSignal: "hdl_cholesterol",
        type: "correlates_with",
        strength: -0.3,
        description: "LDL and HDL often inversely related",
      },

      // Blood count relationships
      {
        sourceSignal: "hemoglobin",
        targetSignal: "hematocrit",
        type: "correlates_with",
        strength: 0.9,
        description: "Hemoglobin and hematocrit are closely related",
        formula: "hematocrit ≈ hemoglobin × 3",
      },
      {
        sourceSignal: "rbc",
        targetSignal: "hemoglobin",
        type: "correlates_with",
        strength: 0.8,
        description: "RBC count correlates with hemoglobin",
      },
      {
        sourceSignal: "rbc",
        targetSignal: "hematocrit",
        type: "correlates_with",
        strength: 0.8,
        description: "RBC count correlates with hematocrit",
      },

      // Kidney function relationships
      {
        sourceSignal: "creatinine",
        targetSignal: "bun",
        type: "correlates_with",
        strength: 0.7,
        description: "Creatinine and BUN both indicate kidney function",
      },
      {
        sourceSignal: "egfr",
        targetSignal: "creatinine",
        type: "derives_from",
        strength: 1.0,
        description: "eGFR is calculated from creatinine",
        formula: "eGFR = 175 × (creatinine)^-1.154 × (age)^-0.203",
      },

      // Liver function relationships
      {
        sourceSignal: "alt",
        targetSignal: "ast",
        type: "correlates_with",
        strength: 0.8,
        description: "ALT and AST both indicate liver function",
      },
      {
        sourceSignal: "bilirubin_total",
        targetSignal: "bilirubin_direct",
        type: "correlates_with",
        strength: 0.9,
        description: "Total bilirubin includes direct bilirubin",
      },

      // Diabetes relationships
      {
        sourceSignal: "glucose",
        targetSignal: "hba1c",
        type: "correlates_with",
        strength: 0.8,
        description: "Glucose and HbA1c both indicate diabetes control",
      },
      {
        sourceSignal: "glucose_fasting",
        targetSignal: "glucose",
        type: "correlates_with",
        strength: 0.9,
        description:
          "Fasting glucose is a specific type of glucose measurement",
      },

      // Thyroid relationships
      {
        sourceSignal: "tsh",
        targetSignal: "t4",
        type: "correlates_with",
        strength: -0.7,
        description: "TSH and T4 are inversely related (negative feedback)",
      },
      {
        sourceSignal: "tsh",
        targetSignal: "t3",
        type: "correlates_with",
        strength: -0.6,
        description: "TSH and T3 are inversely related",
      },
      {
        sourceSignal: "t4",
        targetSignal: "t3",
        type: "correlates_with",
        strength: 0.7,
        description: "T4 is converted to T3",
      },

      // Contradictory patterns
      {
        sourceSignal: "glucose",
        targetSignal: "insulin",
        type: "contradicts",
        strength: 0.6,
        description: "High glucose with low insulin may indicate diabetes",
        condition: (source, target) => {
          const glucose = parseFloat(source.value);
          const insulin = parseFloat(target.value);
          return glucose > 126 && insulin < 5; // Simplified threshold
        },
      },
    ];
  }

  /**
   * Calculate derived relationships based on values
   */
  private calculateDerivedRelationships(
    signals: EnhancedSignal[],
  ): SignalRelationship[] {
    const relationships: SignalRelationship[] = [];
    const signalMap = new Map<string, EnhancedSignal>();

    signals.forEach((signal) => {
      signalMap.set(signal.signal.toLowerCase(), signal);
    });

    // Calculate cholesterol ratios
    const totalChol = signalMap.get("total_cholesterol");
    const hdl = signalMap.get("hdl_cholesterol");
    const ldl = signalMap.get("ldl_cholesterol");

    if (totalChol && hdl) {
      const ratio = parseFloat(totalChol.value) / parseFloat(hdl.value);
      relationships.push({
        type: "derives_from",
        targetSignal: "cholesterol_ratio",
        strength: 1.0,
        formula: `${totalChol.value} / ${hdl.value} = ${ratio.toFixed(1)}`,
      });
    }

    // Calculate estimated GFR if creatinine is available
    const creatinine = signalMap.get("creatinine");
    if (creatinine) {
      // Simplified MDRD formula (would need age, sex, race for full calculation)
      const creatValue = parseFloat(creatinine.value);
      if (!isNaN(creatValue) && creatValue > 0) {
        relationships.push({
          type: "derives_from",
          targetSignal: "egfr_estimated",
          strength: 0.9,
          formula: `Estimated from creatinine: ${creatinine.value}`,
        });
      }
    }

    // Check for anemia patterns
    const hemoglobin = signalMap.get("hemoglobin");
    const hematocrit = signalMap.get("hematocrit");
    if (hemoglobin && hematocrit) {
      const hgbValue = parseFloat(hemoglobin.value);
      const hctValue = parseFloat(hematocrit.value);
      const expectedHct = hgbValue * 3;
      const deviation = Math.abs(hctValue - expectedHct) / expectedHct;

      if (deviation > 0.2) {
        // 20% deviation
        relationships.push({
          type: "contradicts",
          targetSignal: "hematocrit",
          strength: 0.7,
          formula: `Expected Hct: ${expectedHct.toFixed(1)}, Actual: ${hctValue}`,
        });
      } else {
        relationships.push({
          type: "confirms",
          targetSignal: "hematocrit",
          strength: 0.9,
          formula: `Hct/Hgb ratio within expected range`,
        });
      }
    }

    return relationships;
  }

  /**
   * Get relationship strength between two signals
   */
  getRelationshipStrength(signal1: string, signal2: string): number {
    const rule = this.relationships.find(
      (r) =>
        (r.sourceSignal.toLowerCase() === signal1.toLowerCase() &&
          r.targetSignal.toLowerCase() === signal2.toLowerCase()) ||
        (r.sourceSignal.toLowerCase() === signal2.toLowerCase() &&
          r.targetSignal.toLowerCase() === signal1.toLowerCase()),
    );

    return rule ? Math.abs(rule.strength) : 0;
  }

  /**
   * Find potential missing signals based on existing signals
   */
  suggestMissingSignals(signals: EnhancedSignal[]): string[] {
    const existingSignals = new Set(signals.map((s) => s.signal.toLowerCase()));
    const suggestions: string[] = [];

    // If we have some cholesterol values, suggest missing ones
    if (
      existingSignals.has("total_cholesterol") &&
      !existingSignals.has("hdl_cholesterol")
    ) {
      suggestions.push("HDL Cholesterol");
    }
    if (
      existingSignals.has("total_cholesterol") &&
      !existingSignals.has("ldl_cholesterol")
    ) {
      suggestions.push("LDL Cholesterol");
    }

    // If we have hemoglobin, suggest hematocrit
    if (
      existingSignals.has("hemoglobin") &&
      !existingSignals.has("hematocrit")
    ) {
      suggestions.push("Hematocrit");
    }

    // If we have creatinine, suggest BUN
    if (existingSignals.has("creatinine") && !existingSignals.has("bun")) {
      suggestions.push("BUN");
    }

    // If we have TSH, suggest T4
    if (existingSignals.has("tsh") && !existingSignals.has("t4")) {
      suggestions.push("T4 (Free)");
    }

    return suggestions;
  }

  /**
   * Detect potential clinical patterns
   */
  detectClinicalPatterns(
    signals: EnhancedSignal[],
    patientContext: PatientContext,
  ): string[] {
    const patterns: string[] = [];
    const signalMap = new Map<string, number>();

    // Convert signals to numeric values for analysis
    signals.forEach((signal) => {
      const value = parseFloat(signal.value);
      if (!isNaN(value)) {
        signalMap.set(signal.signal.toLowerCase(), value);
      }
    });

    // Diabetes pattern
    const glucose =
      signalMap.get("glucose") || signalMap.get("glucose_fasting");
    const hba1c = signalMap.get("hba1c");
    if ((glucose && glucose > 126) || (hba1c && hba1c > 6.5)) {
      patterns.push("Possible diabetes mellitus");
    }

    // Anemia pattern
    const hemoglobin = signalMap.get("hemoglobin");
    if (hemoglobin) {
      const anemiaThreshold = patientContext.sex === "female" ? 12.0 : 13.5;
      if (hemoglobin < anemiaThreshold) {
        patterns.push("Possible anemia");
      }
    }

    // Kidney dysfunction pattern
    const creatinine = signalMap.get("creatinine");
    const bun = signalMap.get("bun");
    if ((creatinine && creatinine > 1.3) || (bun && bun > 20)) {
      patterns.push("Possible kidney dysfunction");
    }

    // Liver dysfunction pattern
    const alt = signalMap.get("alt");
    const ast = signalMap.get("ast");
    if ((alt && alt > 40) || (ast && ast > 40)) {
      patterns.push("Possible liver dysfunction");
    }

    // Hyperlipidemia pattern
    const totalChol = signalMap.get("total_cholesterol");
    const ldl = signalMap.get("ldl_cholesterol");
    if ((totalChol && totalChol > 240) || (ldl && ldl > 160)) {
      patterns.push("Possible hyperlipidemia");
    }

    // Thyroid dysfunction pattern
    const tsh = signalMap.get("tsh");
    if (tsh) {
      if (tsh < 0.4) {
        patterns.push("Possible hyperthyroidism");
      } else if (tsh > 4.0) {
        patterns.push("Possible hypothyroidism");
      }
    }

    return patterns;
  }
}
