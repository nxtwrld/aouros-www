# Patient Profile Matching Enhancement

## Executive Summary

This document outlines strategies to improve patient profile matching in the Mediqom medical records system. The current implementation in `src/lib/profiles/tools.ts:findInProfiles` uses basic string matching and insurance number comparison, which can result in false positives and missed matches. This enhancement proposes a **hybrid privacy-preserving approach** that combines AI-powered matching with advanced cryptographic techniques to achieve high accuracy while maintaining strong privacy guarantees and preventing dangerous false matches.

## User Personas

### Primary Users

**Dr. Sarah Chen - General Practitioner**

- **Role**: Primary care physician using Mediqom for patient consultations
- **Pain Points**: Frequently encounters duplicate patient profiles, wastes time manually verifying patient identities
- **Goals**: Quickly and accurately identify returning patients, maintain comprehensive medical histories
- **Technical Skill**: Medium - comfortable with medical software but not technical systems

**Maria Rodriguez - Medical Assistant**

- **Role**: Handles patient intake and document processing
- **Pain Points**: Struggles with patient name variations, insurance number inconsistencies
- **Goals**: Efficiently process patient documents, avoid creating duplicate profiles
- **Technical Skill**: Low - needs intuitive, error-resistant interfaces

**Dr. James Wilson - Hospital Administrator**

- **Role**: Oversees medical record management and compliance
- **Pain Points**: Concerned about patient safety, data privacy, and regulatory compliance
- **Goals**: Ensure accurate patient identification, maintain audit trails, meet GDPR/HIPAA requirements
- **Technical Skill**: High - understands both medical and technical requirements

### Secondary Users

**Elena Novak - Data Privacy Officer**

- **Role**: Ensures compliance with privacy regulations
- **Pain Points**: Current system lacks proper audit trails and privacy guarantees
- **Goals**: Implement privacy-by-design solutions, maintain regulatory compliance
- **Technical Skill**: High - expert in privacy regulations and technical implementations

**Tom Anderson - IT Administrator**

- **Role**: Manages technical infrastructure and system maintenance
- **Pain Points**: Complex system integration, performance optimization challenges
- **Goals**: Maintain system reliability, optimize performance, ensure security
- **Technical Skill**: Expert - deep technical knowledge of system architecture

## User Stories

### Epic 1: Intelligent Profile Matching

**US-1.1: As a medical assistant, I want the system to automatically suggest matching profiles when I import patient documents, so I can quickly identify returning patients without creating duplicates.**

**US-1.2: As a doctor, I want to see confidence scores for profile matches, so I can make informed decisions about patient identity.**

**US-1.3: As a medical assistant, I want the system to explain why profiles were matched or not matched, so I can understand and trust the system's decisions.**

**US-1.4: As a hospital administrator, I want the system to flag potentially dangerous false matches, so we can prevent medical errors.**

### Epic 2: Privacy-Preserving Operations

**US-2.1: As a data privacy officer, I want all profile matching to use encrypted comparisons, so patient data remains protected during processing.**

**US-2.2: As a hospital administrator, I want complete audit trails of all matching decisions, so we can demonstrate compliance during inspections.**

**US-2.3: As a doctor, I want to know what privacy guarantees are in place for profile matching, so I can assure patients their data is protected.**

**US-2.4: As a data privacy officer, I want zero-knowledge proofs for sensitive matching operations, so we can prove compliance without exposing patient data.**

### Epic 3: Advanced Matching Capabilities

**US-3.1: As a medical assistant, I want the system to handle name variations (nicknames, cultural variations, typos), so I don't miss matches due to data entry differences.**

**US-3.2: As a doctor, I want the system to consider multiple factors (name, insurance, birth date, biological sex), so matching is more accurate than simple name matching.**

**US-3.3: As a medical assistant, I want the system to detect and prevent conflicting information (different birth dates, biological sex), so we maintain data integrity.**

**US-3.4: As a hospital administrator, I want automated detection of temporal inconsistencies, so we can identify potential data quality issues.**

### Epic 4: User Interface and Experience

**US-4.1: As a medical assistant, I want a visual confidence indicator for profile matches, so I can quickly assess match quality.**

**US-4.2: As a doctor, I want a side-by-side comparison view for similar profiles, so I can easily distinguish between different patients.**

**US-4.3: As a medical assistant, I want a review queue for flagged matches, so I can efficiently handle uncertain cases.**

**US-4.4: As a hospital administrator, I want an analytics dashboard showing matching performance metrics, so I can monitor system effectiveness.**

## Implementation Strategy

### Feature Prioritization (MoSCoW)

#### Must Have (Sprint 1-2)

- **M1**: Basic hash-based privacy-preserving matching
- **M2**: Multi-tier confidence scoring system
- **M3**: Integration with existing LangGraph workflow
- **M4**: Visual confidence indicators in UI
- **M5**: Automatic exclusion criteria for conflicting data
- **M6**: Audit trail generation for compliance

#### Should Have (Sprint 3-4)

- **S1**: Advanced cryptographic matching (homomorphic encryption)
- **S2**: Fuzzy matching with name variation detection
- **S3**: Review queue for uncertain matches
- **S4**: Side-by-side profile comparison interface
- **S5**: Performance optimization with indexing
- **S6**: Comprehensive error handling and recovery

#### Could Have (Sprint 5-6)

- **C1**: Zero-knowledge proof generation
- **C2**: Secure multi-party computation
- **C3**: Analytics dashboard for administrators
- **C4**: Advanced AI semantic matching
- **C5**: Cultural name variation databases
- **C6**: Automated duplicate detection and merging

#### Won't Have (Future Releases)

- **W1**: Machine learning model training interface
- **W2**: Real-time collaboration features
- **W3**: Advanced biometric matching
- **W4**: Blockchain-based audit trails
- **W5**: Multi-tenant architecture support

### Acceptance Criteria

#### User Story US-1.1: Automatic Profile Suggestions

**AC-1.1.1**: GIVEN a patient document is imported, WHEN the system detects patient information, THEN it displays up to 5 matching profile suggestions ranked by confidence

**AC-1.1.2**: GIVEN multiple profile matches exist, WHEN confidence scores are equal, THEN profiles are ranked by most recent activity

**AC-1.1.3**: GIVEN no confident matches exist, WHEN the system suggests creating a new profile, THEN it provides clear indication of the decision reasoning

**AC-1.1.4**: GIVEN a profile suggestion is selected, WHEN the user confirms the match, THEN the system updates the existing profile with new information

#### User Story US-2.1: Encrypted Comparisons

**AC-2.1.1**: GIVEN profile matching operations, WHEN processing patient data, THEN all comparisons use encrypted or hashed data only

**AC-2.1.2**: GIVEN Phase 1 matching, WHEN high confidence matches are found, THEN processing uses hash-based comparison only

**AC-2.1.3**: GIVEN Phase 2 matching, WHEN complex cases require advanced matching, THEN homomorphic encryption is applied

**AC-2.1.4**: GIVEN any matching operation, WHEN audit logs are generated, THEN they contain privacy guarantee attestations

## Current Implementation Analysis

### Current Schema (`src/lib/configurations/core.patient.ts`)

```typescript
{
  fullName: string (required)
  identifier: string (required)
  biologicalSex?: "male" | "female"
  birthDate?: string (YYYY-MM-DD format)
  insurance?: {
    provider?: string
    number?: string
  }
}
```

### Current Matching Logic (`src/lib/profiles/tools.ts:191-266`)

The existing `findInProfiles` function uses:

1. Name normalization (removes diacritics, punctuation, prefixes/suffixes)
2. String containment matching on normalized names
3. Exact insurance number matching
4. Boolean flags for name and insurance matches
5. Simple sorting prioritizing insurance matches

### Current Limitations

- **False Positives**: Common names match unrelated patients
- **Missing Context**: No birth date or biological sex validation
- **Weak Scoring**: Binary match/no-match without confidence levels
- **No Disambiguation**: Multiple matches with no ranking mechanism
- **Limited Fuzzy Matching**: Basic string containment insufficient for variations

## Enhanced Matching Strategy

### 1. Hybrid Privacy-Preserving Architecture

The enhanced matching system uses a **two-phase hybrid approach** that balances performance, accuracy, and privacy:

#### Phase 1: AI Workflow Integration with Basic Privacy

- **Hash-based matching** within the LangGraph workflow
- **Real-time processing** during document analysis
- **Basic privacy guarantees** using consistent hashing and phonetic matching
- **Fast path** for high-confidence matches (>80% confidence)

#### Phase 2: Advanced Privacy-Preserving Post-Processing

- **Cryptographic matching** for complex cases requiring manual review
- **Homomorphic encryption** and secure multi-party computation
- **Zero-knowledge proofs** for audit trails
- **Advanced privacy techniques** for sensitive scenarios

### 2. Multi-Tier Matching System

#### Tier 1: Exact Match (Confidence: 95-100%)

- Full name exact match + insurance number exact match + birth date match
- Full name exact match + insurance number exact match (when birth date unavailable)

#### Tier 2: Strong Match (Confidence: 80-95%)

- Normalized name match + insurance number match
- Full name exact match + birth date match + biological sex match

#### Tier 3: Probable Match (Confidence: 60-80%)

- Fuzzy name match + insurance number match
- Normalized name match + birth date match + biological sex match

#### Tier 4: Possible Match (Confidence: 40-60%)

- AI-powered semantic name matching + supporting data
- Fuzzy name match + birth date match

#### Tier 5: Weak Match (Confidence: 20-40%)

- Name similarity only (requires manual verification)

### 3. Privacy-Preserving Techniques

#### Hash-Based Matching (Phase 1)

```typescript
interface HashedProfile {
  // Basic hashing for AI workflow
  nameHash: string; // SHA-256 of normalized name
  phoneticHash: string; // Soundex hash for fuzzy matching
  dateRangeHashes: string[]; // Multiple hashes for ±1 year tolerance
  insuranceHash: string; // Hashed insurance number
  partialHashes: {
    // For partial matching
    firstNameHash: string;
    lastNameHash: string;
    dobYearHash: string;
    dobMonthHash: string;
  };
}
```

#### Advanced Cryptographic Matching (Phase 2)

```typescript
interface SecureMatchingService {
  // Homomorphic encryption for complex matching
  encryptProfile(profile: Profile): EncryptedProfile;
  computeSimilarity(
    encrypted1: EncryptedProfile,
    encrypted2: EncryptedProfile,
  ): number;

  // Zero-knowledge proofs for audit trails
  generateMatchingProof(match: MatchResult): ZKProof;
  verifyMatchingProof(proof: ZKProof): boolean;

  // Secure multi-party computation for sensitive cases
  performSecureMatching(
    patientData: SecureInput,
    profiles: SecureInput[],
  ): MatchScore[];
}
```

### 4. AI-Powered Matching Component

#### Implementation Strategy

```typescript
interface AIMatchingRequest {
  detectedProfile: DetectedProfileData;
  hashedProfiles: HashedProfile[]; // Privacy-preserving profiles
  matchingContext: {
    documentType: string;
    documentDate: string;
    confidence: number;
    privacyMode: "hash" | "encrypted" | "secure_mpc";
  };
}

interface AIMatchingResponse {
  matches: {
    profileHash: string; // Hashed profile identifier
    confidence: number;
    reasoning: string;
    riskFactors: string[];
    privacyGuarantees: string[];
  }[];
  recommendations: {
    action: "accept" | "review" | "advanced_matching";
    reasoning: string;
    requiresAdvancedPrivacy: boolean;
  };
}
```

#### Privacy-Preserving AI Matching Prompts

```typescript
const PRIVACY_ENHANCED_MATCHING_PROMPT = `
Analyze patient profiles for potential matches using privacy-preserving hashed data:

Detected Profile Hashes: {detectedProfileHashes}
Candidate Profile Hashes: {hashedProfiles}

PRIVACY INSTRUCTIONS:
- You are working with hashed data only
- Never attempt to reverse or guess original values
- Compare hash similarity scores only
- Consider phonetic hash matches for name variations

MATCHING FACTORS:
1. Exact hash matches (highest confidence)
2. Phonetic hash matches (fuzzy name matching)
3. Date range hash overlaps (birth date tolerance)
4. Partial hash combinations (first/last name components)
5. Insurance hash matches

CONFIDENCE SCORING:
- Multiple exact hash matches: 0.9-1.0
- Phonetic + partial matches: 0.7-0.9
- Single strong hash match: 0.5-0.7
- Weak hash similarities: 0.2-0.5
- No hash matches: 0.0-0.2

Return confidence scores and flag cases requiring advanced privacy-preserving matching.
`;
```

### 5. Enhanced Validation Rules

#### Exclusion Criteria (Automatic Rejection)

- **Birth Date Mismatch**: >1 year difference when both available
- **Biological Sex Conflict**: Different values when both specified
- **Insurance Provider Conflict**: Different providers with same number
- **Temporal Inconsistency**: Document dates don't align with patient age

#### Warning Flags (Requires Review)

- **Common Names**: Names appearing in >5% of patient database
- **Missing Critical Data**: No insurance number or birth date
- **Recent Duplicates**: Similar profiles created within 30 days
- **Geographical Inconsistency**: Insurance provider doesn't match region

### 6. Fuzzy Matching Algorithms

#### String Similarity Metrics

```typescript
interface FuzzyMatchingConfig {
  algorithms: {
    levenshtein: { weight: 0.3; threshold: 0.8 };
    jaro: { weight: 0.2; threshold: 0.85 };
    soundex: { weight: 0.2; threshold: 1.0 };
    metaphone: { weight: 0.3; threshold: 1.0 };
  };
  nameVariations: {
    nicknames: Map<string, string[]>;
    culturalVariations: Map<string, string[]>;
    commonTypos: Map<string, string[]>;
  };
}
```

#### Name Variation Detection

- **Nickname Resolution**: "Mike" → "Michael", "Bob" → "Robert"
- **Cultural Variations**: "János" → "John", "Müller" → "Miller"
- **Transposition Errors**: "Smtih" → "Smith"
- **Phonetic Matching**: Similar sounding names

### 7. LangGraph Workflow Integration

#### Integration Strategy

Based on the existing architecture analysis, the enhanced patient profile matching can be integrated directly into the LangGraph workflow as part of the `patient-processing` node. This allows for AI-powered matching during the document processing phase rather than as a separate client-side step.

#### Current Architecture Analysis

- **Patient Processing Node**: Priority 1 node using `$lib/configurations/patient.extraction`
- **Universal Node Factory**: Creates nodes dynamically from schema configurations
- **Multi-Node Orchestrator**: Orchestrates parallel execution of specialized nodes
- **State Management**: Comprehensive workflow state tracking with streaming updates

#### Enhanced Schema Integration

```typescript
// Enhanced patient extraction schema with profile matching
export const ENHANCED_PATIENT_EXTRACTION = {
  name: "extract_patient_with_matching",
  description: "Extract patient data and perform intelligent profile matching",
  parameters: {
    type: "object",
    properties: {
      patient: corePatient, // Existing patient schema
      profileMatching: {
        type: "object",
        properties: {
          existingProfileId: { type: "string" },
          matchingConfidence: { type: "number", minimum: 0, maximum: 1 },
          matchingMethod: {
            type: "string",
            enum: ["exact", "fuzzy", "ai_semantic", "manual"],
          },
          candidateProfiles: { type: "array" },
          requiresManualReview: { type: "boolean" },
          riskFlags: { type: "array" },
        },
      },
      // AI will receive existing profiles list as context
      profileMatchingContext: {
        type: "object",
        properties: {
          existingProfiles: { type: "array" },
          documentContext: { type: "object" },
        },
      },
    },
  },
};
```

#### Workflow Integration Points

Based on detailed analysis of the current LangGraph architecture, the profile matching integration requires modifications at multiple levels:

**1. API Request Enhancement**

```typescript
// File: src/routes/v1/import/report/stream/+server.ts
// Line: ~17 (after existing imports)
import {
  getUserProfiles,
  generateHashedProfiles,
} from "$lib/profiles/matching-utils";
import { AdvancedPrivacyMatchingService } from "$lib/profiles/advanced-matching";

export const POST: RequestHandler = async ({
  request,
  locals: { supabase, safeGetSession, user },
}) => {
  const { session } = await safeGetSession();
  const data = await request.json();

  // NEW: Fetch user's existing profiles and prepare privacy-preserving data
  const existingProfiles = await getUserProfiles(user.id);
  const hashedProfiles = await generateHashedProfiles(existingProfiles);

  // Enhanced workflow invocation with privacy-preserving profiles context
  const workflowResult = await runDocumentProcessingWorkflow(
    data.images,
    data.text,
    data.language,
    {
      useEnhancedSignals: true,
      enableProfileMatching: true, // NEW: Enable profile matching
      hashedProfiles: hashedProfiles, // NEW: Pass hashed profiles data
      privacyMode: "hash", // NEW: Privacy mode
      confidenceThreshold: 0.8,
    },
    sendEvent,
  );

  // NEW: Phase 2 - Advanced privacy-preserving matching for low confidence cases
  if (workflowResult.profileMatchingResults?.requiresAdvancedMatching) {
    const advancedMatchingService = new AdvancedPrivacyMatchingService();
    const advancedResults = await advancedMatchingService.performSecureMatching(
      workflowResult.profileMatchingResults.detectedProfile,
      existingProfiles,
      { privacyMode: "homomorphic_encryption" },
    );

    // Merge advanced results with workflow results
    workflowResult.profileMatchingResults = {
      ...workflowResult.profileMatchingResults,
      ...advancedResults,
      method: "hybrid_privacy_preserving",
    };
  }
};
```

**2. Workflow State Enhancement**

```typescript
// File: src/lib/langgraph/state.ts
// Line: ~149 (after existing interface fields)
export interface DocumentProcessingState {
  // Existing fields...

  // NEW: Privacy-preserving profile matching context
  profilesContext?: {
    hashedProfiles: HashedProfile[]; // Phase 1: Basic privacy
    encryptedProfiles?: EncryptedProfile[]; // Phase 2: Advanced privacy
    matchingEnabled: boolean;
    confidenceThreshold: number;
    privacyMode: "hash" | "encrypted" | "secure_mpc";
    userId: string;
  };

  // NEW: Profile matching results with privacy guarantees
  profileMatchingResults?: {
    detectedProfile: DetectedProfileData;
    matchedProfileHash?: string; // Hashed profile identifier
    confidence: number;
    method: "hash_based" | "encrypted" | "secure_mpc";
    candidateHashes: string[]; // Hashed candidate identifiers
    riskFlags: string[];
    requiresReview: boolean;
    privacyGuarantees: string[]; // Privacy techniques used
    requiresAdvancedMatching: boolean; // Trigger for Phase 2
  };
}
```

**3. Workflow Initialization Enhancement**

```typescript
// File: src/lib/langgraph/workflows/unified-workflow.ts
// Line: ~170 (in runUnifiedDocumentProcessingWorkflow function)
export async function runUnifiedDocumentProcessingWorkflow(
  images: any[],
  text: string,
  language: string,
  config: WorkflowConfig = {},
  progressCallback?: ProgressCallback,
): Promise<DocumentProcessingState> {
  // Create initial state with profile context
  const initialState: DocumentProcessingState = {
    images,
    text,
    language: language || "English",
    content: text ? [{ type: "text" as const, text }] : [],
    metadata: {},
    tokenUsage: { total: 0 },
    errors: [],
    progressCallback,

    // NEW: Initialize privacy-preserving profile matching context
    profilesContext: config.hashedProfiles
      ? {
          hashedProfiles: config.hashedProfiles,
          encryptedProfiles: config.encryptedProfiles,
          matchingEnabled: config.enableProfileMatching || false,
          confidenceThreshold: config.confidenceThreshold || 0.8,
          privacyMode: config.privacyMode || "hash",
          userId: config.userId,
        }
      : undefined,
  };

  // Execute workflow with enhanced state
  const result = await workflow.invoke(initialState);
  return result;
}
```

**4. Enhanced Patient Processing Node**

```typescript
// File: src/lib/langgraph/factories/universal-node-factory.ts
// Line: ~70 (in NODE_CONFIGURATIONS object)
"patient-processing": {
  nodeName: "patient-processing",
  description: "Patient extraction with intelligent profile matching",
  schemaPath: "$lib/configurations/patient.extraction.enhanced",
  triggers: ["isMedical"],
  priority: 1,
  customValidation: enhancedPatientValidation,
  outputMapping: {
    reportField: "patient",
    unwrapField: "patient",
  },
}

// NEW: Enhanced validation function
// File: src/lib/langgraph/factories/patient-validation.ts
import { ProfileMatchingService } from '$lib/profiles/matching-service';

export async function enhancedPatientValidation(
  aiResult: any,
  state: DocumentProcessingState
): Promise<ProcessingNodeResult> {
  const { patient } = aiResult;

  // Perform profile matching if context is available
  if (state.profilesContext?.matchingEnabled && state.profilesContext.hashedProfiles) {
    const matchingService = new ProfileMatchingService();
    const matchingResults = await matchingService.findMatches(
      patient,
      state.profilesContext.hashedProfiles,
      {
        confidenceThreshold: state.profilesContext.confidenceThreshold,
        documentContext: {
          documentType: state.featureDetectionResults?.documentType || "unknown",
          language: state.language || "en",
        }
      }
    );

    // Enhance patient data with matching results
    const enhancedPatient = {
      ...patient,
      profileMatching: {
        existingProfileId: matchingResults.bestMatch?.profileId,
        matchingConfidence: matchingResults.bestMatch?.confidence || 0,
        matchingMethod: matchingResults.bestMatch?.method || "none",
        candidateProfiles: matchingResults.alternatives || [],
        riskFlags: matchingResults.riskFlags || [],
        requiresManualReview: matchingResults.requiresReview || false,
        processingTimestamp: new Date().toISOString(),
      }
    };

    // Store matching results in state for later use
    state.profileMatchingResults = {
      detectedProfile: patient,
      matchedProfileHash: matchingResults.bestMatch?.profileHash,
      confidence: matchingResults.bestMatch?.confidence || 0,
      method: matchingResults.bestMatch?.method || "none",
      candidateHashes: matchingResults.alternatives?.map(alt => alt.profileHash) || [],
      riskFlags: matchingResults.riskFlags || [],
      requiresReview: matchingResults.requiresReview || false,
      privacyGuarantees: ['hash_based_matching', 'no_plaintext_exposure'],
      requiresAdvancedMatching: matchingResults.requiresAdvancedMatching || false,
    };

    return {
      data: { patient: enhancedPatient },
      metadata: {
        processingTime: Date.now(),
        confidence: matchingResults.bestMatch?.confidence || 0,
        provider: "enhanced-patient-matching",
      },
    };
  }

  // Fallback to standard processing
  return {
    data: aiResult,
    metadata: {
      processingTime: Date.now(),
      confidence: 0.5,
      provider: "standard-patient-extraction",
    },
  };
}
```

**5. Profile Data Retrieval and Hashing Functions**

```typescript
// NEW: Function to fetch user profiles for matching
// File: src/lib/profiles/matching-utils.ts
async function getUserProfiles(userId: string): Promise<Profile[]> {
  // Implementation depends on your profile storage
  // This could be Supabase, database, or file system

  try {
    // Example: Fetch from profiles store
    const { profiles } = await import("$lib/profiles");
    return profiles.get().filter((profile) => profile.userId === userId);
  } catch (error) {
    console.error("Failed to fetch user profiles:", error);
    return [];
  }
}

// NEW: Generate hashed profiles for privacy-preserving matching
// File: src/lib/profiles/hashing.ts
import { createHash } from "crypto";
import { normalizeName, removePrefixes } from "$lib/profiles/tools";

export async function generateHashedProfiles(
  profiles: Profile[],
): Promise<HashedProfile[]> {
  return profiles.map((profile) => ({
    profileId: createHash("sha256").update(profile.id).digest("hex"),
    nameHash: createHash("sha256")
      .update(normalizeName(profile.fullName))
      .digest("hex"),
    phoneticHash: generateSoundexHash(profile.fullName),
    dateRangeHashes: generateDateRangeHashes(profile.health?.birthDate),
    insuranceHash: profile.insurance?.number
      ? createHash("sha256").update(profile.insurance.number).digest("hex")
      : "",
    partialHashes: {
      firstNameHash: createHash("sha256")
        .update(profile.fullName.split(" ")[0].toLowerCase())
        .digest("hex"),
      lastNameHash: createHash("sha256")
        .update(profile.fullName.split(" ").pop()?.toLowerCase() || "")
        .digest("hex"),
      dobYearHash: profile.health?.birthDate
        ? createHash("sha256")
            .update(profile.health.birthDate.substring(0, 4))
            .digest("hex")
        : "",
      dobMonthHash: profile.health?.birthDate
        ? createHash("sha256")
            .update(profile.health.birthDate.substring(5, 7))
            .digest("hex")
        : "",
    },
  }));
}
```

**6. Enhanced AI Prompt Integration**

```typescript
// File: src/lib/configurations/patient.extraction.enhanced.ts
// This new file extends the existing patient.extraction.ts
import type { FunctionDefinition } from "@langchain/core/language_models/base";
import corePatient from "./core.patient";

export const ENHANCED_PATIENT_EXTRACTION_PROMPT = `
You are analyzing a medical document and need to extract patient information while performing intelligent profile matching.

EXISTING PROFILES FOR MATCHING:
{existingProfiles}

DOCUMENT CONTEXT:
- Document Type: {documentType}
- Language: {language}
- Processing Date: {processingDate}

PROFILE MATCHING INSTRUCTIONS:
1. Extract patient information from the document
2. Compare with existing profiles using multiple factors:
   - Exact name matches
   - Fuzzy name matching (nicknames, typos, cultural variations)
   - Insurance number matching
   - Birth date consistency
   - Biological sex alignment

3. Calculate confidence scores:
   - 0.95-1.0: Exact match (name + insurance + birth date)
   - 0.80-0.95: Strong match (name + insurance OR name + birth date + sex)
   - 0.60-0.80: Probable match (fuzzy name + supporting data)
   - 0.40-0.60: Possible match (AI semantic matching)
   - 0.20-0.40: Weak match (name similarity only)
   - 0.0-0.20: No match (create new profile)

4. Apply exclusion criteria (automatic rejection):
   - Birth date difference > 1 year when both available
   - Biological sex conflict when both specified
   - Insurance provider conflict with same number
   - Temporal inconsistency

5. Flag for manual review if:
   - Multiple high-confidence candidates exist
   - Common names without distinguishing data
   - Conflicting information detected
   - Confidence score between 0.4-0.8

Return the extracted patient data with profile matching results.
`;
```

#### Implementation Architecture

#### Core Components

```typescript
// File: src/lib/profiles/matching-service.ts
// Enhanced matching service integrated into LangGraph
export class ProfileMatchingService {
  private aiMatcher: AIMatchingService;
  private fuzzyMatcher: FuzzyMatchingService;
  private validationService: ValidationService;

  async findMatches(
    detected: DetectedProfileData,
    hashedProfiles: HashedProfile[],
  ): Promise<MatchResult[]> {
    const exactMatches = this.findExactMatches(detected, hashedProfiles);
    const fuzzyMatches = this.findFuzzyMatches(detected, hashedProfiles);
    const aiMatches = await this.aiMatcher.findMatches(
      detected,
      hashedProfiles,
    );

    return this.consolidateResults(exactMatches, fuzzyMatches, aiMatches);
  }

  // Integration with LangGraph workflow
  async processWithWorkflow(
    state: DocumentProcessingState,
  ): Promise<PatientWithMatching> {
    const hashedProfiles = state.profilesContext?.hashedProfiles || [];
    const matchingResults = await this.findMatches(
      state.extractedPatient,
      hashedProfiles,
    );

    return {
      patient: state.extractedPatient,
      profileMatching: {
        existingProfileId: matchingResults.bestMatch?.profileId,
        matchingConfidence: matchingResults.bestMatch?.confidence,
        candidateProfiles: matchingResults.alternatives,
        requiresManualReview: matchingResults.requiresReview,
        riskFlags: matchingResults.riskFlags,
      },
    };
  }
}
```

#### Confidence Scoring Algorithm

```typescript
function calculateConfidence(match: MatchCandidate): number {
  let score = 0;

  // Name matching (40% weight)
  score += match.nameScore * 0.4;

  // Insurance matching (30% weight)
  score += match.insuranceScore * 0.3;

  // Birth date matching (20% weight)
  score += match.birthDateScore * 0.2;

  // Biological sex matching (10% weight)
  score += match.biologicalSexScore * 0.1;

  // Apply penalties for risk factors
  score -= match.riskFactors.length * 0.05;

  return Math.max(0, Math.min(1, score));
}
```

### 8. User Interface Enhancements

#### Match Presentation

- **Confidence Indicators**: Visual confidence bars and risk warnings
- **Disambiguation Panel**: Side-by-side comparison of similar profiles
- **Merge Suggestions**: Highlight potential duplicate profiles
- **Review Queue**: Flagged matches requiring manual verification

#### Decision Support

- **Match Reasoning**: Explain why profiles matched or didn't match
- **Risk Assessment**: Highlight potential false positive indicators
- **Historical Context**: Show previous matching decisions for learning

### 9. Privacy and Security Considerations

#### Data Protection

- **Encrypted Comparisons**: All matching operations on encrypted data
- **Audit Trail**: Log all matching decisions and manual overrides
- **Access Controls**: Restrict matching capabilities to authorized users
- **Data Minimization**: Only process necessary fields for matching

#### GDPR Compliance

- **Consent Management**: Explicit consent for AI-powered matching
- **Right to Rectification**: Ability to correct false matches
- **Data Retention**: Automatic cleanup of temporary matching data

### 10. Performance Optimization

#### Indexing Strategy

```typescript
interface MatchingIndex {
  normalizedNames: Map<string, ProfileId[]>;
  insuranceNumbers: Map<string, ProfileId[]>;
  birthDates: Map<string, ProfileId[]>;
  soundexCodes: Map<string, ProfileId[]>;
}
```

#### Caching Layer

- **Recent Matches**: Cache frequently accessed profiles
- **AI Results**: Cache AI matching results for similar queries
- **Preprocessing**: Cache normalized and indexed data

### 11. Testing and Validation

#### Test Data Sets

- **Synthetic Profiles**: Generate test profiles with known relationships
- **Edge Cases**: Common names, missing data, conflicting information
- **Performance Tests**: Large dataset matching performance
- **Accuracy Benchmarks**: Measure false positive/negative rates

#### Validation Metrics

- **Precision**: True matches / (True matches + False matches)
- **Recall**: True matches / (True matches + Missed matches)
- **F1-Score**: Harmonic mean of precision and recall
- **Processing Time**: Average matching time per profile

### 12. Implementation Roadmap

#### Phase 1: Basic Privacy-Preserving LangGraph Integration (Weeks 1-2)

- **Hash Generation**: Implement `generateHashedProfiles()` function for privacy-preserving profile data
- **API Enhancement**: Modify `/v1/import/report/stream/+server.ts` to fetch and hash user profiles
- **State Enhancement**: Extend `DocumentProcessingState` to include privacy-preserving `profilesContext`
- **Workflow Config**: Update `WorkflowConfig` to support privacy mode and hashed profiles
- **Basic Hash Matching**: Implement hash-based matching within AI workflow for high-confidence cases

#### Phase 2: Patient Processing Node Enhancement with Privacy (Weeks 3-4)

- **Enhanced Schema**: Create `patient.extraction.enhanced.ts` with privacy-preserving profile matching
- **Node Configuration**: Update `universal-node-factory.ts` patient-processing node for hash-based matching
- **Custom Validation**: Implement `enhancedPatientValidation` with hash-based matching logic
- **Privacy-Preserving AI Prompts**: Develop prompts that work with hashed profile data
- **Confidence Routing**: Implement routing logic to trigger advanced matching for low-confidence cases

#### Phase 3: Advanced Privacy-Preserving Post-Processing (Weeks 5-6)

- **Homomorphic Encryption**: Implement `AdvancedPrivacyMatchingService` with homomorphic encryption
- **Secure Multi-Party Computation**: Add SMC capabilities for complex matching scenarios
- **Zero-Knowledge Proofs**: Implement ZK proofs for audit trails and compliance
- **Hybrid Matching Logic**: Create service that routes between hash-based and advanced matching
- **Privacy Guarantees**: Add privacy guarantee tracking and compliance reporting

#### Phase 4: Client-Side Integration & Advanced Features (Weeks 7-8)

- **Result Processing**: Update API response handling to include privacy-preserving matching results
- **SelectProfile Component**: Enhance `SelectProfile.svelte` to display confidence with privacy indicators
- **ImportProfile Component**: Update `ImportProfile.svelte` with privacy-preserving confidence indicators
- **Review Queue**: Create UI components for manual review with privacy guarantees
- **Analytics Dashboard**: Create admin analytics with privacy-preserving metrics
- **Comprehensive Testing**: Full integration testing including privacy guarantee validation

### Hybrid Privacy-Preserving Data Flow

```
Client Request → API Handler → Profile Retrieval & Hashing → Workflow Initialization
     ↓
Enhanced State (with hashed profiles) → LangGraph Execution → Patient Processing Node
     ↓
AI Extraction + Hash-Based Matching → Confidence Evaluation → Route Decision
     ↓                                        ↓
High Confidence (>80%)                  Low Confidence (<80%)
     ↓                                        ↓
Enhanced Patient Data              Advanced Privacy Matching
     ↓                                        ↓
Client Response                     Homomorphic/SMC/ZK Matching
     ↓                                        ↓
UI Components                      Enhanced Results → Client Response
     ↓                                        ↓
User Decision                      UI Components → User Decision
```

### Privacy-Preserving Architecture Layers

#### Layer 1: Basic Privacy (Hash-Based)

- **Implementation Files**:
  - `src/lib/profiles/hashing.ts` - Core hashing functions
  - `src/lib/profiles/matching-utils.ts` - Profile retrieval and hashing
- **Input**: Raw profile data
- **Processing**: SHA-256 hashing, phonetic hashing, partial hashing
- **Matching**: Hash comparison within AI workflow
- **Output**: Confidence scores with hashed identifiers
- **Privacy Guarantee**: No plaintext data exposed to AI

#### Layer 2: Advanced Privacy (Cryptographic)

- **Implementation Files**:
  - `src/lib/profiles/advanced-matching.ts` - Advanced cryptographic matching service
  - `src/lib/profiles/homomorphic-engine.ts` - Homomorphic encryption implementation
  - `src/lib/profiles/secure-mpc.ts` - Secure multi-party computation
- **Input**: Low-confidence cases from Layer 1
- **Processing**: Homomorphic encryption, secure multi-party computation
- **Matching**: Cryptographic similarity computation
- **Output**: Enhanced confidence scores with zero-knowledge proofs
- **Privacy Guarantee**: Cryptographic security with audit trails

#### Layer 3: Compliance & Audit

- **Implementation Files**:
  - `src/lib/profiles/audit-trail.ts` - Audit trail generation and storage
  - `src/lib/profiles/compliance-reporter.ts` - Privacy compliance reporting
  - `src/lib/profiles/zk-proofs.ts` - Zero-knowledge proof generation
- **Input**: All matching operations
- **Processing**: Privacy guarantee tracking, compliance monitoring
- **Matching**: Audit trail generation
- **Output**: Compliance reports and privacy certificates
- **Privacy Guarantee**: Regulatory compliance with mathematical proofs

### Key Integration Points with File References

1. **Request Level**: `src/routes/v1/import/report/stream/+server.ts`

   - Profiles fetched and hashed at API handler level
   - Integration with `getUserProfiles()` and `generateHashedProfiles()`

2. **State Level**: `src/lib/langgraph/state.ts`

   - Hashed profiles context maintained throughout workflow execution
   - Enhanced `DocumentProcessingState` interface

3. **Node Level**: `src/lib/langgraph/factories/universal-node-factory.ts`

   - Hash-based matching performed during patient processing node execution
   - Custom validation with `enhancedPatientValidation()`

4. **Routing Level**: `src/lib/langgraph/workflows/unified-workflow.ts`

   - Confidence-based routing to advanced privacy matching
   - Integration with `AdvancedPrivacyMatchingService`

5. **Response Level**: `src/routes/v1/import/report/stream/+server.ts`

   - Privacy-preserving matching results returned to client
   - Enhanced result processing for Phase 2 matching

6. **UI Level**: `src/components/import/SelectProfile.svelte`

   - Client components consume matching results with privacy indicators
   - Enhanced UI for confidence display and manual review

7. **Audit Level**: `src/lib/profiles/audit-trail.ts`
   - All operations logged with privacy guarantees
   - Zero-knowledge proofs for regulatory compliance

### 13. Success Metrics

#### Quantitative KPIs

- **Match Accuracy**: >95% precision, >90% recall
- **False Positive Rate**: <2% of all matches
- **Processing Time**: <500ms average matching time
- **User Satisfaction**: >90% approval rating

#### Qualitative Goals

- **Reduced Manual Review**: 80% fewer manual interventions
- **Improved Confidence**: Healthcare workers trust matching results
- **Better Patient Safety**: Eliminate dangerous false matches
- **Streamlined Workflow**: Faster patient record import process

### 14. Risk Mitigation

#### Technical Risks

- **AI Hallucination**: Implement multiple validation layers
- **Performance Degradation**: Optimize with indexing and caching
- **Data Quality Issues**: Robust error handling and validation

#### Operational Risks

- **User Resistance**: Comprehensive training and gradual rollout
- **Compliance Issues**: Regular audits and compliance monitoring
- **Integration Complexity**: Phased implementation with fallback options

## Conclusion

The enhanced patient profile matching system will significantly improve the accuracy and reliability of patient identification in the Mediqom platform. By integrating AI-powered matching directly into the LangGraph workflow, we can:

### Key Advantages of Hybrid Privacy-Preserving Integration

1. **Server-Side Processing**: Profile matching happens during document processing, reducing client-side complexity
2. **AI-Native Approach**: Leverages the same AI models used for medical analysis for consistent, context-aware matching
3. **Streaming Updates**: Real-time progress updates through existing workflow streaming infrastructure
4. **Comprehensive Context**: AI has access to full document context, not just extracted patient data
5. **Unified Architecture**: Seamless integration with existing medical processing pipeline
6. **Privacy-by-Design**: Strong privacy guarantees built into the architecture from the ground up
7. **Regulatory Compliance**: GDPR, HIPAA, and other healthcare privacy regulations supported

### Technical Benefits

- **Reduced Latency**: Matching happens in parallel with other document processing
- **Better Accuracy**: AI can consider document context and medical terminology
- **Scalability**: Leverages existing LangGraph infrastructure and scaling capabilities
- **Maintainability**: Single codebase for all AI-powered medical processing
- **Privacy Guarantees**: Mathematical privacy proofs for regulatory compliance
- **Audit Trails**: Complete cryptographic audit trails for all matching operations
- **Flexible Privacy**: Can adjust privacy levels based on sensitivity and regulatory requirements

### Implementation Strategy

The proposed hybrid approach transforms profile matching from a separate client-side step to an integrated part of the AI-powered document processing workflow with strong privacy guarantees. This allows for:

- **Intelligent Matching**: AI can understand name variations, medical context, and cultural considerations
- **Privacy-Preserving Operations**: All matching operations maintain patient privacy through cryptographic techniques
- **Risk Assessment**: Automatic flagging of potential false positives based on comprehensive criteria
- **Confidence Scoring**: Transparent scoring system for healthcare worker decision-making
- **Seamless UX**: Results are immediately available when document processing completes
- **Regulatory Compliance**: Built-in compliance with healthcare privacy regulations
- **Audit Ready**: Complete audit trails for regulatory inspections

The multi-tiered hybrid approach ensures that high-confidence matches are processed automatically with basic privacy guarantees, while uncertain cases trigger advanced cryptographic matching techniques. This improves both efficiency and patient safety while maintaining the strongest possible privacy and security requirements for healthcare applications.
