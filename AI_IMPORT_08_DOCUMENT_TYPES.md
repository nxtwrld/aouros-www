# AI Document Import - Enhanced Medical Sections

> **Navigation**: [← Roadmap](./AI_IMPORT_07_ROADMAP.md) | [README](./AI_IMPORT_README.md) | [Next: DICOM Apps →](./AI_IMPORT_09_DICOM_APPS.md)

This document outlines the proposed enhanced medical sections to support comprehensive medical record processing through dynamic section composition.

## Current Document Type Support

The system currently supports these primary medical document types:

- **Report** - General medical examination reports
- **Laboratory** - Lab test results with signal extraction
- **Dental** - Dental examination with tooth-specific analysis
- **Imaging/DICOM** - Medical imaging reports and DICOM metadata
- **Prescription** - Medication prescriptions
- **Immunization** - Vaccination records

## Enhanced Medical Sections Architecture

> **Philosophy**: Instead of creating specialized document types, we decompose medical content into reusable sections that can appear in any document. This enables dynamic composition where documents include only relevant sections based on their content.

> **Signal Integration**: Each new medical section will integrate with the enhanced signal system described in [AI_SIGNALS_IMPORT.md](./AI_SIGNALS_IMPORT.md#dynamic-signal-discovery-system) for intelligent extraction of medical measurements and time-series data.

Based on comprehensive analysis of medical documentation needs, the following medical sections should be added to support complete medical record processing:

### 1. Admission Section (`admission`)

**Purpose**: Hospital admission and discharge details

**Key Data Points**:

- Admission and discharge dates
- Length of stay calculations
- Discharge disposition (home, rehabilitation, etc.)
- Attending physician information

**Section Schema**:

```typescript
interface AdmissionSection {
  id: "admission";
  name: "Admission Details";
  component: "SectionAdmission";
  schema: {
    admissionDate: string;
    dischargeDate: string;
    lengthOfStay: number;
    dischargeDisposition: string;
    attendingPhysician: Performer; // References core.performer
  };
  applicableTo: ["hasAdmission", "inpatient", "discharge"];
  priority: 1;
  required: false;
}
```

### 2. Follow-up Section (`followup`)

**Purpose**: Post-discharge instructions and care continuity

**Key Data Points**:

- Follow-up appointments and scheduling
- Care instructions and restrictions
- Warning signs and emergency contacts
- Medication reconciliation notes

**Section Schema**:

```typescript
interface FollowupSection {
  id: "followup";
  name: "Follow-up Care";
  component: "SectionFollowup";
  schema: {
    followUpInstructions: string;
    appointments: Appointment[];
    careRestrictions: string[];
    warningSignsString;
    emergencyContacts: Contact[];
  };
  applicableTo: ["hasFollowup", "discharge", "consultation"];
  priority: 2;
  required: false;
}
```

### 3. Procedures Section (`procedures`)

**Purpose**: Surgical and medical procedures with detailed documentation

**Key Data Points**:

- Procedure names and CPT codes
- Duration and technique details
- Surgical team members
- Operative findings and outcomes

**Section Schema**:

```typescript
interface ProceduresSection {
  id: "procedures";
  name: "Procedures";
  component: "SectionProcedures";
  schema: {
    procedures: {
      name: string;
      cptCode: string;
      duration: number;
      technique: string;
      findings: string;
      complications: string[];
    }[];
    surgicalTeam: Performer[]; // References core.performer
  };
  applicableTo: ["hasProcedure", "surgical", "interventional"];
  priority: 3;
  required: false;
}
```

### 4. Anesthesia Section (`anesthesia`)

**Purpose**: Anesthesia administration and monitoring details

**Key Data Points**:

- Anesthesia type and agents used
- Duration and monitoring parameters
- Anesthesia provider information
- Complications or notable events

**Section Schema**:

```typescript
interface AnesthesiaSection {
  id: "anesthesia";
  name: "Anesthesia";
  component: "SectionAnesthesia";
  schema: {
    type: string;
    agents: string[];
    duration: number;
    monitoringParameters: Signal[]; // References core.signals
    provider: Performer; // References core.performer
    complications: string[];
  };
  applicableTo: ["hasAnesthesia", "surgical", "procedural"];
  priority: 4;
  required: false;
}
```

### 5. Surgical Findings Section (`findings`)

**Purpose**: Operative findings and observations

**Key Data Points**:

- Anatomical findings and abnormalities
- Tissue characteristics and pathology
- Blood loss estimates
- Implants or devices used

**Section Schema**:

```typescript
interface FindingsSection {
  id: "findings";
  name: "Surgical Findings";
  component: "SectionFindings";
  schema: {
    anatomicalFindings: string;
    abnormalities: string[];
    estimatedBloodLoss: number;
    implants: Device[];
    tissueCharacteristics: string;
  };
  applicableTo: ["hasFindings", "surgical", "pathology"];
  priority: 5;
  required: false;
}
```

### 6. Specimens Section (`specimens`)

**Purpose**: Tissue specimen collection and handling details

**Key Data Points**:

- Specimen type and collection method
- Collection date and site
- Specimen handling and preparation
- Chain of custody information

**Section Schema**:

```typescript
interface SpecimensSection {
  id: "specimens";
  name: "Specimens";
  component: "SectionSpecimens";
  schema: {
    specimens: {
      type: string;
      collectionDate: string;
      collectionMethod: string;
      site: BodyPart; // References core.bodyParts
      handling: string;
    }[];
    collectedBy: Performer; // References core.performer
  };
  applicableTo: ["hasSpecimen", "pathology", "laboratory"];
  priority: 6;
  required: false;
}
```

### 7. Microscopic Section (`microscopic`)

**Purpose**: Microscopic examination findings and descriptions

**Key Data Points**:

- Gross and microscopic descriptions
- Special stains and immunohistochemistry
- Cellular morphology and patterns
- Histological grades and classifications

**Section Schema**:

```typescript
interface MicroscopicSection {
  id: "microscopic";
  name: "Microscopic Findings";
  component: "SectionMicroscopic";
  schema: {
    grossDescription: string;
    microscopicDescription: string;
    specialStains: string[];
    immunohistochemistry: string[];
    cellularMorphology: string;
    histologicalGrade: string;
  };
  applicableTo: ["hasMicroscopic", "pathology", "cytology"];
  priority: 7;
  required: false;
}
```

### 8. Molecular Section (`molecular`)

**Purpose**: Molecular and genetic findings

**Key Data Points**:

- Molecular markers and mutations
- Genetic test results
- Biomarker analysis
- Genomic sequencing data

**Section Schema**:

```typescript
interface MolecularSection {
  id: "molecular";
  name: "Molecular Findings";
  component: "SectionMolecular";
  schema: {
    molecularFindings: string[];
    mutations: string[];
    biomarkers: string[];
    genomicData: string;
    testMethods: string[];
  };
  applicableTo: ["hasMolecular", "pathology", "oncology"];
  priority: 8;
  required: false;
}
```

### 9. ECG Section (`ecg`)

**Purpose**: Electrocardiogram findings and rhythm analysis

**Key Data Points**:

- Heart rhythm and rate measurements
- Interval measurements (PR, QRS, QT)
- Abnormalities and arrhythmias
- Interpretation and clinical significance

**Section Schema**:

```typescript
interface ECGSection {
  id: "ecg";
  name: "ECG Findings";
  component: "SectionECG";
  schema: {
    rhythm: string;
    rate: Signal; // References core.signals
    intervals: {
      pr: Signal;
      qrs: Signal;
      qt: Signal;
    };
    abnormalities: string[];
    interpretation: string;
  };
  applicableTo: ["hasECG", "cardiology", "emergency"];
  priority: 9;
  required: false;
}
```

### 10. Echo Section (`echo`)

**Purpose**: Echocardiogram measurements and assessments

**Key Data Points**:

- Ejection fraction and cardiac output
- Valve function assessments
- Wall motion abnormalities
- Chamber measurements and volumes

**Section Schema**:

```typescript
interface EchoSection {
  id: "echo";
  name: "Echocardiogram";
  component: "SectionEcho";
  schema: {
    ejectionFraction: Signal; // References core.signals
    valveFunction: ValveAssessment[];
    wallMotion: string[];
    measurements: {
      lvedd: Signal;
      lvesd: Signal;
      ivs: Signal;
      pw: Signal;
    };
    interpretation: string;
  };
  applicableTo: ["hasEcho", "cardiology"];
  priority: 10;
  required: false;
}
```

### 11. Cardiac Studies Section (`cardiacstudies`)

**Purpose**: Stress tests, catheterization, and specialized cardiac studies

**Key Data Points**:

- Stress test protocols and results
- Catheterization findings
- Hemodynamic measurements
- Interventional procedures

**Section Schema**:

```typescript
interface CardiacStudiesSection {
  id: "cardiacstudies";
  name: "Cardiac Studies";
  component: "SectionCardiacStudies";
  schema: {
    studyType: string;
    protocol: string;
    results: string;
    hemodynamics: Signal[]; // References core.signals
    interventions: string[];
    complications: string[];
  };
  applicableTo: ["hasCardiacStudy", "cardiology", "interventional"];
  priority: 11;
  required: false;
}
```

### 12. Triage Section (`triage`)

**Purpose**: Emergency department triage and initial assessment

**Key Data Points**:

- Chief complaint and presenting symptoms
- Triage level and urgency classification
- Arrival time and initial vital signs
- Emergency contacts and notification

**Section Schema**:

```typescript
interface TriageSection {
  id: "triage";
  name: "Triage Assessment";
  component: "SectionTriage";
  schema: {
    chiefComplaint: string;
    triageLevel: number;
    arrivalTime: string;
    initialVitals: Signal[]; // References core.signals
    emergencyContacts: Contact[];
    urgencyClassification: string;
  };
  applicableTo: ["hasTriage", "emergency", "urgent"];
  priority: 12;
  required: false;
}
```

### 13. Treatments Section (`treatments`)

**Purpose**: Medical treatments and interventions provided

**Key Data Points**:

- Treatment protocols and procedures
- Medications administered
- Response to treatment
- Complications or adverse events

**Section Schema**:

```typescript
interface TreatmentsSection {
  id: "treatments";
  name: "Treatments";
  component: "SectionTreatments";
  schema: {
    treatments: {
      type: string;
      description: string;
      medicationsAdministered: Prescription[]; // References core prescriptions
      response: string;
      complications: string[];
    }[];
    treatmentPlan: string;
    followUpRequired: boolean;
  };
  applicableTo: ["hasTreatment", "emergency", "inpatient"];
  priority: 13;
  required: false;
}
```

### 14. Diagnostics Section (`diagnostics`)

**Purpose**: Diagnostic tests and laboratory results

**Key Data Points**:

- Diagnostic tests ordered and performed
- Laboratory results and interpretations
- Imaging studies and findings
- Point-of-care testing results

**Section Schema**:

```typescript
interface DiagnosticsSection {
  id: "diagnostics";
  name: "Diagnostic Tests";
  component: "SectionDiagnostics";
  schema: {
    testsOrdered: string[];
    labResults: Signal[]; // References core.signals
    imagingFindings: string[];
    pointOfCareTests: string[];
    interpretations: string[];
  };
  applicableTo: ["hasDiagnostics", "emergency", "laboratory"];
  priority: 14;
  required: false;
}
```

### 15. Referral Section (`referral`)

**Purpose**: Referral and consultation coordination

**Key Data Points**:

- Referring physician information
- Reason for consultation
- Specialist information
- Communication requirements

**Section Schema**:

```typescript
interface ReferralSection {
  id: "referral";
  name: "Referral Information";
  component: "SectionReferral";
  schema: {
    referringPhysician: Performer; // References core.performer
    consultingSpecialist: Performer; // References core.performer
    reasonForConsultation: string;
    urgency: string;
    communicationRequired: boolean;
  };
  applicableTo: ["hasReferral", "consultation", "specialty"];
  priority: 15;
  required: false;
}
```

### 16. Assessment Section (`assessment`)

**Purpose**: Clinical assessment and specialist evaluation

**Key Data Points**:

- Specialist assessment and evaluation
- Clinical impressions
- Differential diagnosis considerations
- Risk stratification

**Section Schema**:

```typescript
interface AssessmentSection {
  id: "assessment";
  name: "Clinical Assessment";
  component: "SectionAssessment";
  schema: {
    specialistAssessment: string;
    clinicalImpressions: string[];
    differentialDiagnosis: Diagnosis[]; // References core.diagnosis
    riskFactors: string[];
    prognosis: string;
  };
  applicableTo: ["hasAssessment", "consultation", "specialty"];
  priority: 16;
  required: false;
}
```

### 17. Recommendations Section (`recommendations`)

**Purpose**: Treatment recommendations and clinical plans

**Key Data Points**:

- Treatment recommendations
- Medication adjustments
- Lifestyle modifications
- Follow-up planning

**Section Schema**:

```typescript
interface RecommendationsSection {
  id: "recommendations";
  name: "Recommendations";
  component: "SectionRecommendations";
  schema: {
    recommendations: string[];
    treatmentPlan: string;
    medicationAdjustments: Prescription[]; // References core prescriptions
    lifestyleModifications: string[];
    patientEducation: string;
  };
  applicableTo: ["hasRecommendations", "consultation", "followup"];
  priority: 17;
  required: false;
}
```

### 18. SOAP Section (`soap`)

**Purpose**: Structured SOAP note documentation

**Key Data Points**:

- Subjective patient complaints
- Objective findings and measurements
- Assessment and clinical impression
- Plan for treatment and follow-up

**Section Schema**:

```typescript
interface SOAPSection {
  id: "soap";
  name: "SOAP Note";
  component: "SectionSOAP";
  schema: {
    subjective: string;
    objective: {
      vitals: Signal[]; // References core.signals
      physicalExam: string;
      diagnosticResults: string;
    };
    assessment: string;
    plan: {
      medications: Prescription[]; // References core prescriptions
      procedures: string[];
      followUp: string;
      patientEducation: string;
    };
  };
  applicableTo: ["hasSOAP", "progress", "consultation"];
  priority: 18;
  required: false;
}
```

### 19. Imaging Studies Section (`imaging`)

**Purpose**: Medical imaging interpretation and findings

**Key Data Points**:

- Study type and imaging technique
- Clinical indications
- Findings by anatomical region
- Comparison with prior studies

**Section Schema**:

```typescript
interface ImagingSection {
  id: "imaging";
  name: "Imaging Studies";
  component: "SectionImaging";
  schema: {
    studyType: string;
    technique: string;
    clinicalIndication: string;
    findings: {
      region: BodyPart; // References core.bodyParts
      description: string;
    }[];
    priorComparison: string;
    criticalResults: boolean;
  };
  applicableTo: ["hasImaging", "radiology", "emergency"];
  priority: 19;
  required: false;
}
```

### 20. Impression Section (`impression`)

**Purpose**: Clinical impression and diagnostic conclusions

**Key Data Points**:

- Radiological or clinical impressions
- Diagnostic conclusions
- Recommendations for further evaluation
- Clinical significance

**Section Schema**:

```typescript
interface ImpressionSection {
  id: "impression";
  name: "Clinical Impression";
  component: "SectionImpression";
  schema: {
    impression: string;
    conclusions: string[];
    recommendations: string[];
    clinicalSignificance: string;
    furtherEvaluation: string[];
  };
  applicableTo: ["hasImpression", "radiology", "pathology"];
  priority: 20;
  required: false;
}
```

## Implementation Strategy for Enhanced Medical Sections

### Phase 1: Section Registry Development (Week 1-2)

- Implement dynamic section registry system
- Create section definition interfaces and schemas
- Develop section detection algorithms
- Build section validation and composition logic

### Phase 2: AI Training Data (Week 3-4)

- Collect representative medical documents with section annotations
- Create ground truth datasets for section detection
- Train section identification models
- Validate section extraction accuracy across document types

### Phase 3: Workflow Integration (Week 5-6)

- Integrate section detection into LangGraph workflow
- Add conditional routing for section-based processing
- Implement dynamic section composition nodes
- Test end-to-end section-based workflows

### Phase 4: External Validation (Week 7-8)

- Integrate section-specific validation with medical databases
- Add section-level quality scoring
- Implement cross-section validation rules
- Deploy with comprehensive monitoring

## Benefits of Enhanced Medical Sections

### Comprehensive Medical Records

- **Complete Coverage**: Support for all major medical content areas through reusable sections
- **Standardized Extraction**: Consistent data structure across all document types
- **Interoperability**: FHIR-compliant output for healthcare integration

### Enhanced Clinical Workflows

- **Modular Processing**: Flexible section-based processing for any document type
- **Care Continuity**: Better tracking of patient care across all document types
- **Quality Metrics**: Section-specific quality and completeness scores

### Improved User Experience

- **Dynamic Composition**: Automatic section detection and inclusion
- **Optimized Processing**: Efficient extraction based on content relevance
- **Contextual Validation**: Section-specific validation rules

## Migration Considerations

### Backward Compatibility

- Existing document types remain fully supported
- Gradual rollout of new enhanced section support
- Optional feature flags for new medical sections

### Performance Impact

- Minimal impact on existing processing speed
- Section detection adds <0.5 seconds
- Parallel section processing maintains overall performance

### Training Requirements

- Medical professional validation of new section schemas
- User training on new section-based features
- Updated documentation and examples

## Section Registry Architecture

### Dynamic Section Registry

```typescript
export const sectionRegistry: Record<string, SectionDefinition> = {
  admission: {
    id: "admission",
    name: "Admission Details",
    component: "SectionAdmission",
    schema: admissionSchema,
    applicableTo: ["hasAdmission", "inpatient", "discharge"],
    priority: 1,
    required: false,
  },
  procedures: {
    id: "procedures",
    name: "Procedures",
    component: "SectionProcedures",
    schema: proceduresSchema,
    applicableTo: ["hasProcedure", "surgical", "interventional"],
    priority: 3,
    required: false,
  },
  // ... additional sections
};
```

### Section Detection Algorithm

```typescript
export function detectApplicableSections(document: any): string[] {
  const detectedSections: string[] = [];

  for (const [sectionId, definition] of Object.entries(sectionRegistry)) {
    if (
      definition.applicableTo.some((condition) =>
        evaluateCondition(document, condition),
      )
    ) {
      detectedSections.push(sectionId);
    }
  }

  return detectedSections.sort(
    (a, b) => sectionRegistry[a].priority - sectionRegistry[b].priority,
  );
}
```

### Benefits of Section-Based Approach

1. **Modularity**: Each section can be developed and maintained independently
2. **Reusability**: Sections can appear in multiple document types
3. **Scalability**: New sections can be added without modifying existing document types
4. **Consistency**: Standardized core structures across all sections
5. **Flexibility**: Documents include only relevant sections based on content

---

> **Next**: [DICOM Apps Integration](./AI_IMPORT_09_DICOM_APPS.md) - 3rd party application integration for enhanced DICOM processing
