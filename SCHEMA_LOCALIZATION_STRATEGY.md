# Schema Localization Strategy

This document outlines the strategy for updating schemas with missing translation instructions and standardizing enums for better localization support.

## Overview

Based on analysis in `MISSING_LOCALIZATION.md` of **95 fields across 12 schema files**, we need to:
1. **29 fields** - Create standardized enum sets with predefined translations using existing `src/lib/i18n` system
2. **62 fields** - Add `[LANGUAGE]` translation instructions for AI translation
3. **4 fields** - Implement hybrid approach (partial standardization)

## Current Translation System

The project uses **svelte-i18n** with translation files in `src/lib/i18n/locales/`:
- `en.json` (English) - 459 lines
- `cs-CZ.json` (Czech) - 457 lines  
- `de-DE.json` (German) - 457 lines

**Existing medical translations** are structured under `medical.prop-values.*` (e.g., `medical.prop-values.biologicalSex.female`).

## Phase 1: Standardized Enum Definitions

### 1.1 Create Shared Enum Constants

Create centralized enum definitions in `/src/lib/configurations/enums/`:

```typescript
// medical-enums.ts
export const MedicalEnums = {
  // Core Medical Severity (standardized across all schemas)
  SEVERITY: ["mild", "moderate", "severe", "critical"] as const,
  
  // Risk Assessment (standardized)
  RISK_LEVEL: ["low", "moderate", "high", "critical"] as const,
  
  // Quality Measures (standardized)
  QUALITY: ["excellent", "good", "fair", "poor", "unknown"] as const,
  
  // Clinical Status (standardized)
  CLINICAL_STATUS: ["active", "inactive", "completed", "discontinued", "planned"] as const,
  
  // Urgency Classification (standardized)
  URGENCY: ["routine", "urgent", "stat", "emergent"] as const,
  
  // Verification Status (standardized)
  VERIFICATION: ["confirmed", "probable", "possible", "suspected", "unconfirmed"] as const,
  
  // Treatment Response (standardized)
  RESPONSE: ["excellent", "good", "partial", "poor", "no_response", "too_early"] as const,
  
  // Change Assessment (standardized)
  CHANGE: ["new", "stable", "improved", "worse", "resolved", "not_compared"] as const,
  
  // Clinical Significance (standardized)
  SIGNIFICANCE: ["critical", "significant", "minor", "incidental", "normal"] as const,
} as const;

// domain-specific-enums.ts
export const DomainEnums = {
  // Allergy-specific
  ALLERGY_REACTIONS: ["rash", "swelling", "anaphylaxis", "hives", "breathing_difficulty", "nausea", "other"] as const,
  
  // Medication-specific
  DISCONTINUATION_REASONS: ["adverse_effects", "ineffective", "patient_preference", "cost", "drug_interaction", "completed_course"] as const,
  
  MEDICATION_CHANGE_REASONS: ["dose_adjustment", "side_effects", "ineffective", "drug_interaction", "cost", "availability"] as const,
  
  ADHERENCE_BARRIERS: ["cost", "side_effects", "complexity", "forgetfulness", "lifestyle", "access"] as const,
  
  // Procedure-specific
  PROCEDURE_OUTCOMES: ["successful", "partially_successful", "complicated", "incomplete", "failed"] as const,
  
  PROFESSIONAL_ROLES: ["surgeon", "assistant", "anesthesiologist", "nurse", "technician", "consultant"] as const,
  
  // Admission-specific
  DISCHARGE_DISPOSITIONS: ["home", "skilled_nursing", "rehabilitation", "hospice", "transferred", "left_ama"] as const,
  
  // Anesthesia-specific
  ANESTHESIA_TECHNIQUES: ["general", "spinal", "epidural", "local", "regional", "sedation"] as const,
  
  CRYSTALLOID_TYPES: ["normal_saline", "lactated_ringers", "dextrose", "plasmalyte"] as const,
  
  COLLOID_TYPES: ["albumin", "hetastarch", "dextran", "gelatin"] as const,
  
  // Pathology-specific
  CONSISTENCY_TYPES: ["soft", "firm", "hard", "cystic", "necrotic", "hemorrhagic"] as const,
  
  SECTION_PURPOSES: ["diagnostic", "margin_assessment", "staging", "research", "quality_control"] as const,
  
  // Social History
  SUBSTANCE_TYPES: ["tobacco", "alcohol", "marijuana", "cocaine", "opioids", "other_drugs"] as const,
  
  INDUSTRY_CLASSIFICATIONS: ["healthcare", "construction", "manufacturing", "agriculture", "education", "technology", "other"] as const,
  
  EXPOSURE_AGENTS: ["asbestos", "lead", "chemicals", "radiation", "biological", "noise", "ergonomic"] as const,
  
  EXPOSURE_TYPES: ["occupational", "environmental", "recreational", "domestic", "medical"] as const,
  
  HOUSING_TYPES: ["single_family", "apartment", "assisted_living", "nursing_home", "homeless", "other"] as const,
  
  STRESS_SOURCES: ["work", "family", "financial", "health", "relationship", "legal", "other"] as const,
  
  // Triage-specific
  ARRIVAL_MODES: ["ambulance", "walk_in", "helicopter", "police", "private_vehicle", "public_transport"] as const,
  
  // Treatment Planning
  TREATMENT_REGIMENS: ["adjuvant", "neoadjuvant", "palliative", "curative", "maintenance", "salvage"] as const,
  
  RADIATION_TECHNIQUES: ["external_beam", "brachytherapy", "stereotactic", "intensity_modulated", "proton"] as const,
  
  MOLECULAR_TARGETS: ["her2", "egfr", "pd1", "pdl1", "vegf", "kras", "braf", "other"] as const,
  
  CONTRAINDICATIONS: ["allergy", "pregnancy", "renal_failure", "liver_failure", "drug_interaction", "age", "other"] as const,
  
  TREATMENT_BARRIERS: ["cost", "access", "compliance", "side_effects", "transportation", "insurance"] as const,
} as const;
```

### 1.2 Extend Existing Translation Files

Add enum translations to existing `src/lib/i18n/locales/*.json` files under `medical.enums.*`:

**en.json:**
```json
{
  "medical": {
    "enums": {
      "severity": {
        "mild": "Mild",
        "moderate": "Moderate",
        "severe": "Severe", 
        "critical": "Critical"
      },
      "risk_level": {
        "low": "Low",
        "moderate": "Moderate",
        "high": "High",
        "critical": "Critical"
      },
      "allergy_reactions": {
        "rash": "Rash",
        "swelling": "Swelling",
        "anaphylaxis": "Anaphylaxis"
      }
    }
  }
}
```

**cs-CZ.json:**
```json
{
  "medical": {
    "enums": {
      "severity": {
        "mild": "Mírná",
        "moderate": "Střední",
        "severe": "Těžká",
        "critical": "Kritická"
      }
    }
  }
}
```

**de-DE.json:**
```json
{
  "medical": {
    "enums": {
      "severity": {
        "mild": "Mild",
        "moderate": "Mäßig", 
        "severe": "Schwer",
        "critical": "Kritisch"
      }
    }
  }
}
```

## Phase 2: Update Schema Files

### 2.1 Fields Requiring Standardized Enums (29 fields)

**Priority 1 - Critical Medical Terms:**

| Schema File | Field | Current Status | Standardized Enum |
|-------------|-------|----------------|-------------------|
| `allergies.ts` | `reaction` (line 325, 360) | Free text | `DomainEnums.ALLERGY_REACTIONS` |
| `admission.ts` | `dischargeDisposition` (line 33) | Free text | `DomainEnums.DISCHARGE_DISPOSITIONS` |
| `anesthesia.ts` | `technique` (line 42) | Free text | `DomainEnums.ANESTHESIA_TECHNIQUES` |
| `anesthesia.ts` | `type` (line 137, 150) | Free text | `DomainEnums.CRYSTALLOID_TYPES` / `COLLOID_TYPES` |
| `gross-findings.ts` | `structure` (line 98) | Free text | Anatomical structure enum |
| `gross-findings.ts` | `consistency` (line 145) | Free text | `DomainEnums.CONSISTENCY_TYPES` |
| `gross-findings.ts` | `purpose` (line 264) | Free text | `DomainEnums.SECTION_PURPOSES` |
| `medications.ts` | `reasonDiscontinued` (line 284) | Free text | `DomainEnums.DISCONTINUATION_REASONS` |
| `medications.ts` | `reason` (line 320) | Free text | `DomainEnums.MEDICATION_CHANGE_REASONS` |
| `medications.ts` | `barriers` (line 457) | Free text | `DomainEnums.ADHERENCE_BARRIERS` |
| `procedures.ts` | `name` (line 21) | Free text | Standard procedure codes |
| `procedures.ts` | `technique` (line 33) | Free text | Surgical technique enum |
| `procedures.ts` | `outcome` (line 53) | Free text | `DomainEnums.PROCEDURE_OUTCOMES` |
| `procedures.ts` | `role` (line 67) | Free text | `DomainEnums.PROFESSIONAL_ROLES` |

**Priority 2 - Social & Environmental:**

| Schema File | Field | Standardized Enum |
|-------------|-------|-------------------|
| `social-history.ts` | `substance` (line 110) | `DomainEnums.SUBSTANCE_TYPES` |
| `social-history.ts` | `industry` (line 159) | `DomainEnums.INDUSTRY_CLASSIFICATIONS` |
| `social-history.ts` | `agent` (line 172) | `DomainEnums.EXPOSURE_AGENTS` |
| `social-history.ts` | `exposure` (line 207) | `DomainEnums.EXPOSURE_TYPES` |
| `social-history.ts` | `housingType` (line 232) | `DomainEnums.HOUSING_TYPES` |
| `social-history.ts` | `sources` (line 415) | `DomainEnums.STRESS_SOURCES` |
| `social-history.ts` | `factor` (line 464) | Risk factor enum |
| `triage.ts` | `modeOfArrival` (line 31) | `DomainEnums.ARRIVAL_MODES` |

**Priority 3 - Treatment Planning:**

| Schema File | Field | Standardized Enum |
|-------------|-------|-------------------|
| `treatment-plan.ts` | `regimen` (line 41) | `DomainEnums.TREATMENT_REGIMENS` |
| `treatment-plan.ts` | `technique` (line 107) | `DomainEnums.RADIATION_TECHNIQUES` |
| `treatment-plan.ts` | `name` (line 154) | Standard procedure codes |
| `treatment-plan.ts` | `target` (line 200) | `DomainEnums.MOLECULAR_TARGETS` |
| `treatment-plan.ts` | `biomarkerRequired` (line 202) | Biomarker enum |
| `treatment-plan.ts` | `intervention` (line 226) | Supportive care enum |
| `treatment-plan.ts` | `contraindication` (line 290) | `DomainEnums.CONTRAINDICATIONS` |
| `treatments.ts` | `treatmentName` (line 30) | Standard treatment codes |
| `treatments.ts` | `reasonForDiscontinuation` (line 249) | `DomainEnums.DISCONTINUATION_REASONS` |
| `treatments.ts` | `barrier` (line 361) | `DomainEnums.TREATMENT_BARRIERS` |

### 2.2 Fields Requiring AI Translation (62 fields)

Add the following instruction to all free-text fields:

```typescript
description: "Field description here. Translate result to the [LANGUAGE] language if the source is in a different language."
```

**High Priority - Patient Safety:**

| Schema File | Fields | Reason |
|-------------|--------|--------|
| `allergies.ts` | `avoidanceInstructions`, `emergencyInstructions`, `alert`, `instructions` | Critical safety information |
| `medications.ts` | `administration`, `specialInstructions` | Medication safety |
| `triage.ts` | `chiefComplaint`, `triageNotes` | Emergency department prioritization |

**Medium Priority - Clinical Content:**

| Schema File | Fields | Reason |
|-------------|--------|--------|
| `assessment.ts` | All assessment fields | Clinical decision making |
| `microscopic.ts` | `overallMicroscopicImpression`, `correlationWithClinical` | Pathology reports |
| `procedures.ts` | `findings` | Procedure documentation |
| `admission.ts` | `admissionReason`, `dischargeSummary` | Hospital documentation |

**Lower Priority - Descriptive Content:**

| Schema File | Fields | Reason |
|-------------|--------|--------|
| `gross-findings.ts` | Most descriptive fields | Pathology descriptions |
| `social-history.ts` | Free text fields | Patient history |
| `treatment-plan.ts` | Goal and outcome fields | Treatment planning |

### 2.3 Partial Standardization Fields (4 fields)

Create hybrid approach with common values + free text fallback:

| Schema File | Field | Approach |
|-------------|-------|----------|
| `assessment.ts` | `timeframe` (line 158) | Enum: ["days", "weeks", "months", "years"] + free text |
| `medications.ts` | `indication` (line 179) | Common indications enum + free text |
| `social-history.ts` | `duration` (line 215) | Duration ranges enum + specific values |
| `social-history.ts` | `startAge` (line 131) | Age ranges enum + specific ages |

## Phase 3: File-by-File Implementation Plan

### 3.1 Implementation Approach

**Strategy**: Update schema files one at a time to ensure controlled implementation and testing.

**Order of Implementation** (based on priority from MISSING_LOCALIZATION.md):

1. **allergies.ts** - Critical patient safety information
2. **medications.ts** - High-priority medication safety
3. **triage.ts** - Emergency department prioritization
4. **procedures.ts** - Medical procedure documentation
5. **admission.ts** - Hospital documentation
6. **anesthesia.ts** - Anesthesia procedures
7. **assessment.ts** - Clinical assessments
8. **gross-findings.ts** - Pathology findings
9. **microscopic.ts** - Pathology analysis
10. **social-history.ts** - Patient background
11. **treatment-plan.ts** - Treatment planning
12. **treatments.ts** - Treatment documentation

### 3.2 Per-File Implementation Steps

For each schema file, follow these steps:

**Step 1: Add Enum Translations to i18n files**
- Add new enum definitions under `medical.enums.*` in all three language files
- Use the enum names from the strategy (e.g., `allergy_reactions`, `discontinuation_reasons`)

**Step 2: Update Schema File**
- For enum fields: Replace `type: "string"` with enum array containing the values
- For AI translation fields: Append translation instruction to existing description
- Use standard instruction: `Translate result to the [LANGUAGE] language if the source is in a different language.`

**Step 3: Move to Next File**
- Complete all changes for current file before moving to next
- No testing or documentation needed until all files are complete

### 3.3 File-Specific Implementation Details


#### File Example: medications.ts

**From MISSING_LOCALIZATION.md:**

| Line | Field | Type | Change Needed |
|------|-------|------|---------------|
| 154 | `administration` | AI Translation | Add [LANGUAGE] instruction |
| 158 | `specialInstructions` | AI Translation | Add [LANGUAGE] instruction |
| 179 | `indication` | AI Translation | Add [LANGUAGE] instruction |
| 284 | `reasonDiscontinued` | Enum | Standardize discontinuation reasons |
| 320 | `reason` | Enum | Standardize change reasons |
| 440 | `effect` | AI Translation | Add [LANGUAGE] instruction |
| 457 | `barriers` | Enum | Standardize adherence barriers |
| 464 | `interventions` | AI Translation | Add [LANGUAGE] instruction |

**Required i18n additions:**
```json
{
  "medical": {
    "enums": {
      "discontinuation_reasons": {
        "adverse_effects": "Adverse effects",
        "ineffective": "Ineffective",
        "patient_preference": "Patient preference",
        "cost": "Cost",
        "drug_interaction": "Drug interaction",
        "completed_course": "Completed course"
      },
      "medication_change_reasons": {
        "dose_adjustment": "Dose adjustment",
        "side_effects": "Side effects",
        "ineffective": "Ineffective",
        "drug_interaction": "Drug interaction",
        "cost": "Cost",
        "availability": "Availability"
      },
      "adherence_barriers": {
        "cost": "Cost",
        "side_effects": "Side effects",
        "complexity": "Complexity",
        "forgetfulness": "Forgetfulness",
        "lifestyle": "Lifestyle",
        "access": "Access"
      }
    }
  }
}
```

### 3.4 Testing Strategy Per File

**After each file update:**
1. **Schema Validation** - Ensure JSON schema is valid
2. **Enum Testing** - Test all enum values work correctly
3. **Translation Testing** - Test i18n translations in all languages
4. **AI Integration Testing** - Test [LANGUAGE] replacement works
5. **Regression Testing** - Ensure no existing functionality breaks

### 3.5 Progress Tracking

### 3.4 Implementation Progress

**Files Completed:**
- [x] allergies.ts
- [ ] medications.ts
- [ ] triage.ts
- [ ] procedures.ts
- [ ] admission.ts
- [ ] anesthesia.ts
- [ ] assessment.ts
- [ ] gross-findings.ts
- [ ] microscopic.ts
- [ ] social-history.ts
- [ ] treatment-plan.ts
- [ ] treatments.ts

### 3.5 Standardized Translation Instructions

**Analysis of Existing Patterns** (174 occurrences across schema files):

| Pattern | Count | Example | Issues |
|---------|-------|---------|--------|
| `Translate result to the [LANGUAGE] language if the source is in a different language.` | 19 | Most comprehensive | Typo: "langauge" |
| `Provide answer in [LANGUAGE] language.` | 74 | Forces target language | No conditional logic |
| `Translate to [LANGUAGE] if needed.` | 10 | Concise | Vague criteria |
| `Translate result to the [LANGUAGE] language if the source is in a different language.` | 5 | Comprehensive + correct | Best option |

**Recommended Standard Translation Instructions:**

1. **For Free Text Fields** (descriptions, notes, instructions):
   ```
   "Field description here. Translate result to the [LANGUAGE] language if the source is in a different language."
   ```

2. **For Structured Output Fields** (diagnosis names, categorical responses):
   ```
   "Field description here. Provide answer in [LANGUAGE] language."
   ```

3. **For Optional Fields** (summaries, additional notes):
   ```
   "Field description here. Translate to [LANGUAGE] if needed."
   ```

**Rationale:**
- **Conditional translation** preserves source language when appropriate
- **Fixes existing typo** ("langauge" → "language") 
- **Consistent with most comprehensive existing pattern**
- **Context-appropriate** for different field types

### 3.7 Next Steps

1. **Start with allergies.ts** - highest priority for patient safety
2. **Complete full cycle** - analysis → implementation → testing
3. **Document lessons learned** - improve process for subsequent files
4. **Move to next file** - only after current file is fully complete

## Phase 4: Maintenance & Future Improvements

### 4.1 Ongoing Maintenance

- Regular review of enum usage patterns
- Addition of new languages as needed
- Updates to medical terminology as standards evolve
- Performance monitoring of translation systems

### 4.2 Future Enhancements

- Integration with medical coding systems (ICD-10, SNOMED)
- Automated enum translation updates
- Machine learning for context-aware translations
- Integration with FHIR standard terminologies

## Conclusion

This strategy provides a comprehensive approach to standardizing medical terminology while maintaining the flexibility needed for complex medical documentation. The phased approach ensures systematic implementation while minimizing disruption to existing functionality.

The combination of standardized enums for common medical terms and AI translation for complex, context-specific content will provide optimal localization support for the Mediqom platform across Czech, German, and English languages.