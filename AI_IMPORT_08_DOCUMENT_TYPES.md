# AI Document Import - Extended Document Types

> **Navigation**: [← Roadmap](./AI_IMPORT_07_ROADMAP.md) | [README](./AI_IMPORT_README.md) | [Next: DICOM Apps →](./AI_IMPORT_09_DICOM_APPS.md)

This document outlines the proposed extensions to the document type system to support comprehensive medical record processing.

## Current Document Type Support

The system currently supports these primary medical document types:

- **Report** - General medical examination reports
- **Laboratory** - Lab test results with signal extraction
- **Dental** - Dental examination with tooth-specific analysis
- **Imaging/DICOM** - Medical imaging reports and DICOM metadata
- **Prescription** - Medication prescriptions
- **Immunization** - Vaccination records

## Proposed Document Type Extensions

> **Signal Integration**: Each new document type will integrate with the enhanced signal system described in [AI_SIGNALS_IMPORT.md](./AI_SIGNALS_IMPORT.md#dynamic-signal-discovery-system) for intelligent extraction of medical measurements and time-series data.

Based on comprehensive analysis of medical documentation needs, the following document types should be added to support a complete medical record system:

### 1. Discharge Summary (`discharge`)

**Purpose**: Hospital discharge documentation with treatment summaries

**Key Data Points**:

- Admission and discharge dates
- Primary and secondary diagnoses (ICD-10 codes)
- Procedures performed during hospitalization
- Discharge medications with reconciliation
- Follow-up instructions and appointments
- Discharge disposition (home, rehabilitation, etc.)

**Schema Requirements**:

```typescript
interface DischargeSchema {
  admissionDate: string;
  dischargeDate: string;
  lengthOfStay: number;
  principalDiagnosis: Diagnosis;
  secondaryDiagnoses: Diagnosis[];
  procedures: Procedure[];
  dischargeMedications: Prescription[];
  followUpInstructions: string;
  dischargeDisposition: string;
  attendingPhysician: Performer;
}
```

### 2. Surgical Report (`surgery`)

**Purpose**: Operative notes and surgical procedure documentation

**Key Data Points**:

- Pre-operative and post-operative diagnoses
- Procedure details with CPT codes
- Surgical team members
- Anesthesia type and duration
- Operative findings
- Complications and blood loss
- Implants or devices used

**Schema Requirements**:

```typescript
interface SurgicalSchema {
  preOperativeDiagnosis: Diagnosis[];
  postOperativeDiagnosis: Diagnosis[];
  procedure: {
    name: string;
    cptCode: string;
    duration: number;
    technique: string;
  };
  surgicalTeam: Performer[];
  anesthesia: {
    type: string;
    duration: number;
    provider: Performer;
  };
  findings: string;
  complications: string[];
  estimatedBloodLoss: number;
  implants: Device[];
}
```

### 3. Pathology Report (`pathology`)

**Purpose**: Tissue analysis, biopsy results, and cytology reports

**Key Data Points**:

- Specimen type and collection method
- Gross description
- Microscopic description
- Special stains and immunohistochemistry
- Diagnosis with staging (if applicable)
- Molecular/genetic findings
- Synoptic reports for cancer

**Schema Requirements**:

```typescript
interface PathologySchema {
  specimen: {
    type: string;
    collectionDate: string;
    collectionMethod: string;
  };
  grossDescription: string;
  microscopicDescription: string;
  specialStains: string[];
  immunohistochemistry: string[];
  diagnosis: {
    primary: string;
    stage: string;
    grade: string;
  };
  molecularFindings: string[];
  synopticReport: SynopticReport;
  pathologist: Performer;
}
```

### 4. Cardiology Report (`cardiology`)

**Purpose**: Cardiac examination reports including ECG, echo, stress tests

**Key Data Points**:

- ECG findings and rhythm analysis
- Echocardiogram measurements
- Stress test results
- Cardiac catheterization findings
- Hemodynamic measurements
- Valve assessments
- Wall motion analysis

**Schema Requirements**:

```typescript
interface CardiologySchema {
  studyType: "ECG" | "Echo" | "Stress" | "Catheterization";
  ecgFindings: {
    rhythm: string;
    rate: number;
    intervals: Record<string, number>;
    abnormalities: string[];
  };
  echoFindings: {
    ejectionFraction: number;
    valveFunction: ValveAssessment[];
    wallMotion: string[];
    measurements: Record<string, number>;
  };
  recommendations: string[];
  cardiologist: Performer;
}
```

### 5. Emergency Report (`emergency`)

**Purpose**: Emergency department visit documentation

**Key Data Points**:

- Chief complaint and triage level
- Emergency department course
- Vital signs and initial assessment
- Diagnostic tests performed
- Treatment provided
- Disposition and discharge instructions
- Emergency contacts

**Schema Requirements**:

```typescript
interface EmergencySchema {
  chiefComplaint: string;
  triageLevel: number;
  arrivalTime: string;
  vitals: Signal[];
  initialAssessment: string;
  diagnosticTests: Test[];
  treatments: Treatment[];
  disposition: string;
  dischargeInstructions: string;
  emergencyPhysician: Performer;
}
```

### 6. Consultation Report (`consultation`)

**Purpose**: Specialist consultation and referral documentation

**Key Data Points**:

- Referring physician information
- Reason for consultation
- Specialist assessment
- Recommendations and treatment plan
- Follow-up requirements
- Communication back to referring physician

**Schema Requirements**:

```typescript
interface ConsultationSchema {
  referringPhysician: Performer;
  consultingSpecialist: Performer;
  reasonForConsultation: string;
  specialistAssessment: string;
  recommendations: string[];
  treatmentPlan: string;
  followUpRequired: boolean;
  communicationSent: boolean;
}
```

### 7. Progress Note (`progress`)

**Purpose**: Ongoing care documentation and treatment updates

**Key Data Points**:

- Subjective patient complaints
- Objective findings
- Assessment and plan (SOAP format)
- Changes in condition
- Medication adjustments
- Next visit planning

**Schema Requirements**:

```typescript
interface ProgressSchema {
  visitDate: string;
  subjective: string;
  objective: {
    vitals: Signal[];
    physicalExam: string;
    diagnosticResults: string;
  };
  assessment: string;
  plan: {
    medications: Prescription[];
    procedures: string[];
    followUp: string;
    patientEducation: string;
  };
  provider: Performer;
}
```

### 8. Radiology Report (`radiology`)

**Purpose**: Medical imaging interpretation and findings

**Key Data Points**:

- Study type and technique
- Clinical indication
- Findings by anatomical region
- Impression and recommendations
- Comparison with prior studies
- Radiologist interpretation

**Schema Requirements**:

```typescript
interface RadiologySchema {
  studyType: string;
  technique: string;
  clinicalIndication: string;
  findings: {
    region: string;
    description: string;
  }[];
  impression: string;
  recommendations: string[];
  priorComparison: string;
  radiologist: Performer;
  criticalResults: boolean;
}
```

## Implementation Strategy for New Document Types

### Phase 1: Schema Development (Week 1-2)

- Design and implement enhanced schemas for each document type
- Create validation rules and type definitions
- Develop testing datasets for each document type

### Phase 2: AI Training Data (Week 3-4)

- Collect representative documents for each type
- Create ground truth annotations
- Train document type classifiers
- Validate extraction accuracy

### Phase 3: Workflow Integration (Week 5-6)

- Integrate new document types into LangGraph workflow
- Add conditional routing for new types
- Implement specialized processing nodes
- Test end-to-end workflows

### Phase 4: External Validation (Week 7-8)

- Integrate with medical coding databases
- Add document-specific validation rules
- Implement quality scoring
- Deploy with monitoring

## Benefits of Extended Document Support

### Comprehensive Medical Records

- **Complete Coverage**: Support for all major medical document types
- **Standardized Extraction**: Consistent data structure across document types
- **Interoperability**: FHIR-compliant output for healthcare integration

### Enhanced Clinical Workflows

- **Specialty Support**: Tailored processing for different medical specialties
- **Care Continuity**: Better tracking of patient care across episodes
- **Quality Metrics**: Document-specific quality and completeness scores

### Improved User Experience

- **Document Recognition**: Automatic classification of document types
- **Specialized Processing**: Optimized extraction for each document type
- **Contextual Validation**: Document-specific validation rules

## Migration Considerations

### Backward Compatibility

- Existing document types remain fully supported
- Gradual rollout of new document type support
- Optional feature flags for new document types

### Performance Impact

- Minimal impact on existing processing speed
- Document type classification adds <0.5 seconds
- Parallel processing maintains overall performance

### Training Requirements

- Medical professional validation of new schemas
- User training on new document type features
- Updated documentation and examples

---

> **Next**: [DICOM Apps Integration](./AI_IMPORT_09_DICOM_APPS.md) - 3rd party application integration for enhanced DICOM processing
