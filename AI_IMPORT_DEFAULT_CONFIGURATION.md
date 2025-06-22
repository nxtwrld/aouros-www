# AI Document Import - Default Configuration System

> **Navigation**: [← User Configuration](./AI_IMPORT_USER_CONFIGURATION.md) | [README](./AI_IMPORT_README.md)

This document defines the comprehensive default configuration system that provides base settings for the AI document import workflow. The configuration consists of two layers: **System Defaults** (application baseline) and **User Overrides** (personalizable settings).

## Configuration Architecture

### Two-Layer System

```typescript
// src/lib/workflows/config/configuration.interface.ts
export interface WorkflowConfiguration {
  // System defaults - base application settings
  system: SystemConfiguration;
  
  // User overrides - personalizable settings (can be null for defaults)
  user: Partial<UserConfiguration> | null;
}

// Merged configuration used throughout the workflow
export interface ResolvedConfiguration {
  // Resolved from system + user overrides
  models: WorkflowModelConfiguration;
  regional: RegionalConfiguration;
  medical: MedicalConfiguration;
  quality: QualityConfiguration;
  externalTools: ExternalToolsConfiguration;
  processing: ProcessingConfiguration;
  monitoring: MonitoringConfiguration;
}
```

## System Default Configuration

### Core System Defaults

```typescript
// src/lib/workflows/config/system-defaults.ts
export const SYSTEM_DEFAULTS: SystemConfiguration = {
  
  // Application metadata
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'production',
  
  // Processing limits and timeouts
  processing: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxProcessingTime: 300000, // 5 minutes total
    maxConcurrentRequests: 10,
    supportedFormats: ['pdf', 'jpg', 'jpeg', 'png', 'dicom', 'doc', 'docx'],
    
    // Retry settings
    defaultRetryAttempts: 2,
    retryDelay: 1000, // 1 second
    exponentialBackoff: true,
    
    // Memory and performance
    maxMemoryUsage: 2048, // 2GB
    gcThreshold: 0.8, // Trigger GC at 80% memory
  },
  
  // Regional and language defaults
  regional: {
    defaultRegion: 'GLOBAL',
    defaultLanguage: 'en',
    autoDetectLanguage: true,
    autoDetectRegion: true,
    
    // Language processing settings
    translationEnabled: true,
    maxTranslationLength: 50000, // characters
    translationCacheEnabled: true,
    translationCacheTTL: 86400, // 24 hours
  },
  
  // Medical processing defaults
  medical: {
    // Default database priorities (can be overridden by region/user)
    defaultDatabases: {
      medication: ['DRUGBANK', 'RXNORM'], // Global fallbacks
      coding: ['SNOMED_INTL', 'ICD10'],
      laboratory: ['GLOBAL_LAB_STANDARDS']
    },
    
    // Patient context defaults
    requirePatientContext: false,
    allowAnonymousProcessing: true,
    
    // Medical validation settings
    enableCrossReferencing: true,
    validateMedicalCodes: true,
    checkDrugInteractions: true,
    
    // External medical database timeouts
    externalValidationTimeout: 30000, // 30 seconds
    maxExternalValidationAttempts: 3,
  },
  
  // Quality and confidence defaults
  quality: {
    // Default confidence thresholds (conservative but functional)
    defaultThresholds: {
      autoAccept: {
        medication: 0.85,
        diagnosis: 0.80,
        labValues: 0.75,
        patientInfo: 0.80,
        generalData: 0.75
      },
      humanReview: {
        medication: 0.70,
        diagnosis: 0.65,
        labValues: 0.60,
        patientInfo: 0.65,
        generalData: 0.60
      },
      autoReject: {
        medication: 0.50,
        diagnosis: 0.45,
        labValues: 0.40,
        patientInfo: 0.45,
        generalData: 0.40
      }
    },
    
    // Quality control settings
    enableQualityGates: true,
    requireMinimumConfidence: true,
    enableConsensusValidation: false, // Disabled by default (can be expensive)
    consensusThreshold: 0.8,
    
    // Error handling
    continueOnLowConfidence: true,
    markLowConfidenceData: true,
  },
  
  // External tools and integrations
  externalTools: {
    // MCP server settings
    mcpEnabled: true,
    mcpTimeout: 30000,
    mcpRetryAttempts: 2,
    
    // External database caching
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
    cacheMaxSize: 10000, // entries
    
    // Rate limiting (system-wide)
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 60,
      burstLimit: 10,
      windowSizeMs: 60000
    }
  },
  
  // Monitoring and observability
  monitoring: {
    tracingEnabled: true,
    metricsEnabled: true,
    detailedLogging: false, // Can be verbose
    
    // Performance monitoring
    trackTokenUsage: true,
    trackProcessingTime: true,
    trackAccuracy: true,
    
    // Error reporting
    reportErrors: true,
    reportWarnings: false,
    
    // Audit trail
    auditTrailEnabled: true,
    auditRetentionDays: 90,
  }
};
```

## Workflow Model Configuration

### Step-by-Step Model Defaults

```typescript
// src/lib/workflows/config/model-defaults.ts
export const DEFAULT_WORKFLOW_MODELS: WorkflowModelConfiguration = {
  
  // Step 1: Document Classification & Feature Detection
  documentClassification: {
    primary: {
      provider: 'openai',
      model: 'gpt-4o-mini', // Cost-effective for classification
      parameters: {
        temperature: 0.1,
        maxTokens: 1500,
        topP: 0.9
      },
      timeout: 30000,
      retryAttempts: 2
    },
    
    fallbacks: [
      {
        provider: 'google',
        model: 'gemini-1.5-flash',
        parameters: { temperature: 0.1, maxTokens: 1500 }
      }
    ],
    
    requirements: {
      supportsVision: true,
      supportsStructuredOutput: true,
      minContextWindow: 16000,
      maxResponseTime: 30000
    },
    
    qualitySettings: {
      minConfidence: 0.80,
      enableRetryOnLowConfidence: true,
      enableCrossValidation: false // Single model sufficient for classification
    }
  },
  
  // Step 2: Text Extraction (OCR)
  textExtraction: {
    primary: {
      provider: 'google',
      model: 'gemini-1.5-pro', // Excellent OCR capabilities
      parameters: {
        temperature: 0.0, // Deterministic for OCR
        maxTokens: 8000
      },
      timeout: 60000, // OCR can be slow
      retryAttempts: 3
    },
    
    fallbacks: [
      {
        provider: 'openai',
        model: 'gpt-4o',
        parameters: { temperature: 0.0, maxTokens: 8000 }
      }
    ],
    
    requirements: {
      supportsVision: true,
      supportsStructuredOutput: false,
      minContextWindow: 32000,
      maxResponseTime: 60000
    },
    
    qualitySettings: {
      minConfidence: 0.75,
      enableRetryOnLowConfidence: true,
      enableCrossValidation: true // OCR benefits from cross-validation
    }
  },
  
  // Step 3: Medical Analysis
  medicalAnalysis: {
    // Prescription extraction
    prescriptionExtraction: {
      primary: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022', // Strong medical reasoning
        parameters: {
          temperature: 0.2,
          maxTokens: 4000
        },
        timeout: 45000,
        retryAttempts: 2
      },
      
      fallbacks: [
        {
          provider: 'openai',
          model: 'gpt-4o',
          parameters: { temperature: 0.2, maxTokens: 4000 }
        }
      ],
      
      qualitySettings: {
        minConfidence: 0.85, // High confidence required for medications
        enableRetryOnLowConfidence: true,
        enableCrossValidation: true, // Critical for medication safety
        requiresHumanReview: true // Always review prescriptions
      }
    },
    
    // Laboratory analysis
    laboratoryAnalysis: {
      primary: {
        provider: 'openai',
        model: 'gpt-4o', // Excellent structured data extraction
        parameters: {
          temperature: 0.1,
          maxTokens: 6000
        },
        timeout: 45000,
        retryAttempts: 2
      },
      
      fallbacks: [
        {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022'
        }
      ],
      
      qualitySettings: {
        minConfidence: 0.80,
        enableRetryOnLowConfidence: true,
        enableCrossValidation: true,
        requiresHumanReview: false // Auto-process lab data with good confidence
      }
    },
    
    // Diagnosis extraction
    diagnosisExtraction: {
      primary: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022', // Medical expertise
        parameters: {
          temperature: 0.3, // Allow some interpretation
          maxTokens: 4000
        },
        timeout: 45000,
        retryAttempts: 2
      },
      
      fallbacks: [
        {
          provider: 'openai',
          model: 'gpt-4o'
        }
      ],
      
      qualitySettings: {
        minConfidence: 0.85,
        enableRetryOnLowConfidence: true,
        enableCrossValidation: true,
        requiresHumanReview: true // Critical medical information
      }
    }
  },
  
  // Step 4: External Validation
  externalValidation: {
    primary: {
      provider: 'groq',
      model: 'llama-3.1-70b-versatile', // Fast for validation queries
      parameters: {
        temperature: 0.0,
        maxTokens: 2000
      },
      timeout: 20000, // Fast validation
      retryAttempts: 2
    },
    
    fallbacks: [
      {
        provider: 'openai',
        model: 'gpt-4o-mini' // Cost-effective fallback
      }
    ],
    
    qualitySettings: {
      minConfidence: 0.70, // Lower threshold for validation queries
      enableRetryOnLowConfidence: false, // Validation is best-effort
      enableCrossValidation: false
    }
  },
  
  // Step 5: Output Generation & Localization
  outputGeneration: {
    primary: {
      provider: 'openai',
      model: 'gpt-4o', // Excellent multilingual output
      parameters: {
        temperature: 0.3, // Some creativity for natural output
        maxTokens: 8000
      },
      timeout: 60000,
      retryAttempts: 2
    },
    
    fallbacks: [
      {
        provider: 'google',
        model: 'gemini-1.5-pro' // Strong multilingual support
      }
    ],
    
    qualitySettings: {
      minConfidence: 0.75,
      enableRetryOnLowConfidence: true,
      enableCrossValidation: false // Output generation doesn't need cross-validation
    }
  },
  
  // Language Processing (Translation)
  languageProcessing: {
    primary: {
      provider: 'google',
      model: 'gemini-1.5-pro', // Best multilingual capabilities
      parameters: {
        temperature: 0.2,
        maxTokens: 8000
      },
      timeout: 45000,
      retryAttempts: 2
    },
    
    fallbacks: [
      {
        provider: 'openai',
        model: 'gpt-4o'
      }
    ],
    
    qualitySettings: {
      minConfidence: 0.80,
      enableRetryOnLowConfidence: true,
      enableCrossValidation: true // Translation accuracy is important
    }
  }
};
```

## Regional Configuration Defaults

```typescript
// src/lib/workflows/config/regional-defaults.ts
export const REGIONAL_DEFAULTS: { [key in RegionCode]: RegionalDefaults } = {
  'CZ': {
    language: {
      primary: 'cs',
      fallbacks: ['en', 'de'],
      processingPreferences: {
        useNativeModels: true,
        translationQuality: 'high'
      }
    },
    
    medicalDatabases: {
      medication: {
        primary: 'SUKL',
        fallbacks: ['EMA', 'DRUGBANK'],
        crossReference: true
      },
      coding: {
        primaryICD: 'ICD10',
        primarySNOMED: 'SNOMED_INTL',
        mappingServices: ['UMLS', 'WHO_MAPPINGS']
      },
      laboratory: {
        referenceRanges: 'CZECH_LAB_STANDARDS',
        demographicAdjustment: true
      }
    },
    
    compliance: ['GDPR', 'EU_MDR', 'CZECH_HEALTHCARE_LAW'],
    
    modelPreferences: {
      // Czech language works better with these models
      languageSpecific: {
        'cs': {
          provider: 'google',
          model: 'gemini-1.5-pro'
        }
      }
    }
  },
  
  'US': {
    language: {
      primary: 'en',
      fallbacks: ['es'],
      processingPreferences: {
        useNativeModels: true,
        translationQuality: 'standard'
      }
    },
    
    medicalDatabases: {
      medication: {
        primary: 'FDA_ORANGE_BOOK',
        fallbacks: ['RXNORM', 'DRUGBANK'],
        crossReference: true
      },
      coding: {
        primaryICD: 'ICD10',
        primarySNOMED: 'SNOMED_US',
        mappingServices: ['VSAC', 'UMLS']
      },
      laboratory: {
        referenceRanges: 'ARUP',
        demographicAdjustment: true
      }
    },
    
    compliance: ['HIPAA', 'FDA_CFR'],
    
    modelPreferences: {
      // US English optimization
      languageSpecific: {
        'en': {
          provider: 'openai',
          model: 'gpt-4o'
        }
      }
    }
  },
  
  'GLOBAL': {
    language: {
      primary: 'en',
      fallbacks: ['es', 'fr', 'de', 'it'],
      processingPreferences: {
        useNativeModels: false,
        translationQuality: 'standard'
      }
    },
    
    medicalDatabases: {
      medication: {
        primary: 'DRUGBANK',
        fallbacks: ['RXNORM'],
        crossReference: false
      },
      coding: {
        primaryICD: 'ICD10',
        primarySNOMED: 'SNOMED_INTL',
        mappingServices: ['UMLS']
      },
      laboratory: {
        referenceRanges: 'GLOBAL_LAB_STANDARDS',
        demographicAdjustment: false
      }
    },
    
    compliance: ['GDPR'], // Minimal global compliance
    
    modelPreferences: {
      languageSpecific: {
        'en': {
          provider: 'openai',
          model: 'gpt-4o'
        }
      }
    }
  }
};
```

## Configuration Resolver

### Merging System Defaults with User Overrides

```typescript
// src/lib/workflows/config/configuration-resolver.ts
export class ConfigurationResolver {
  
  static resolve(
    systemDefaults: SystemConfiguration,
    userOverrides: Partial<UserConfiguration> | null,
    region?: RegionCode
  ): ResolvedConfiguration {
    
    // Start with system defaults
    let resolved = this.cloneDeep(systemDefaults);
    
    // Apply regional defaults if specified
    if (region && REGIONAL_DEFAULTS[region]) {
      resolved = this.mergeRegionalDefaults(resolved, REGIONAL_DEFAULTS[region]);
    }
    
    // Apply user overrides
    if (userOverrides) {
      resolved = this.mergeUserOverrides(resolved, userOverrides);
    }
    
    // Validate final configuration
    this.validateConfiguration(resolved);
    
    return resolved;
  }
  
  private static mergeUserOverrides(
    base: any,
    overrides: any
  ): any {
    const result = this.cloneDeep(base);
    
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === undefined) {
        continue; // Skip null overrides, keep defaults
      }
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Deep merge objects
        result[key] = this.mergeUserOverrides(result[key] || {}, value);
      } else {
        // Direct override for primitives and arrays
        result[key] = value;
      }
    }
    
    return result;
  }
  
  private static validateConfiguration(config: ResolvedConfiguration): void {
    // Validate model configurations
    this.validateModelConfigs(config.models);
    
    // Validate confidence thresholds
    this.validateConfidenceThresholds(config.quality.confidenceThresholds);
    
    // Validate regional settings
    this.validateRegionalConfig(config.regional);
    
    // Validate processing limits
    this.validateProcessingLimits(config.processing);
  }
  
  private static validateModelConfigs(models: WorkflowModelConfiguration): void {
    for (const [stepName, stepConfig] of Object.entries(models)) {
      if (!stepConfig.primary) {
        throw new Error(`Missing primary model configuration for step: ${stepName}`);
      }
      
      if (!stepConfig.primary.provider || !stepConfig.primary.model) {
        throw new Error(`Invalid primary model configuration for step: ${stepName}`);
      }
      
      // Validate timeout values
      if (stepConfig.primary.timeout && stepConfig.primary.timeout < 1000) {
        console.warn(`Very low timeout (${stepConfig.primary.timeout}ms) for step: ${stepName}`);
      }
    }
  }
  
  private static validateConfidenceThresholds(thresholds: ConfidenceThresholds): void {
    for (const [category, categoryThresholds] of Object.entries(thresholds)) {
      for (const [level, threshold] of Object.entries(categoryThresholds)) {
        if (threshold < 0 || threshold > 1) {
          throw new Error(`Invalid confidence threshold for ${category}.${level}: ${threshold}`);
        }
      }
      
      // Ensure logical order: autoReject < humanReview < autoAccept
      const cat = categoryThresholds as any;
      if (cat.autoReject >= cat.humanReview || cat.humanReview >= cat.autoAccept) {
        throw new Error(`Illogical confidence thresholds for ${category}`);
      }
    }
  }
}
```

## Usage Examples

### Creating Configuration for Different Scenarios

```typescript
// Example 1: Czech user with custom medication confidence
const czechUserConfig = ConfigurationResolver.resolve(
  SYSTEM_DEFAULTS,
  {
    regional: {
      language: {
        primary: 'cs',
        autoDetect: false // User wants Czech always
      }
    },
    quality: {
      confidenceThresholds: {
        autoAccept: {
          medication: 0.95 // Higher confidence required for medications
        }
      }
    },
    models: {
      prescriptionExtraction: {
        qualitySettings: {
          enableCrossValidation: true,
          requiresHumanReview: true
        }
      }
    }
  },
  'CZ'
);

// Example 2: US research facility with high-accuracy requirements
const researchConfig = ConfigurationResolver.resolve(
  SYSTEM_DEFAULTS,
  {
    quality: {
      // High confidence across all categories
      confidenceThresholds: {
        autoAccept: {
          medication: 0.95,
          diagnosis: 0.92,
          labValues: 0.90,
          patientInfo: 0.93,
          generalData: 0.88
        }
      }
    },
    models: {
      // Enable cross-validation for all medical analysis
      prescriptionExtraction: {
        qualitySettings: {
          enableCrossValidation: true,
          requiresHumanReview: true
        }
      },
      laboratoryAnalysis: {
        qualitySettings: {
          enableCrossValidation: true,
          requiresHumanReview: true
        }
      },
      diagnosisExtraction: {
        qualitySettings: {
          enableCrossValidation: true,
          requiresHumanReview: true
        }
      }
    }
  },
  'US'
);

// Example 3: Cost-optimized configuration
const costOptimizedConfig = ConfigurationResolver.resolve(
  SYSTEM_DEFAULTS,
  {
    models: {
      // Use faster, cheaper models
      documentClassification: {
        primary: {
          provider: 'openai',
          model: 'gpt-4o-mini'
        }
      },
      textExtraction: {
        primary: {
          provider: 'google',
          model: 'gemini-1.5-flash' // Faster variant
        }
      },
      externalValidation: {
        qualitySettings: {
          enableCrossValidation: false // Skip expensive cross-validation
        }
      }
    },
    quality: {
      // Lower confidence thresholds to reduce retries
      confidenceThresholds: {
        autoAccept: {
          generalData: 0.70 // Accept lower confidence for non-critical data
        }
      }
    }
  }
);
```

## Configuration Factory

```typescript
// src/lib/workflows/config/configuration-factory.ts
export class ConfigurationFactory {
  
  // Create standard configuration
  static createStandard(
    userId: string, 
    region: RegionCode = 'GLOBAL',
    customizations?: Partial<UserConfiguration>
  ): ResolvedConfiguration {
    return ConfigurationResolver.resolve(
      SYSTEM_DEFAULTS,
      customizations || null,
      region
    );
  }
  
  // Create high-accuracy configuration
  static createHighAccuracy(
    userId: string,
    region: RegionCode = 'GLOBAL'
  ): ResolvedConfiguration {
    return ConfigurationResolver.resolve(
      SYSTEM_DEFAULTS,
      {
        quality: {
          confidenceThresholds: {
            autoAccept: {
              medication: 0.95,
              diagnosis: 0.92,
              labValues: 0.90,
              patientInfo: 0.93,
              generalData: 0.88
            }
          }
        },
        models: {
          prescriptionExtraction: {
            qualitySettings: {
              enableCrossValidation: true,
              requiresHumanReview: true
            }
          },
          laboratoryAnalysis: {
            qualitySettings: {
              enableCrossValidation: true
            }
          },
          diagnosisExtraction: {
            qualitySettings: {
              enableCrossValidation: true,
              requiresHumanReview: true
            }
          }
        }
      },
      region
    );
  }
  
  // Create cost-optimized configuration
  static createCostOptimized(
    userId: string,
    region: RegionCode = 'GLOBAL'
  ): ResolvedConfiguration {
    return ConfigurationResolver.resolve(
      SYSTEM_DEFAULTS,
      {
        models: {
          documentClassification: {
            primary: { provider: 'openai', model: 'gpt-4o-mini' }
          },
          textExtraction: {
            primary: { provider: 'google', model: 'gemini-1.5-flash' }
          },
          externalValidation: {
            qualitySettings: {
              enableCrossValidation: false
            }
          }
        }
      },
      region
    );
  }
}
```

## Summary

This configuration system provides:

### 🎛️ **Two-Layer Simplicity**
- **System Defaults**: Comprehensive baseline that works out-of-the-box
- **User Overrides**: Granular personalization without complexity

### 🔧 **Workflow Control**
- **Step-by-step model configuration** for each workflow stage
- **Quality thresholds** for confidence management
- **Regional optimization** for language and medical databases
- **Processing parameters** for timeouts, retries, and performance

### 🌍 **Regional Adaptation**
- **Regional defaults** automatically applied based on user location
- **Medical database preferences** aligned with healthcare systems
- **Language-specific optimizations** for better accuracy

### 🎯 **Flexible Customization**
- **Granular overrides** at any configuration level
- **Validation** ensures configuration consistency
- **Factory patterns** for common configuration scenarios
- **No license complexity** - pure workflow control

The licensing layer can modify this configuration object before it reaches the workflow, keeping concerns properly separated.