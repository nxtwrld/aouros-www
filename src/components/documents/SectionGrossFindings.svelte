<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
        key?: string;
    }

    let { data, document, key }: Props = $props();
    
    let hasGrossFindings = $derived(data && data.hasGrossFindings);
    
    let macroscopicFindings = $derived(data?.macroscopicFindings || []);
    let specimenDescription = $derived(data?.specimenDescription || {});
    let measurements = $derived(data?.measurements || []);
    let appearance = $derived(data?.appearance || {});
    let sectioning = $derived(data?.sectioning || {});
    let specialProcedures = $derived(data?.specialProcedures || []);
    let photographer = $derived(data?.photographer);
    let pathologist = $derived(data?.pathologist);
    let diagnosisImpression = $derived(data?.diagnosisImpression);
    
    function getAbnormalityClass(abnormality: string): string {
        const abnormalityClasses: Record<string, string> = {
            'normal': 'abnormality-normal',
            'mild': 'abnormality-mild',
            'moderate': 'abnormality-moderate',
            'severe': 'abnormality-severe',
            'critical': 'abnormality-critical'
        };
        return abnormalityClasses[abnormality] || 'abnormality-unknown';
    }
    
    function getConsistencyClass(consistency: string): string {
        const consistencyClasses: Record<string, string> = {
            'soft': 'consistency-soft',
            'firm': 'consistency-firm',
            'hard': 'consistency-hard',
            'cystic': 'consistency-cystic',
            'necrotic': 'consistency-necrotic',
            'hemorrhagic': 'consistency-hemorrhagic'
        };
        return consistencyClasses[consistency] || 'consistency-unknown';
    }
    
    function getQualityClass(quality: string): string {
        const qualityClasses: Record<string, string> = {
            'excellent': 'quality-excellent',
            'good': 'quality-good',
            'adequate': 'quality-adequate',
            'poor': 'quality-poor',
            'inadequate': 'quality-inadequate'
        };
        return qualityClasses[quality] || 'quality-unknown';
    }
    
    function getUrgencyClass(urgency: string): string {
        const urgencyClasses: Record<string, string> = {
            'routine': 'urgency-routine',
            'urgent': 'urgency-urgent',
            'stat': 'urgency-stat'
        };
        return urgencyClasses[urgency] || 'urgency-routine';
    }
    
    function formatMeasurement(measurement: any): string {
        if (!measurement) return '';
        
        if (typeof measurement === 'string') return measurement;
        
        if (measurement.length && measurement.width && measurement.height) {
            return `${measurement.length} × ${measurement.width} × ${measurement.height} ${measurement.unit || 'cm'}`;
        }
        
        if (measurement.diameter) {
            return `${measurement.diameter} ${measurement.unit || 'cm'} diameter`;
        }
        
        if (measurement.value && measurement.unit) {
            return `${measurement.value} ${measurement.unit}`;
        }
        
        return measurement.toString();
    }
    
    function formatWeight(weight: any): string {
        if (!weight) return '';
        
        if (typeof weight === 'string') return weight;
        
        if (weight.value && weight.unit) {
            return `${weight.value} ${weight.unit}`;
        }
        
        return weight.toString();
    }
    
    function formatDate(dateString: string): string {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
            return dateString;
        }
    }
</script>

{#if hasGrossFindings}
    <h3 class="h3 heading -sticky">{$t('report.gross-findings')}</h3>
    
    <!-- Specimen Description -->
    {#if Object.keys(specimenDescription).length > 0}
        <h4 class="section-title-sub">{$t('report.specimen-description')}</h4>
        <div class="page -block">
            <div class="specimen-description-info">
                {#if specimenDescription.type}
                    <div class="detail-item">
                        <span class="label">{$t('report.specimen-type')}:</span>
                        <span class="value">{$t(`medical.enums.specimen_types.${specimenDescription.type}`)}</span>
                    </div>
                {/if}
                
                {#if specimenDescription.anatomicalLocation}
                    <div class="detail-item">
                        <span class="label">{$t('report.anatomical-location')}:</span>
                        <span class="value">{specimenDescription.anatomicalLocation}</span>
                    </div>
                {/if}
                
                {#if specimenDescription.clinicalHistory}
                    <div class="detail-item">
                        <span class="label">{$t('report.clinical-history')}:</span>
                        <span class="value">{specimenDescription.clinicalHistory}</span>
                    </div>
                {/if}
                
                {#if specimenDescription.receivedCondition}
                    <div class="detail-item">
                        <span class="label">{$t('report.received-condition')}:</span>
                        <span class="value">{specimenDescription.receivedCondition}</span>
                    </div>
                {/if}
                
                {#if specimenDescription.fixative}
                    <div class="detail-item">
                        <span class="label">{$t('report.fixative')}:</span>
                        <span class="value">{specimenDescription.fixative}</span>
                    </div>
                {/if}
                
                {#if specimenDescription.receivedDate}
                    <div class="detail-item">
                        <span class="label">{$t('report.received-date')}:</span>
                        <span class="value">{formatDate(specimenDescription.receivedDate)}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Measurements -->
    {#if measurements.length > 0}
        <h4 class="section-title-sub">{$t('report.measurements')}</h4>
        <div class="page -block">
            <div class="measurements-grid">
                {#each measurements as measurement}
                    <div class="measurement-item">
                        <div class="measurement-header">
                            <span class="measurement-label">{measurement.label}</span>
                            {#if measurement.accuracy}
                                <span class="accuracy-badge {getQualityClass(measurement.accuracy)}">
                                    {$t(`medical.enums.accuracy_levels.${measurement.accuracy}`)}
                                </span>
                            {/if}
                        </div>
                        
                        <div class="measurement-value">
                            {formatMeasurement(measurement)}
                        </div>
                        
                        {#if measurement.notes}
                            <div class="measurement-notes">
                                <span class="notes-text">{measurement.notes}</span>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    {/if}
    
    <!-- Appearance -->
    {#if Object.keys(appearance).length > 0}
        <h4 class="section-title-sub">{$t('report.appearance')}</h4>
        <div class="page -block">
            <div class="appearance-info">
                {#if appearance.color}
                    <div class="detail-item">
                        <span class="label">{$t('report.color')}:</span>
                        <span class="value">{appearance.color}</span>
                    </div>
                {/if}
                
                {#if appearance.consistency}
                    <div class="detail-item">
                        <span class="label">{$t('report.consistency')}:</span>
                        <span class="value {getConsistencyClass(appearance.consistency)}">
                            {$t(`medical.enums.consistency_types.${appearance.consistency}`)}
                        </span>
                    </div>
                {/if}
                
                {#if appearance.surface}
                    <div class="detail-item">
                        <span class="label">{$t('report.surface')}:</span>
                        <span class="value">{appearance.surface}</span>
                    </div>
                {/if}
                
                {#if appearance.texture}
                    <div class="detail-item">
                        <span class="label">{$t('report.texture')}:</span>
                        <span class="value">{appearance.texture}</span>
                    </div>
                {/if}
                
                {#if appearance.shape}
                    <div class="detail-item">
                        <span class="label">{$t('report.shape')}:</span>
                        <span class="value">{appearance.shape}</span>
                    </div>
                {/if}
                
                {#if appearance.margins}
                    <div class="detail-item">
                        <span class="label">{$t('report.margins')}:</span>
                        <span class="value">{appearance.margins}</span>
                    </div>
                {/if}
                
                {#if appearance.weight}
                    <div class="detail-item">
                        <span class="label">{$t('report.weight')}:</span>
                        <span class="value">{formatWeight(appearance.weight)}</span>
                    </div>
                {/if}
                
                {#if appearance.abnormalities?.length > 0}
                    <div class="abnormalities-section">
                        <span class="label">{$t('report.abnormalities')}:</span>
                        <div class="abnormalities-list">
                            {#each appearance.abnormalities as abnormality}
                                <div class="abnormality-item">
                                    <span class="abnormality-description">{abnormality.description}</span>
                                    {#if abnormality.severity}
                                        <span class="abnormality-severity {getAbnormalityClass(abnormality.severity)}">
                                            {$t(`medical.enums.severity_levels.${abnormality.severity}`)}
                                        </span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Macroscopic Findings -->
    {#if macroscopicFindings.length > 0}
        <h4 class="section-title-sub">{$t('report.macroscopic-findings')}</h4>
        <ul class="list-items">
            {#each macroscopicFindings as finding}
                <li class="panel finding-item {getAbnormalityClass(finding.significance)}">
                    <div class="finding-header">
                        <div class="finding-main">
                            <h5 class="finding-title">{finding.title}</h5>
                            {#if finding.location}
                                <span class="finding-location">{finding.location}</span>
                            {/if}
                        </div>
                        
                        <div class="finding-badges">
                            {#if finding.significance}
                                <span class="significance-badge {getAbnormalityClass(finding.significance)}">
                                    {$t(`medical.enums.significance_levels.${finding.significance}`)}
                                </span>
                            {/if}
                            {#if finding.urgency}
                                <span class="urgency-badge {getUrgencyClass(finding.urgency)}">
                                    {$t(`medical.enums.urgency_levels.${finding.urgency}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="finding-details">
                        <p class="finding-description">{finding.description}</p>
                        
                        {#if finding.size}
                            <div class="detail-item">
                                <span class="label">{$t('report.size')}:</span>
                                <span class="value">{formatMeasurement(finding.size)}</span>
                            </div>
                        {/if}
                        
                        {#if finding.color}
                            <div class="detail-item">
                                <span class="label">{$t('report.color')}:</span>
                                <span class="value">{finding.color}</span>
                            </div>
                        {/if}
                        
                        {#if finding.consistency}
                            <div class="detail-item">
                                <span class="label">{$t('report.consistency')}:</span>
                                <span class="value {getConsistencyClass(finding.consistency)}">
                                    {$t(`medical.enums.consistency_types.${finding.consistency}`)}
                                </span>
                            </div>
                        {/if}
                        
                        {#if finding.distribution}
                            <div class="detail-item">
                                <span class="label">{$t('report.distribution')}:</span>
                                <span class="value">{finding.distribution}</span>
                            </div>
                        {/if}
                        
                        {#if finding.associatedChanges?.length > 0}
                            <div class="associated-changes-section">
                                <span class="label">{$t('report.associated-changes')}:</span>
                                <ul class="associated-changes-list">
                                    {#each finding.associatedChanges as change}
                                        <li>{change}</li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}
                    </div>
                    
                    {#if finding.clinicalCorrelation}
                        <div class="clinical-correlation">
                            <span class="label">{$t('report.clinical-correlation')}:</span>
                            <p class="correlation-text">{finding.clinicalCorrelation}</p>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Sectioning -->
    {#if Object.keys(sectioning).length > 0}
        <h4 class="section-title-sub">{$t('report.sectioning')}</h4>
        <div class="page -block">
            <div class="sectioning-info">
                {#if sectioning.method}
                    <div class="detail-item">
                        <span class="label">{$t('report.sectioning-method')}:</span>
                        <span class="value">{sectioning.method}</span>
                    </div>
                {/if}
                
                {#if sectioning.numberOfSections}
                    <div class="detail-item">
                        <span class="label">{$t('report.number-of-sections')}:</span>
                        <span class="value">{sectioning.numberOfSections}</span>
                    </div>
                {/if}
                
                {#if sectioning.thickness}
                    <div class="detail-item">
                        <span class="label">{$t('report.section-thickness')}:</span>
                        <span class="value">{sectioning.thickness}</span>
                    </div>
                {/if}
                
                {#if sectioning.orientation}
                    <div class="detail-item">
                        <span class="label">{$t('report.orientation')}:</span>
                        <span class="value">{sectioning.orientation}</span>
                    </div>
                {/if}
                
                {#if sectioning.representativeSections?.length > 0}
                    <div class="representative-sections-section">
                        <span class="label">{$t('report.representative-sections')}:</span>
                        <div class="representative-sections-list">
                            {#each sectioning.representativeSections as section}
                                <div class="section-item">
                                    <span class="section-id">{section.id}</span>
                                    <span class="section-description">{section.description}</span>
                                    {#if section.specialStains}
                                        <span class="special-stains">{section.specialStains.join(', ')}</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if sectioning.notes}
                    <div class="sectioning-notes">
                        <span class="label">{$t('report.sectioning-notes')}:</span>
                        <p class="notes-text">{sectioning.notes}</p>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Special Procedures -->
    {#if specialProcedures.length > 0}
        <h4 class="section-title-sub">{$t('report.special-procedures')}</h4>
        <ul class="list-items">
            {#each specialProcedures as procedure}
                <li class="panel procedure-item">
                    <div class="procedure-header">
                        <div class="procedure-main">
                            <h5 class="procedure-name">{procedure.name}</h5>
                            <span class="procedure-type">{$t(`medical.enums.procedure_types.${procedure.type}`)}</span>
                        </div>
                        
                        {#if procedure.urgency}
                            <span class="urgency-badge {getUrgencyClass(procedure.urgency)}">
                                {$t(`medical.enums.urgency_levels.${procedure.urgency}`)}
                            </span>
                        {/if}
                    </div>
                    
                    <div class="procedure-details">
                        <p class="procedure-description">{procedure.description}</p>
                        
                        {#if procedure.technique}
                            <div class="detail-item">
                                <span class="label">{$t('report.technique')}:</span>
                                <span class="value">{procedure.technique}</span>
                            </div>
                        {/if}
                        
                        {#if procedure.equipment}
                            <div class="detail-item">
                                <span class="label">{$t('report.equipment')}:</span>
                                <span class="value">{procedure.equipment}</span>
                            </div>
                        {/if}
                        
                        {#if procedure.duration}
                            <div class="detail-item">
                                <span class="label">{$t('report.duration')}:</span>
                                <span class="value">{procedure.duration}</span>
                            </div>
                        {/if}
                        
                        {#if procedure.performer}
                            <div class="detail-item">
                                <span class="label">{$t('report.performer')}:</span>
                                <span class="value">{procedure.performer}</span>
                            </div>
                        {/if}
                        
                        {#if procedure.results}
                            <div class="detail-item">
                                <span class="label">{$t('report.results')}:</span>
                                <span class="value">{procedure.results}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Diagnosis Impression -->
    {#if diagnosisImpression}
        <h4 class="section-title-sub">{$t('report.diagnosis-impression')}</h4>
        <div class="page -block">
            <div class="diagnosis-impression">
                <p class="impression-text">{diagnosisImpression}</p>
            </div>
        </div>
    {/if}
    
    <!-- Staff Information -->
    {#if pathologist || photographer}
        <h4 class="section-title-sub">{$t('report.staff-information')}</h4>
        <div class="page -block">
            <div class="staff-info">
                {#if pathologist}
                    <div class="staff-member">
                        <span class="label">{$t('report.pathologist')}:</span>
                        <div class="staff-details">
                            <span class="staff-name">{pathologist.name}</span>
                            {#if pathologist.title}
                                <span class="staff-title">{pathologist.title}</span>
                            {/if}
                            {#if pathologist.department}
                                <span class="staff-department">{pathologist.department}</span>
                            {/if}
                        </div>
                    </div>
                {/if}
                
                {#if photographer}
                    <div class="staff-member">
                        <span class="label">{$t('report.photographer')}:</span>
                        <div class="staff-details">
                            <span class="staff-name">{photographer.name}</span>
                            {#if photographer.title}
                                <span class="staff-title">{photographer.title}</span>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.gross-findings')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-gross-findings-data')}</p>
    </div>
{/if}

<style>
    .specimen-description-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .measurements-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }
    
    .measurement-item {
        background-color: var(--color-background-secondary);
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 3px solid var(--color-primary);
    }
    
    .measurement-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .measurement-label {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .accuracy-badge {
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .measurement-value {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--color-primary);
        margin-bottom: 0.25rem;
    }
    
    .measurement-notes {
        margin-top: 0.5rem;
    }
    
    .notes-text {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-style: italic;
        line-height: 1.4;
    }
    
    .appearance-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .abnormalities-section {
        margin-top: 0.75rem;
    }
    
    .abnormalities-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    
    .abnormality-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
        gap: 0.5rem;
    }
    
    .abnormality-description {
        color: var(--color-text-primary);
        flex: 1;
    }
    
    .abnormality-severity {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .finding-item {
        border-left-color: var(--color-info);
    }
    
    .finding-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .finding-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .finding-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .finding-location {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .finding-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .finding-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .finding-description {
        margin: 0 0 0.5rem 0;
        color: var(--color-text-primary);
        line-height: 1.5;
    }
    
    .associated-changes-section {
        margin-top: 0.75rem;
    }
    
    .associated-changes-list {
        margin: 0.5rem 0 0 1.5rem;
        padding: 0;
    }
    
    .associated-changes-list li {
        margin-bottom: 0.25rem;
        color: var(--color-text-secondary);
    }
    
    .clinical-correlation {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--color-border);
    }
    
    .correlation-text {
        margin: 0.25rem 0 0 0;
        color: var(--color-text-primary);
        line-height: 1.5;
        font-style: italic;
    }
    
    .sectioning-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .representative-sections-section {
        margin-top: 0.75rem;
    }
    
    .representative-sections-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    
    .section-item {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        padding: 0.5rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
        flex-wrap: wrap;
    }
    
    .section-id {
        font-weight: 600;
        color: var(--color-primary);
        background-color: var(--color-primary-light);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        min-width: 40px;
        text-align: center;
    }
    
    .section-description {
        color: var(--color-text-primary);
        flex: 1;
    }
    
    .special-stains {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
        font-style: italic;
    }
    
    .sectioning-notes {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--color-border);
    }
    
    .procedure-item {
        border-left-color: var(--color-secondary);
    }
    
    .procedure-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .procedure-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .procedure-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .procedure-type {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .procedure-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .procedure-description {
        margin: 0 0 0.5rem 0;
        color: var(--color-text-primary);
        line-height: 1.5;
    }
    
    .diagnosis-impression {
        padding: 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
        border-left: 4px solid var(--color-primary);
    }
    
    .impression-text {
        margin: 0;
        color: var(--color-text-primary);
        line-height: 1.6;
        font-size: 1.05rem;
    }
    
    .staff-info {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .staff-member {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
    }
    
    .staff-details {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }
    
    .staff-name {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .staff-title,
    .staff-department {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
    }
    
    .significance-badge,
    .urgency-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .abnormality-normal {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .abnormality-mild {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .abnormality-moderate {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .abnormality-severe {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .abnormality-critical {
        background-color: var(--color-danger);
        color: white;
    }
    
    .consistency-soft {
        color: var(--color-info-dark);
    }
    
    .consistency-firm {
        color: var(--color-text-primary);
    }
    
    .consistency-hard {
        color: var(--color-warning-dark);
    }
    
    .consistency-cystic {
        color: var(--color-info-dark);
    }
    
    .consistency-necrotic {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .consistency-hemorrhagic {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .quality-excellent {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .quality-good {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .quality-adequate {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .quality-poor {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .quality-inadequate {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .urgency-routine {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .urgency-urgent {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .urgency-stat {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .detail-item {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
    }
    
    .label {
        font-weight: 500;
        color: var(--color-text-secondary);
        min-width: 150px;
        flex-shrink: 0;
    }
    
    .value {
        color: var(--color-text-primary);
        flex: 1;
        line-height: 1.4;
    }
    
    /* Panel coloring based on abnormality levels */
    .abnormality-normal {
        border-left-color: var(--color-success);
    }
    
    .abnormality-mild {
        border-left-color: var(--color-info);
    }
    
    .abnormality-moderate {
        border-left-color: var(--color-warning);
    }
    
    .abnormality-severe {
        border-left-color: var(--color-danger);
    }
    
    .abnormality-critical {
        border-left-color: var(--color-danger);
        border-left-width: 4px;
    }
</style>