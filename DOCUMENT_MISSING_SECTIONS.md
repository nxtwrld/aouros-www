# Strategy for Creating Missing Section Components

## Overview

This document outlines the comprehensive strategy for building missing UI section components to support all newly created document nodes from our multi-node processing system. Currently, we have 25+ specialized medical processing nodes but only ~10 UI components to display their results.

## Current State Analysis

### ✅ **Existing UI Components**
- `SectionSignals.svelte` (supports signal-processing)
- `SectionPrescriptions.svelte` (supports medications-processing)
- `SectionDiagnosis.svelte` (supports medical-analysis diagnosis)
- `SectionRecommendations.svelte` (supports recommendations)
- `SectionSummary.svelte` (supports medical-analysis summary)
- `SectionPerformer.svelte` (supports medical-analysis performer)
- `SectionBody.svelte` (supports body parts)
- `SectionText.svelte` (supports text content)
- `SectionLinks.svelte` (supports related links)
- `SectionAttachments.svelte` (supports attachments)

### ❌ **Missing UI Components for Document Nodes**
1. **ecg-processing** → Need `SectionECG.svelte`
2. **imaging-processing** → Need `SectionImaging.svelte`
3. **imaging-findings-processing** → Need `SectionImagingFindings.svelte`
4. **echo-processing** → Need `SectionEcho.svelte`
5. **allergies-processing** → Need `SectionAllergies.svelte`
6. **procedures-processing** → Need `SectionProcedures.svelte`
7. **anesthesia-processing** → Need `SectionAnesthesia.svelte`
8. **microscopic-processing** → Need `SectionMicroscopic.svelte`
9. **triage-processing** → Need `SectionTriage.svelte`
10. **immunization-processing** → Need `SectionImmunizations.svelte`
11. **specimens-processing** → Need `SectionSpecimens.svelte`
12. **admission-processing** → Need `SectionAdmission.svelte`
13. **dental-processing** → Need `SectionDental.svelte`
14. **tumor-characteristics-processing** → Need `SectionTumorCharacteristics.svelte`
15. **treatment-plan-processing** → Need `SectionTreatmentPlan.svelte`
16. **treatment-response-processing** → Need `SectionTreatmentResponse.svelte`
17. **gross-findings-processing** → Need `SectionGrossFindings.svelte`
18. **special-stains-processing** → Need `SectionSpecialStains.svelte`
19. **social-history-processing** → Need `SectionSocialHistory.svelte`
20. **treatments-processing** → Need `SectionTreatments.svelte`
21. **assessment-processing** → Need `SectionAssessment.svelte`
22. **molecular-processing** → Need `SectionMolecular.svelte`
23. **medications-processing** → Need `SectionMedications.svelte` (separate from prescriptions)

## Component Architecture Patterns Analysis

Based on analysis of existing Section components, the following architectural patterns have been identified:

### **1. Component Structure Patterns**

#### **Basic Props Interface**
```typescript
interface Props {
    data: any;           // Core requirement - the data to display
    document?: Document; // Optional document context
    key?: string;        // Optional encryption key for protected data
}

let { data, document, key = undefined }: Props = $props();
```

#### **Data Validation Pattern**
```typescript
// Simple existence check
let hasData = $derived(data && data.length > 0);

// Complex data transformation
let processedData = $derived(() => {
    if (!data) return [];
    if (data.someProperty) return data.someProperty;
    if (Array.isArray(data)) return data;
    return [];
});
```

### **2. Layout and Styling Patterns**

#### **Standard Section Header**
```svelte
<h3 class="h3 heading -sticky">{$t('report.section-name')}</h3>
```

#### **Content Container Patterns**
1. **Page Block**: For simple content
   ```svelte
   <div class="page -block">
       <!-- content -->
   </div>
   ```

2. **Table List**: For structured data
   ```svelte
   <table class="table-list">
       <tbody>
           <!-- table content -->
       </tbody>
   </table>
   ```

3. **Card Layout**: For complex entities
   ```svelte
   <div class="contact-card card">
       <!-- card content -->
   </div>
   ```

#### **Common CSS Class Patterns**
- `.heading` with `.-sticky` modifier for section headers
- `.page -block` for content containers
- `.table-list` for tabular data
- `.actions` for interactive button groups
- `.panel` for content blocks with background
- Urgency classes: `.urgency-1` through `.urgency-5`
- Status classes: `.status-ok`, `.status-risk`, `.status-low`, `.status-high`

### **3. Internationalization Pattern**

All text uses the `$t()` function from `'$lib/i18n'`:
```typescript
import { t } from '$lib/i18n';

// Usage in template
{$t('report.section-name')}
```

Translation keys follow the pattern: `report.{section-name}` for section headings.

### **4. Data Handling Patterns**

#### **Empty State Handling**
```svelte
{#if data && data.length > 0}
    <!-- content -->
{:else if data}
    <!-- no data message -->
    <div class="page -block">
        <p class="no-data">{$t('report.no-data-message')}</p>
    </div>
{/if}
```

#### **Sorting and Filtering**
```typescript
function sortByUrgency(a: any, b: any) {
    return b.urgency - a.urgency;
}

let sortedData = $derived(data ? [...data].sort(sortByUrgency) : []);
```

### **5. Interactive Features**

#### **Action Buttons Pattern**
```svelte
<td class="-empty -actions">
    <div class="actions">
        <button onclick={() => handleAction()} aria-label="Action description">
            <svg>
                <use href="/icons.svg#icon-name" />
            </svg>
        </button>
    </div>
</td>
```

### **6. Standard Component Template**

```svelte
<script lang="ts">
    import { t } from '$lib/i18n';
    
    interface Props {
        data: any;
        document?: any;
        key?: string;
    }
    
    let { data, document, key }: Props = $props();
    
    // Data processing with $derived
    let hasData = $derived(data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0));
    
    // Utility functions
    // Event handlers
</script>

{#if hasData}
    <h3 class="h3 heading -sticky">{$t('report.section-name')}</h3>
    
    <div class="page -block">
        <!-- OR <table class="table-list"> for tabular data -->
        {#each data as item}
            <!-- Item rendering -->
        {/each}
    </div>
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.section-name')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-data-message')}</p>
    </div>
{/if}

<style>
    /* Component-specific styles */
</style>
```

## Implementation Strategy

### **Phase 1: Component Classification & Prioritization**

#### **🔥 High Priority (Core Medical Data)**
1. **SectionImaging.svelte** - imaging-processing
2. **SectionProcedures.svelte** - procedures-processing  
3. **SectionAllergies.svelte** - allergies-processing
4. **SectionMedications.svelte** - medications-processing (separate from prescriptions)
5. **SectionImmunizations.svelte** - immunization-processing

#### **🟡 Medium Priority (Specialized Medical)**
6. **SectionECG.svelte** - ecg-processing
7. **SectionEcho.svelte** - echo-processing
8. **SectionImagingFindings.svelte** - imaging-findings-processing
9. **SectionAnesthesia.svelte** - anesthesia-processing
10. **SectionMicroscopic.svelte** - microscopic-processing

#### **🟢 Lower Priority (Advanced Medical)**
11. **SectionTriage.svelte** - triage-processing
12. **SectionSpecimens.svelte** - specimens-processing
13. **SectionAdmission.svelte** - admission-processing
14. **SectionDental.svelte** - dental-processing
15. **SectionTreatments.svelte** - treatments-processing
16. **SectionAssessment.svelte** - assessment-processing
17. **SectionSocialHistory.svelte** - social-history-processing
18. **SectionMolecular.svelte** - molecular-processing

#### **🔬 Advanced Priority (Oncology/Pathology)**
19. **SectionTumorCharacteristics.svelte** - tumor-characteristics-processing
20. **SectionTreatmentPlan.svelte** - treatment-plan-processing
21. **SectionTreatmentResponse.svelte** - treatment-response-processing
22. **SectionGrossFindings.svelte** - gross-findings-processing
23. **SectionSpecialStains.svelte** - special-stains-processing

### **Phase 2: Component Template Strategy**

#### **Template Categories**

Based on data structure analysis, create 4 base templates:

1. **List Template** (for arrays of items like allergies, medications)
2. **Table Template** (for structured data like lab results, imaging findings)
3. **Card Template** (for complex objects like procedures, treatment plans)
4. **Text Template** (for narrative sections like assessment, social history)

### **Phase 3: Implementation Strategy**

#### **Step 1: Create Component Generator Script**
Create a script that generates components from templates based on:
- Schema definitions from `/src/lib/configurations/`
- Component type (list/table/card/text)
- Translation keys

#### **Step 2: Schema-Driven Generation**
For each missing component:
1. **Read the schema** from `src/lib/configurations/[section-name].ts`
2. **Analyze data structure** to determine template type
3. **Generate component** with proper data mapping
4. **Add translation keys** to i18n files
5. **Add to DocumentView.svelte** availableSections array

#### **Step 3: Batch Implementation Order**

**Batch 1: High Priority Core Medical (Week 1)**
- SectionAllergies, SectionMedications, SectionImmunizations
- These are common across all medical documents

**Batch 2: Diagnostic Data (Week 2)**  
- SectionImaging, SectionProcedures, SectionImagingFindings
- Critical for diagnostic workflows

**Batch 3: Specialized Medical (Week 3)**
- SectionECG, SectionEcho, SectionAnesthesia, SectionMicroscopic
- Domain-specific but important

**Batch 4: Workflow & Advanced (Week 4)**
- SectionTriage, SectionSpecimens, SectionAdmission, SectionDental
- Hospital workflow components

**Batch 5: Oncology/Research (Week 5)**
- SectionTumorCharacteristics, SectionTreatmentPlan, SectionMolecular
- Advanced medical analysis

### **Phase 4: Automation & Consistency**

#### **Automated Generation Features**
1. **Schema Parser**: Extract field definitions from configuration schemas
2. **Template Engine**: Generate components based on data patterns
3. **Translation Generator**: Auto-create i18n keys from schema descriptions
4. **Test Generator**: Create basic component tests

#### **Quality Assurance**
1. **Component Validator**: Ensure all follow architectural patterns
2. **Data Flow Testing**: Verify components receive correct data from multi-node processing
3. **Visual Consistency**: Ensure styling matches existing components
4. **Accessibility Audit**: Verify ARIA labels and keyboard navigation

### **Phase 5: Integration Strategy**

#### **DocumentView.svelte Updates**
For each new component, add to `availableSections`:
```typescript
{ id: 'allergies', component: SectionAllergies, name: 'Allergies' },
{ id: 'imaging', component: SectionImaging, name: 'Imaging Studies' },
// etc.
```

#### **Translation Integration**
Add to i18n files following the pattern:
```json
{
  "report": {
    "allergies": "Allergies & Reactions",
    "imaging": "Imaging Studies",
    "procedures": "Medical Procedures"
  }
}
```

## Implementation Benefits

1. **Scalability**: Template-based approach allows rapid component creation
2. **Consistency**: All components follow established patterns
3. **Maintainability**: Schema-driven generation keeps components in sync with data
4. **Flexibility**: Easy to modify templates for new requirements
5. **Quality**: Automated generation reduces human error

## Current DocumentView.svelte Integration Status

The `DocumentView.svelte` file already includes data mapping for all missing sections (lines 79-125), but the components are not yet created and not included in the `availableSections` array (lines 24-40).

### **Data Mapping Already Available**
```typescript
// These data mappings exist but components are missing:
case 'imaging': return document.content.imaging;
case 'dental': return document.content.dental;
case 'immunizations': return document.content.immunizations;
case 'admission': return document.content.admission;
case 'procedures': return document.content.procedures;
case 'anesthesia': return document.content.anesthesia;
case 'specimens': return document.content.specimens;
case 'microscopic': return document.content.microscopic;
case 'molecular': return document.content.molecular;
case 'ecg': return document.content.ecg;
case 'echo': return document.content.echo;
case 'triage': return document.content.triage;
case 'treatments': return document.content.treatments;
case 'assessment': return document.content.assessment;
case 'tumorCharacteristics': return document.content.tumorCharacteristics;
case 'treatmentPlan': return document.content.treatmentPlan;
case 'treatmentResponse': return document.content.treatmentResponse;
case 'imagingFindings': return document.content.imagingFindings;
case 'grossFindings': return document.content.grossFindings;
case 'specialStains': return document.content.specialStains;
case 'allergies': return document.content.allergies;
case 'medications': return document.content.medications;
case 'socialHistory': return document.content.socialHistory;
```

## Next Steps

1. **Create component generator script** to automate template-based component creation
2. **Start with Batch 1** (High Priority) components
3. **Establish the pattern** with one complete component implementation
4. **Scale to all missing components** using the established template system

## Related Files

- `/src/components/documents/DocumentView.svelte` - Main integration point
- `/src/lib/langgraph/factories/universal-node-factory.ts` - Node definitions
- `/src/lib/configurations/` - Schema definitions for each section
- `/src/components/documents/Section*.svelte` - Existing component patterns

---

*This strategy ensures we build robust, consistent components that integrate seamlessly with our multi-node processing system while maintaining the high-quality UX patterns already established.*