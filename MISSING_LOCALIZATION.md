# Missing Localization in Schema Configurations

This document identifies fields in `src/lib/configurations/` that contain translatable text content but are missing `[LANGUAGE]` localization instructions.

## Overview

Analysis of 50 schema files found **95 fields** that need localization support. These fields contain human-readable medical content, instructions, and descriptions that should be translated based on the target language.

## Fields Missing [LANGUAGE] Instructions

### 1. allergies.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 206 | `avoidanceInstructions` | "Specific avoidance instructions for patient" | Medical instructions for patients | Free Text | AI Translation | Patient-specific instructions vary greatly |
| 226 | `emergencyInstructions` | "Emergency treatment instructions" | Critical medical instructions | Free Text | AI Translation | Emergency procedures are context-specific |
| 228 | `emergencyInstructions` | "Emergency treatment instructions" | Critical medical instructions | Free Text | AI Translation | Emergency procedures are context-specific |
| 286 | `notes` | "Additional notes about the allergy" | Clinical notes and observations | Free Text | AI Translation | Clinical notes are highly variable |
| 309 | `notes` | "Additional notes about intolerance" | Clinical notes and observations | Free Text | AI Translation | Clinical notes are highly variable |
| 325 | `reaction` | "Reaction to trigger" | Clinical reaction descriptions | Enum | Standardized Set | Common reactions: rash, swelling, anaphylaxis, etc. |
| 360 | `reaction` | "Type of reaction" | Clinical reaction descriptions | Enum | Standardized Set | Standard allergy reaction types |
| 374 | `alert` | "Alert message" | Medical alert messages | Free Text | AI Translation | Alert messages are context-specific |
| 382 | `instructions` | "Special instructions related to alert" | Medical instructions | Free Text | AI Translation | Instructions are patient-specific |

### 2. assessment.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 31 | `primaryImpression` | "Primary clinical impression or working diagnosis" | Clinical assessments | Free Text | AI Translation | Clinical impressions are highly variable |
| 108 | `assessment` | "Assessment of this system" | Clinical assessments | Free Text | AI Translation | System assessments are context-specific |
| 139 | `assessment` | "Assessment of this system" | Clinical assessments | Free Text | AI Translation | System assessments are context-specific |
| 144 | `risk` | "Risk description" | Risk assessments | Free Text | AI Translation | Risk descriptions are patient-specific |
| 158 | `timeframe` | "Timeframe for potential risk" | Clinical timeframes | Mixed | Partial Standard | Could standardize common timeframes (days, weeks, months) |
| 172 | `comorbidityImpact` | "Impact of existing comorbidities on assessment" | Clinical impact descriptions | Free Text | AI Translation | Impact descriptions are highly variable |
| 200 | `factor` | "Prognostic factor" | Clinical factors | Free Text | AI Translation | Prognostic factors are context-specific |
| 210 | `expectedCourse` | "Expected clinical course" | Clinical predictions | Free Text | AI Translation | Clinical course predictions are variable |
| 299 | `consultationReason` | "Reason for specialist consultation" | Clinical reasoning | Free Text | AI Translation | Consultation reasons are highly variable |
| 311 | `consultantOpinion` | "Consultant's professional opinion" | Professional opinions | Free Text | AI Translation | Professional opinions are context-specific |

### 3. admission.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 33 | `dischargeDisposition` | "Where the patient was discharged to" | Patient disposition | Enum | Standardized Set | Standard discharge destinations: home, nursing facility, rehabilitation, etc. |
| 37 | `admissionReason` | "Primary reason for hospital admission" | Clinical reasoning | Free Text | AI Translation | Admission reasons are highly variable |
| 41 | `dischargeSummary` | "Summary of hospital stay and treatment provided" | Clinical summaries | Free Text | AI Translation | Discharge summaries are comprehensive and variable |

### 4. anesthesia.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 42 | `technique` | "Specific anesthesia technique used" | Medical techniques | Enum | Standardized Set | Standard anesthesia techniques: general, spinal, epidural, etc. |
| 137 | `type` | "Type of crystalloid" | Medical substance types | Enum | Standardized Set | Standard crystalloid types: saline, lactated ringers, etc. |
| 150 | `type` | "Type of colloid" | Medical substance types | Enum | Standardized Set | Standard colloid types: albumin, hetastarch, etc. |
| 200 | `complication` | "Description of complication" | Clinical complications | Free Text | AI Translation | Complication descriptions are highly variable |
| 227 | `complication` | "Description of complication" | Clinical complications | Free Text | AI Translation | Complication descriptions are highly variable |

### 5. gross-findings.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 35 | `description` | "Overall specimen description" | Pathological descriptions | Free Text | AI Translation | Specimen descriptions are highly variable |
| 61 | `orientation` | "Specimen orientation and landmarks" | Anatomical descriptions | Free Text | AI Translation | Orientation descriptions are specimen-specific |
| 76 | `contents` | "Container contents description" | Specimen descriptions | Free Text | AI Translation | Container contents vary greatly |
| 98 | `structure` | "Anatomical structure examined" | Anatomical terms | Enum | Standardized Set | Standard anatomical structures from medical terminology |
| 145 | `consistency` | "Lesion consistency" | Pathological findings | Enum | Standardized Set | Standard consistency terms: firm, soft, hard, cystic, etc. |
| 153 | `relationship` | "Relationship to surrounding structures" | Anatomical relationships | Free Text | AI Translation | Relationships are context-specific |
| 174 | `anterior` | "Anterior margin distance" | Anatomical measurements | Free Text | AI Translation | Measurements are specimen-specific |
| 235 | `appearance` | "Gross appearance of lymph nodes" | Pathological appearances | Free Text | AI Translation | Appearances are highly variable |
| 261 | `source` | "Source within specimen" | Specimen sources | Free Text | AI Translation | Sources are specimen-specific |
| 264 | `purpose` | "Purpose of section" | Section purposes | Enum | Standardized Set | Standard section purposes: diagnostic, margin assessment, etc. |
| 278 | `representativeSections` | "Description of representative sections taken" | Section descriptions | Free Text | AI Translation | Section descriptions are variable |
| 288 | `description` | "Additional observation" | Clinical observations | Free Text | AI Translation | Clinical observations are highly variable |

### 6. medications.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 154 | `administration` | "Administration instructions" | Medication instructions | Free Text | AI Translation | Administration instructions are medication-specific |
| 158 | `specialInstructions` | "Special instructions or precautions" | Safety instructions | Free Text | AI Translation | Special instructions are context-specific |
| 179 | `indication` | "Medical indication for prescription" | Clinical indications are highly variable and context-specific, requiring nuanced descriptions. | Free Text | AI Translation | Indications should be entered as free text for accuracy. |
| 284 | `reasonDiscontinued` | "Reason for discontinuation" | Discontinuation reasons are often nuanced and context-specific, requiring free text for accuracy. | Free Text | AI Translation | Discontinuation reasons should be entered as free text. |
| 320 | `reason` | "Reason for change" | Reasons for change are context-specific and often require detailed explanation. | Free Text | AI Translation | Reasons should be entered as free text. |
| 440 | `effect` | "Description of interaction" | Drug interactions | Free Text | AI Translation | Interaction descriptions are highly variable |
| 457 | `barriers` | "Barriers to adherence" | Patient barriers | Enum | Standardized Set | Common barriers: cost, side effects, complexity, etc. |
| 464 | `interventions` | "Interventions recommended" | Clinical interventions | Free Text | AI Translation | Interventions are context-specific |

### 7. microscopic.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 184 | `overallMicroscopicImpression` | "Overall microscopic impression or summary" | Pathological impressions | Free Text | AI Translation | Microscopic impressions are highly variable |
| 195 | `correlationWithClinical` | "Correlation between microscopic findings and clinical history" | Clinical correlations | Free Text | AI Translation | Clinical correlations are context-specific |

### 8. procedures.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 21 | `name` | "Name of the procedure performed" | Procedure names | Enum | Standardized Set | Standard procedure names from medical coding systems |
| 33 | `technique` | "Surgical technique or approach used" | Medical techniques | Enum | Standardized Set | Standard surgical techniques and approaches |
| 44 | `findings` | "Key findings during the procedure" | Clinical findings | Free Text | AI Translation | Procedural findings are highly variable |
| 53 | `outcome` | "Overall outcome of the procedure" | Procedural outcomes can be nuanced and require detailed explanation. | Free Text | AI Translation | Outcomes should be entered as free text. |
| 67 | `role` | "Role (surgeon, assistant, anesthesiologist, etc.)" | Professional roles may be granular or institution-specific, requiring free text. | Free Text | AI Translation | Roles should be entered as free text. |

### 9. social-history.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 110 | `substance` | "Substance name or type" | Substance names and types can vary widely and may include new or local substances. | Free Text | AI Translation | Substances should be entered as free text. |
| 131 | `startAge` | "Age started using" | Historical information | Free Text | AI Translation | Age information is numeric/descriptive |
| 152 | `jobTitle` | "Job title or occupation" | Occupational information | Free Text | AI Translation | Job titles are highly variable |
| 156 | `employer` | "Employer name" | Workplace information | Free Text | AI Translation | Employer names are specific entities |
| 159 | `industry` | "Industry type" | Industry classifications | Enum | Standardized Set | Standard industry classifications |
| 172 | `agent` | "Exposure agent" | Exposure agents are highly variable and may include new or rare agents. | Free Text | AI Translation | Agents should be entered as free text. |
| 207 | `exposure` | "Type of environmental exposure" | Environmental factors | Enum | Standardized Set | Standard exposure types: occupational, environmental, etc. |
| 208 | `source` | "Source of exposure" | Exposure sources | Free Text | AI Translation | Sources are context-specific |
| 215 | `duration` | "Duration of exposure" | Temporal information | Mixed | Partial Standard | Could standardize duration ranges |
| 219 | `location` | "Geographic location of exposure" | Geographic information | Free Text | AI Translation | Geographic locations are specific |
| 232 | `housingType` | "Type of housing" | Housing types can vary greatly by region and culture, requiring free text. | Free Text | AI Translation | Housing types should be entered as free text. |
| 236 | `householdComposition` | "Household composition" | Family information | Free Text | AI Translation | Household compositions are variable |
| 324 | `supportSystem` | "Description of social support system" | Social support | Free Text | AI Translation | Support systems are highly variable |
| 357 | `diet` | "Dietary patterns and restrictions" | Dietary information | Free Text | AI Translation | Dietary patterns are highly variable |
| 415 | `sources` | "Sources of stress" | Stress factors | Enum | Standardized Set | Common stress sources: work, family, financial, etc. |
| 433 | `ethnicity` | "Ethnic background" | Cultural information | Free Text | AI Translation | Ethnic backgrounds are diverse and cultural |
| 446 | `religiousAffiliation` | "Religious affiliation if relevant to care" | Religious information | Free Text | AI Translation | Religious affiliations are diverse |
| 450 | `culturalPractices` | "Cultural practices affecting health care" | Cultural practices | Free Text | AI Translation | Cultural practices are highly variable |
| 464 | `factor` | "Risk factor" | Risk factors | Enum | Standardized Set | Standard risk factor categories |
| 475 | `intervention` | "Recommended intervention" | Clinical interventions | Free Text | AI Translation | Interventions are context-specific |

### 10. triage.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 16 | `chiefComplaint` | "Primary reason for emergency department visit as stated by patient" | Patient complaints | Free Text | AI Translation | Patient complaints are highly variable |
| 31 | `modeOfArrival` | "How patient arrived" | Arrival descriptions | Enum | Standardized Set | Standard arrival modes: ambulance, walk-in, helicopter, etc. |
| 67 | `triageNotes` | "Additional triage assessment notes" | Clinical notes | Free Text | AI Translation | Triage notes are context-specific |

### 11. treatment-plan.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 41 | `regimen` | "Chemotherapy regimen name" | Treatment regimens | Enum | Standardized Set | Standard chemotherapy regimen names |
| 107 | `technique` | "Radiation technique" | Medical techniques | Enum | Standardized Set | Standard radiation techniques |
| 154 | `name` | "Procedure name" | Procedure names | Enum | Standardized Set | Standard procedure names |
| 200 | `target` | "Molecular target" | Treatment targets | Enum | Standardized Set | Standard molecular targets |
| 202 | `biomarkerRequired` | "Required biomarker for treatment" | Biomarker requirements | Enum | Standardized Set | Standard biomarker names |
| 226 | `intervention` | "Supportive care intervention" | Care interventions | Enum | Standardized Set | Standard supportive care interventions |
| 233 | `indication` | "Indication for intervention" | Clinical indications | Free Text | AI Translation | Indications are context-specific |
| 283 | `goal` | "Treatment goal description" | Treatment goals | Free Text | AI Translation | Treatment goals are patient-specific |
| 290 | `contraindication` | "Contraindication" | Medical contraindications | Enum | Standardized Set | Standard contraindications |
| 349 | `measurableOutcome` | "Measurable outcome to track progress" | Clinical outcomes | Free Text | AI Translation | Outcomes are context-specific |
| 416 | `communicationPlan` | "Plan for team communication" | Communication plans | Free Text | AI Translation | Communication plans are team-specific |

### 12. treatments.ts

| Line | Field | Description | Reason | Type | Standardization | Assessment |
|------|-------|-------------|--------|------|-------------|------------|
| 30 | `treatmentName` | "Name or description of treatment" | Treatment names | Enum | Standardized Set | Standard treatment names from medical coding |
| 143 | `effect` | "Side effect description" | Side effects | Free Text | AI Translation | Side effect descriptions are variable |
| 179 | `change` | "Description of change made" | Treatment changes | Free Text | AI Translation | Change descriptions are context-specific |
| 249 | `reasonForDiscontinuation` | "Reason treatment was stopped" | Clinical decisions | Enum | Standardized Set | Standard discontinuation reasons |
| 332 | `goal` | "Treatment goal description" | Treatment goals | Free Text | AI Translation | Treatment goals are patient-specific |
| 361 | `barrier` | "Description of barrier" | Treatment barriers | Enum | Standardized Set | Common barriers: cost, access, compliance, etc. |
| 375 | `intervention` | "Intervention to address barrier" | Clinical interventions | Free Text | AI Translation | Interventions are context-specific |

## Recommended Action

Based on the assessment, fields should be handled in two different ways:

### Fields for AI Translation (Free Text)
Add the following instruction to field descriptions:
```
Translate result to the [LANGUAGE] language if the source is in a different language.
```

### Fields for Standardization (Enum)
Create standardized enum sets with predefined translations for common medical terms, then add:
```
Use standardized terminology from the [LANGUAGE] localization set.
```

### Fields for Partial Standardization (Mixed)
Combine both approaches - use standardized terms where possible, fall back to AI translation for complex cases.

## Assessment Summary

### Standardized Sets Recommended (29 fields)
- **Allergy reactions** (2 fields) - Standard reaction types
- **Discharge dispositions** (1 field) - Standard discharge destinations  
- **Anesthesia techniques** (3 fields) - Standard medical techniques and substances
- **Anatomical structures** (2 fields) - Standard medical terminology
- **Pathological consistency** (1 field) - Standard pathological terms
- **Section purposes** (1 field) - Standard pathological procedures
- **Medication discontinuation reasons** (1 field) - Standard clinical decisions
- **Medication change reasons** (1 field) - Standard clinical decisions
- **Adherence barriers** (1 field) - Common patient barriers
- **Procedure names** (3 fields) - Standard medical procedures
- **Procedure outcomes** (1 field) - Standard clinical outcomes
- **Professional roles** (1 field) - Standard medical roles
- **Substance types** (1 field) - Standard substance categories
- **Industry classifications** (1 field) - Standard industry codes
- **Exposure agents** (2 fields) - Standard environmental exposures
- **Housing types** (1 field) - Standard housing categories
- **Stress sources** (1 field) - Common stress factors
- **Risk factors** (1 field) - Standard risk categories
- **Arrival modes** (1 field) - Standard emergency arrival methods
- **Treatment regimens** (1 field) - Standard treatment protocols
- **Radiation techniques** (1 field) - Standard medical techniques
- **Molecular targets** (1 field) - Standard biomedical targets
- **Biomarkers** (1 field) - Standard biomarker names
- **Supportive care interventions** (1 field) - Standard care protocols
- **Contraindications** (1 field) - Standard medical contraindications
- **Treatment barriers** (1 field) - Common treatment obstacles
- **Treatment names** (1 field) - Standard treatment protocols

### AI Translation Recommended (62 fields)
- **Free text descriptions** - Clinical notes, patient instructions, summaries
- **Context-specific content** - Patient complaints, emergency instructions, clinical observations
- **Variable content** - Pathological descriptions, medication instructions, social history

### Partial Standardization (4 fields)
- **Timeframes** (1 field) - Mix of standard ranges and specific durations
- **Medical indications** (1 field) - Standard indications with context-specific details
- **Exposure duration** (1 field) - Standard ranges with specific values
- **Age information** (1 field) - Mix of standard ranges and specific ages

## Priority

**High Priority**: 
1. **Standardized Sets** - Create enum translations for medical terminology
2. **Emergency Instructions** - Critical safety information requiring AI translation
3. **Patient Safety Alerts** - Medical alerts and warnings requiring AI translation