# AI Document Import - User Configuration System

> **Navigation**: [← Cross References](./AI_IMPORT_10_CROSS_REFERENCES.md) | [README](./AI_IMPORT_README.md) | [Default Configuration](./AI_IMPORT_DEFAULT_CONFIGURATION.md)

This document defines the comprehensive user configuration system that provides personalized settings for the entire AI document import workflow, from language preferences to regional medical database selection.

## Configuration System Overview

The AI document import workflow uses a **two-layer configuration system**:

1. **[System Defaults](./AI_IMPORT_DEFAULT_CONFIGURATION.md)** - Base application settings that work out-of-the-box
2. **User Configuration** (this document) - Personalized overrides and preferences

```typescript
// Configuration resolution
const resolvedConfig = ConfigurationResolver.resolve(
  SYSTEM_DEFAULTS, // Base application settings
  userConfiguration, // User's personal preferences (this document)
  userRegion, // Optional regional defaults
);
```

**Key Principles**:

- **User overrides are optional** - System defaults provide complete functionality
- **Granular control** - Users can override any specific setting
- **Regional intelligence** - Regional defaults optimize for local medical systems
- **Validation** - Configuration is validated for consistency and safety

## Central User Configuration Object

### Core User Configuration Interface

```typescript
// src/lib/workflows/user-config/user-configuration.interface.ts
export interface UserConfiguration {
  // User Identity & Context
  userId: string;
  sessionId?: string;
  organizationId?: string;

  // Regional & Language Settings
  regional: RegionalConfiguration;

  // Medical Context
  medical: MedicalConfiguration;

  // AI Processing Preferences
  aiPreferences: AIProcessingPreferences;

  // Quality & Compliance Settings
  quality: QualityConfiguration;

  // External Tools Configuration
  externalTools: ExternalToolsConfiguration;

  // Security & Privacy
  security: SecurityConfiguration;

  // Feature Flags & Experiments
  features: FeatureConfiguration;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface RegionalConfiguration {
  // Primary region determines database priority and compliance requirements
  primaryRegion: RegionCode;

  // Language preferences with fallbacks
  language: LanguageConfiguration;

  // Timezone for date/time processing
  timezone: string;

  // Healthcare system context
  healthcareSystem: HealthcareSystemCode;

  // Regulatory compliance requirements
  complianceRequirements: ComplianceCode[];
}

export interface LanguageConfiguration {
  // Primary language for AI outputs and UI
  primary: LanguageCode;

  // Fallback languages in order of preference
  fallbacks: LanguageCode[];

  // Document detection preferences
  autoDetect: boolean;

  // Language-specific processing settings
  processingSettings: {
    [key in LanguageCode]?: {
      confidence: number;
      useNativeModels: boolean;
      translationRequired: boolean;
    };
  };
}

export interface MedicalConfiguration {
  // Primary medical databases by category
  databases: MedicalDatabasePreferences;

  // Patient context for validation
  patientContext?: PatientContext;

  // Medical specialty focus areas
  specialties: MedicalSpecialty[];

  // Preferred medical coding systems
  codingSystems: MedicalCodingPreferences;
}

export interface AIProcessingPreferences {
  // Cost vs. accuracy trade-offs
  optimizationStrategy: "cost" | "accuracy" | "speed" | "balanced";

  // Provider selection preferences
  providerPreferences: ProviderPreferences;

  // Processing mode preferences
  processingMode: ProcessingMode;

  // Budget constraints
  budget: BudgetConfiguration;
}

export interface QualityConfiguration {
  // Confidence thresholds for different data types
  confidenceThresholds: ConfidenceThresholds;

  // Human review requirements
  humanReview: HumanReviewConfiguration;

  // Validation requirements
  validation: ValidationConfiguration;
}

export interface ExternalToolsConfiguration {
  // 3rd party medical app preferences
  medicalApps: MedicalAppPreferences;

  // Database access credentials and preferences
  databaseAccess: DatabaseAccessConfiguration;

  // API rate limiting preferences
  rateLimiting: RateLimitingPreferences;
}

export interface SecurityConfiguration {
  // Data encryption preferences
  encryption: EncryptionConfiguration;

  // Data retention policies
  retention: RetentionConfiguration;

  // Audit requirements
  audit: AuditConfiguration;

  // Privacy preferences
  privacy: PrivacyConfiguration;
}
```

## Detailed Configuration Definitions

### Regional & Language Settings

```typescript
// Region and language type definitions
export type RegionCode = "CZ" | "US" | "DE" | "FR" | "GB" | "EU" | "GLOBAL";
export type LanguageCode = "en" | "cs" | "de" | "fr" | "es" | "it" | "pl";
export type HealthcareSystemCode =
  | "CZ_HEALTHCARE"
  | "US_HEALTHCARE"
  | "EU_HEALTHCARE"
  | "NHS"
  | "GLOBAL";
export type ComplianceCode =
  | "GDPR"
  | "HIPAA"
  | "EU_MDR"
  | "FDA_CFR"
  | "CZECH_HEALTHCARE_LAW";

export interface MedicalDatabasePreferences {
  // Medication databases by region
  medication: {
    primary: MedicationDatabaseCode;
    fallbacks: MedicationDatabaseCode[];
    crossReference: boolean;
  };

  // Medical coding databases
  coding: {
    primaryICD: "ICD10" | "ICD11";
    primarySNOMED: "SNOMED_INTL" | "SNOMED_US" | "SNOMED_UK";
    mappingServices: MappingServiceCode[];
  };

  // Lab reference databases
  laboratory: {
    referenceRanges: LabDatabaseCode;
    demographicAdjustment: boolean;
  };
}

export type MedicationDatabaseCode =
  | "SUKL"
  | "FDA_ORANGE_BOOK"
  | "EMA"
  | "PHARMNET_BUND"
  | "DRUGBANK"
  | "MEDISPAN"
  | "RXNORM";
export type MappingServiceCode = "VSAC" | "BIOPORTAL" | "UMLS" | "WHO_MAPPINGS";
export type LabDatabaseCode =
  | "ARUP"
  | "QUEST"
  | "LABCORP"
  | "EU_LAB_STANDARDS"
  | "CZECH_LAB_STANDARDS";

export interface PatientContext {
  // Demographics for lab validation
  age?: number;
  sex?: "M" | "F" | "O";

  // Regional context for medical standards
  countryOfCare: RegionCode;

  // Relevant medical history for interaction checking
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
}
```

### AI Processing Configuration

```typescript
export interface ProviderPreferences {
  // Provider ranking by use case
  vision: AIProviderCode[];
  textProcessing: AIProviderCode[];
  structuredExtraction: AIProviderCode[];

  // Cost constraints
  maxCostPerDocument: number;

  // Performance requirements
  maxProcessingTime: number; // milliseconds

  // Fallback behavior
  fallbackStrategy: "aggressive" | "conservative" | "cost_optimized";
}

export type AIProviderCode =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "azure_openai";
export type ProcessingMode = "standard" | "fast" | "thorough" | "debug";

export interface BudgetConfiguration {
  // Monthly budget limits
  monthlyLimit: number;

  // Per-document limits
  maxCostPerDocument: number;

  // Alert thresholds
  alertThresholds: {
    warning: number; // 80% of budget
    critical: number; // 95% of budget
  };

  // Budget allocation by feature
  allocation: {
    basicProcessing: number; // percentage
    externalValidation: number; // percentage
    thirdPartyApps: number; // percentage
  };
}

export interface ConfidenceThresholds {
  // Minimum confidence for auto-acceptance
  autoAccept: {
    medication: number;
    diagnosis: number;
    labValues: number;
    patientInfo: number;
    generalData: number;
  };

  // Confidence for human review requirement
  humanReview: {
    medication: number;
    diagnosis: number;
    labValues: number;
    patientInfo: number;
    generalData: number;
  };

  // Confidence for rejection
  autoReject: {
    medication: number;
    diagnosis: number;
    labValues: number;
    patientInfo: number;
    generalData: number;
  };
}
```

### External Tools Configuration

```typescript
export interface MedicalAppPreferences {
  // Enabled 3rd party applications
  enabledApps: MedicalAppCode[];

  // Auto-trigger settings
  autoTrigger: {
    [key in MedicalAppCode]?: {
      enabled: boolean;
      conditions: TriggerCondition[];
      maxCost: number;
    };
  };

  // Credit allocation
  creditLimits: {
    [key in MedicalAppCode]?: number;
  };

  // Result preferences
  resultPreferences: {
    includeRawData: boolean;
    includeVisualization: boolean;
    confidenceThreshold: number;
  };
}

export type MedicalAppCode =
  | "MEDICAL_TERMINOLOGY_VALIDATOR"
  | "DRUG_INTERACTION_CHECKER"
  | "LAB_RESULT_INTERPRETER"
  | "DICOM_ANALYZER";

export interface DatabaseAccessConfiguration {
  // API credentials management
  credentials: {
    [key: string]: {
      apiKey?: string;
      oauth?: {
        clientId: string;
        scope: string[];
      };
      rateLimit?: number;
    };
  };

  // Cache preferences
  caching: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number; // MB
  };

  // Timeout settings
  timeouts: {
    default: number; // milliseconds
    critical: number; // for essential validations
    optional: number; // for enhancement features
  };
}
```

## Configuration Management System

### Configuration Factory

```typescript
// src/lib/workflows/user-config/configuration-factory.ts
export class UserConfigurationFactory {
  static createDefault(userId: string): UserConfiguration {
    return {
      userId,
      regional: this.getDefaultRegionalConfig(),
      medical: this.getDefaultMedicalConfig(),
      aiPreferences: this.getDefaultAIPreferences(),
      quality: this.getDefaultQualityConfig(),
      externalTools: this.getDefaultExternalToolsConfig(),
      security: this.getDefaultSecurityConfig(),
      features: this.getDefaultFeatureConfig(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: "1.0.0",
    };
  }

  static forRegion(userId: string, region: RegionCode): UserConfiguration {
    const config = this.createDefault(userId);

    switch (region) {
      case "CZ":
        return this.applyCzechDefaults(config);
      case "US":
        return this.applyUSDefaults(config);
      case "DE":
        return this.applyGermanDefaults(config);
      case "EU":
        return this.applyEUDefaults(config);
      default:
        return config;
    }
  }

  private static applyCzechDefaults(
    config: UserConfiguration,
  ): UserConfiguration {
    return {
      ...config,
      regional: {
        primaryRegion: "CZ",
        language: {
          primary: "cs",
          fallbacks: ["en"],
          autoDetect: true,
          processingSettings: {
            cs: {
              confidence: 0.95,
              useNativeModels: true,
              translationRequired: false,
            },
            en: {
              confidence: 0.85,
              useNativeModels: false,
              translationRequired: false,
            },
          },
        },
        timezone: "Europe/Prague",
        healthcareSystem: "CZ_HEALTHCARE",
        complianceRequirements: ["GDPR", "EU_MDR", "CZECH_HEALTHCARE_LAW"],
      },
      medical: {
        ...config.medical,
        databases: {
          medication: {
            primary: "SUKL",
            fallbacks: ["EMA", "DRUGBANK"],
            crossReference: true,
          },
          coding: {
            primaryICD: "ICD10",
            primarySNOMED: "SNOMED_INTL",
            mappingServices: ["UMLS", "WHO_MAPPINGS"],
          },
          laboratory: {
            referenceRanges: "CZECH_LAB_STANDARDS",
            demographicAdjustment: true,
          },
        },
      },
    };
  }

  private static applyUSDefaults(config: UserConfiguration): UserConfiguration {
    return {
      ...config,
      regional: {
        primaryRegion: "US",
        language: {
          primary: "en",
          fallbacks: ["es"],
          autoDetect: true,
          processingSettings: {
            en: {
              confidence: 0.95,
              useNativeModels: true,
              translationRequired: false,
            },
            es: {
              confidence: 0.85,
              useNativeModels: false,
              translationRequired: false,
            },
          },
        },
        timezone: "America/New_York",
        healthcareSystem: "US_HEALTHCARE",
        complianceRequirements: ["HIPAA", "FDA_CFR"],
      },
      medical: {
        ...config.medical,
        databases: {
          medication: {
            primary: "FDA_ORANGE_BOOK",
            fallbacks: ["RXNORM", "DRUGBANK"],
            crossReference: true,
          },
          coding: {
            primaryICD: "ICD10",
            primarySNOMED: "SNOMED_US",
            mappingServices: ["VSAC", "UMLS"],
          },
          laboratory: {
            referenceRanges: "ARUP",
            demographicAdjustment: true,
          },
        },
      },
    };
  }
}
```

## Integration with Workflow State

### Enhanced Document Processing State

```typescript
// src/lib/workflows/document-import/enhanced-state.interface.ts
export interface EnhancedDocumentProcessingState
  extends DocumentProcessingState {
  // User configuration drives all processing decisions and output language
  userConfig: UserConfiguration;

  // Document source metadata (input analysis, not output driver)
  documentMetadata: {
    detectedLanguage?: LanguageCode;
    originalLanguage?: LanguageCode;
    languageConfidence: number;
    detectedRegion?: RegionCode;
    processingHints: {
      requiresTranslation: boolean;
      suggestedProcessingLanguage: LanguageCode;
      complexityLevel: "simple" | "medical" | "technical";
    };
  };

  // Content in multiple forms for processing flexibility
  content: {
    original: Content[]; // Always preserved in source language
    userLanguage: Content[]; // Translated to user's preferred language if needed
    processingOptimized: Content[]; // Optimized for AI processing (may be in English for better model performance)
  };

  // Derived configuration for quick access (all driven by userConfig)
  derivedConfig: {
    outputLanguage: LanguageCode; // Always userConfig.regional.language.primary
    processingLanguage: LanguageCode; // Best language for AI processing
    activeDatabases: MedicalDatabasePreferences;
    activeProviders: ProviderPreferences;
    activeThresholds: ConfidenceThresholds;
    complianceFlags: ComplianceCode[];
  };

  // Configuration-driven processing metadata
  processingMetadata: {
    configVersion: string;
    appliedOverrides: ConfigurationOverride[];
    languageProcessingStrategy: LanguageProcessingStrategy;
  };
}

export interface LanguageProcessingStrategy {
  // How we handle language during processing
  strategy: "native" | "translate_to_english" | "multilingual" | "user_native";

  // Language used for AI model processing
  aiProcessingLanguage: LanguageCode;

  // Language for final outputs (always user preference)
  outputLanguage: LanguageCode;

  // Whether translation was required
  translationRequired: boolean;

  // Translation confidence if applied
  translationConfidence?: number;
}

export interface ConfigurationOverride {
  field: string;
  originalValue: any;
  overrideValue: any;
  reason:
    | "document_detection"
    | "user_preference"
    | "compliance_requirement"
    | "fallback";
  timestamp: Date;
}
```

## Configuration Touch Points in Workflow

### Updated LangGraph Workflow Integration

```typescript
// src/lib/workflows/document-import/enhanced-workflow.ts
export const enhancedDocumentImportWorkflow =
  new StateGraph<EnhancedDocumentProcessingState>({
    channels: {
      // Input data (original structure preserved)
      images: { value: [] },
      text: { value: null },

      // User configuration drives all processing decisions
      userConfig: { value: null },

      // Document source metadata (input analysis, not output driver)
      documentMetadata: {
        value: {
          languageConfidence: 0,
          processingHints: {
            requiresTranslation: false,
            suggestedProcessingLanguage: "en" as LanguageCode,
            complexityLevel: "simple" as const,
          },
        },
      },

      // Content in multiple language forms
      content: {
        value: {
          original: [],
          userLanguage: [],
          processingOptimized: [],
        },
      },

      // Derived configuration (all driven by userConfig)
      derivedConfig: {
        value: {
          outputLanguage: "en" as LanguageCode,
          processingLanguage: "en" as LanguageCode,
          activeDatabases: null,
          activeProviders: null,
          activeThresholds: null,
          complianceFlags: [],
        },
      },

      // Processing metadata and tracking
      processingMetadata: {
        value: {
          configVersion: "1.0.0",
          appliedOverrides: [],
          languageProcessingStrategy: {
            strategy: "native" as const,
            aiProcessingLanguage: "en" as LanguageCode,
            outputLanguage: "en" as LanguageCode,
            translationRequired: false,
          },
        },
      },

      // Enhanced compliance and quality tracking
      regionalCompliance: { value: [] },
      qualityGates: { value: null },

      // Standard processing state (updated with user language context)
      isMedical: { value: false },
      documentType: { value: null },
      tags: { value: [] },
      hasLabOrVitals: { value: false },
      hasPrescription: { value: false },
      hasImmunization: { value: false },

      // Extracted data (always in user's preferred language)
      prescriptions: { value: null },
      immunizations: { value: null },
      report: { value: null },
      structuredData: { value: null },

      // Processing tracking
      tokenUsage: { value: { total: 0 } },
      errors: { value: [] },
      providerChoices: { value: [] },
      debugMode: { value: false },
    },
  });

// Enhanced input validator with proper language separation
export const enhancedInputValidator = traceNode("enhanced_input_validator")(
  async (
    state: EnhancedDocumentProcessingState,
  ): Promise<Partial<EnhancedDocumentProcessingState>> => {
    const { userConfig, text, images } = state;

    // Step 1: Detect document source language (metadata only)
    const detectedLanguage = await detectDocumentLanguage(text, images);
    const detectedRegion = await detectDocumentRegion(text, images);

    // Step 2: Determine language processing strategy
    const userLanguage = userConfig.regional.language.primary;
    const languageStrategy = determineLanguageStrategy(
      detectedLanguage,
      userLanguage,
      userConfig,
    );

    // Step 3: Prepare content in multiple forms
    const originalContent = getContentDefinition({ text, images });
    let userLanguageContent = originalContent;
    let processingOptimizedContent = originalContent;

    // Translate to user language if needed and different from source
    if (languageStrategy.translationRequired) {
      userLanguageContent = await translateContent(
        originalContent,
        detectedLanguage,
        userLanguage,
      );
    }

    // Optimize for AI processing (may use English for better model performance)
    if (languageStrategy.aiProcessingLanguage !== detectedLanguage) {
      processingOptimizedContent = await translateContent(
        originalContent,
        detectedLanguage,
        languageStrategy.aiProcessingLanguage,
      );
    }

    // Step 4: Build document metadata (source information)
    const documentMetadata = {
      detectedLanguage,
      originalLanguage: detectedLanguage,
      languageConfidence: 0.95, // From detection
      detectedRegion,
      processingHints: {
        requiresTranslation: languageStrategy.translationRequired,
        suggestedProcessingLanguage: languageStrategy.aiProcessingLanguage,
        complexityLevel: assessDocumentComplexity(text) as
          | "simple"
          | "medical"
          | "technical",
      },
    };

    // Step 5: Build derived configuration (driven by user preferences)
    const derivedConfig = {
      outputLanguage: userLanguage, // Always user preference
      processingLanguage: languageStrategy.aiProcessingLanguage,
      activeDatabases: userConfig.medical.databases,
      activeProviders: userConfig.aiPreferences.providerPreferences,
      activeThresholds: userConfig.quality.confidenceThresholds,
      complianceFlags: userConfig.regional.complianceRequirements,
    };

    // Step 6: Track processing metadata
    const processingMetadata = {
      configVersion: userConfig.version,
      appliedOverrides: [], // No overrides - user config drives everything
      languageProcessingStrategy: languageStrategy,
    };

    return {
      documentMetadata,
      content: {
        original: originalContent,
        userLanguage: userLanguageContent,
        processingOptimized: processingOptimizedContent,
      },
      derivedConfig,
      processingMetadata,
      // Validate configuration compliance
      regionalCompliance: validateRegionalCompliance(
        userConfig,
        documentMetadata,
      ),
    };
  },
);

// Helper function to determine optimal language processing strategy
function determineLanguageStrategy(
  documentLang: LanguageCode,
  userLang: LanguageCode,
  userConfig: UserConfiguration,
): LanguageProcessingStrategy {
  const requiresTranslation = documentLang !== userLang;

  // Check if user has specific processing preferences for this language
  const langSettings =
    userConfig.regional.language.processingSettings[documentLang];

  // Determine best language for AI processing
  let aiProcessingLanguage: LanguageCode;
  if (langSettings?.useNativeModels && langSettings.confidence > 0.9) {
    // Use native language models if available and confident
    aiProcessingLanguage = documentLang;
  } else if (documentLang === "en" || userLang === "en") {
    // Use English for best model performance
    aiProcessingLanguage = "en";
  } else {
    // Use user's language as fallback
    aiProcessingLanguage = userLang;
  }

  return {
    strategy: requiresTranslation ? "translate_to_user" : "native",
    aiProcessingLanguage,
    outputLanguage: userLang, // Always user preference
    translationRequired: requiresTranslation,
    translationConfidence: requiresTranslation ? 0.85 : 1.0,
  };
}
```

## Configuration Usage Examples

### Medical Validation with User Configuration

```typescript
// Example: User-configured medication validation with proper language handling
const userConfiguredMedicationValidator = traceNode(
  "user_configured_medication_validator",
)(async (
  state: EnhancedDocumentProcessingState,
): Promise<Partial<EnhancedDocumentProcessingState>> => {
  const {
    prescriptions,
    derivedConfig,
    userConfig,
    content,
    documentMetadata,
  } = state;

  if (!prescriptions?.length) return { prescriptions };

  // Use user's configured primary medication database (e.g., SÚKL for Czech users)
  const primaryDB = derivedConfig.activeDatabases.medication.primary;
  const fallbackDBs = derivedConfig.activeDatabases.medication.fallbacks;

  // Get patient context from user configuration
  const patientContext = userConfig.medical.patientContext;

  // Use user's preferred output language (not document language)
  const outputLanguage = derivedConfig.outputLanguage;

  // Use optimized processing language for API calls
  const apiLanguage = derivedConfig.processingLanguage;

  // Create validation service with user preferences
  const validationService = new ConfigurableMedicalValidationService({
    primaryDatabase: primaryDB,
    fallbackDatabases: fallbackDBs,
    apiLanguage, // Language for API calls (may be English for better results)
    outputLanguage, // Language for final results (always user preference)
    region: userConfig.regional.primaryRegion,
    patientContext,
    documentContext: {
      originalLanguage: documentMetadata.originalLanguage,
      translationApplied: documentMetadata.processingHints.requiresTranslation,
    },
  });

  // Validate medications using configuration-driven thresholds
  const validatedPrescriptions = await validationService.validateMedications(
    prescriptions,
    {
      confidenceThreshold: derivedConfig.activeThresholds.medication,
      crossReference: derivedConfig.activeDatabases.medication.crossReference,
      complianceRequirements: derivedConfig.complianceFlags,
      outputLanguage: outputLanguage, // Ensure results are in user's language
      includeOriginalLanguageRef: true, // Keep reference to original terms
    },
  );

  // Results are always in user's preferred language
  return {
    prescriptions: validatedPrescriptions.map((prescription) => ({
      ...prescription,
      // Medication data in user's language
      medication: prescription.medication, // Already translated by validation service
      dosage: prescription.dosage,

      // Preserve original document terms for reference
      originalTerms: {
        medication: prescription.originalMedication,
        language: documentMetadata.originalLanguage,
      },

      // Validation metadata respects user configuration
      validation: {
        ...prescription.validation,
        validatedIn: apiLanguage,
        resultLanguage: outputLanguage,
        databaseUsed: primaryDB,
        region: userConfig.regional.primaryRegion,
      },
    })),
  };
});

// Example: Schema localization based on user configuration
const configurationDrivenSchemaProvider = {
  getLocalizedSchema(
    schemaType: string,
    userConfig: UserConfiguration,
  ): FunctionDefinition {
    // Always use user's preferred output language for schemas
    const targetLanguage = userConfig.regional.language.primary;

    // Get base schema
    const baseSchema = schemas[schemaType];

    // Localize schema descriptions and prompts to user's language
    const localizedSchema = this.localizeSchema(baseSchema, targetLanguage);

    // Add user-specific instructions based on regional preferences
    if (userConfig.regional.primaryRegion === "CZ") {
      localizedSchema.instructions = `Extract data according to Czech medical standards. ${localizedSchema.instructions}`;
    } else if (userConfig.regional.primaryRegion === "US") {
      localizedSchema.instructions = `Extract data according to US medical standards. ${localizedSchema.instructions}`;
    }

    return localizedSchema;
  },

  localizeSchema(schema: any, language: LanguageCode): any {
    // Deep clone and translate all description fields
    const localized = JSON.parse(JSON.stringify(schema));
    return this.translateSchemaFields(localized, language);
  },
};
```

## Migration Strategy

### Phase 1: Core Configuration (Week 1)

- Implement `UserConfiguration` interface and factory
- Create default configurations for major regions (CZ, US, EU)
- Update workflow state to include user configuration

### Phase 2: Workflow Integration (Week 2)

- Enhance all workflow nodes to use user configuration
- Implement configuration-driven provider selection
- Add dynamic language processing

### Phase 3: External Tools Integration (Week 3)

- Update MCP server to use regional database preferences
- Implement configuration-driven medical validation
- Add compliance requirement checking

### Phase 4: Quality & Monitoring (Week 4)

- Implement configuration-based quality gates
- Add configuration override tracking
- Create configuration validation and monitoring

---

This user configuration system provides a comprehensive, extensible foundation for personalizing the entire AI document import workflow while maintaining clear separation of concerns and enabling easy regional customization.
