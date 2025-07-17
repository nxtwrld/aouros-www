<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
        key?: string;
    }

    let { data, document, key }: Props = $props();
    
    let hasMicroscopic = $derived(data && data.hasMicroscopic);
    
    let specimens = $derived(data?.specimens || []);
    let findings = $derived(data?.findings || []);
    let diagnosis = $derived(data?.diagnosis || '');
    let pathologist = $derived(data?.pathologist);
    let stains = $derived(data?.stains || []);
    let recommendations = $derived(data?.recommendations || []);
    let additionalComments = $derived(data?.additionalComments || '');
    
    function getGradeClass(grade: string): string {
        const gradeClasses: Record<string, string> = {
            'low_grade': 'grade-low',
            'intermediate_grade': 'grade-intermediate',
            'high_grade': 'grade-high',
            'well_differentiated': 'grade-well',
            'moderately_differentiated': 'grade-moderate',
            'poorly_differentiated': 'grade-poor',
            'undifferentiated': 'grade-undifferentiated'
        };
        return gradeClasses[grade] || 'grade-unknown';
    }
    
    function getSeverityClass(severity: string): string {
        const severityClasses: Record<string, string> = {
            'mild': 'severity-mild',
            'moderate': 'severity-moderate',
            'severe': 'severity-severe',
            'marked': 'severity-marked'
        };
        return severityClasses[severity] || 'severity-unknown';
    }
    
    function getStainResultClass(result: string): string {
        const resultClasses: Record<string, string> = {
            'positive': 'stain-positive',
            'negative': 'stain-negative',
            'weak_positive': 'stain-weak',
            'strong_positive': 'stain-strong',
            'focal_positive': 'stain-focal'
        };
        return resultClasses[result] || 'stain-unknown';
    }
</script>

{#if hasMicroscopic}
    <h3 class="h3 heading -sticky">{$t('report.microscopic-examination')}</h3>
    
    <!-- Specimens -->
    {#if specimens.length > 0}
        <h4 class="section-title-sub">{$t('report.specimens')}</h4>
        <ul class="list-items">
            {#each specimens as specimen}
                <li class="panel specimen-item">
                    <div class="specimen-header">
                        <h5 class="specimen-name">{specimen.name}</h5>
                        {#if specimen.site}
                            <span class="specimen-site">{specimen.site}</span>
                        {/if}
                    </div>
                    
                    <div class="specimen-details">
                        {#if specimen.type}
                            <div class="detail-item">
                                <span class="label">{$t('report.type')}:</span>
                                <span class="value">{specimen.type}</span>
                            </div>
                        {/if}
                        
                        {#if specimen.size}
                            <div class="detail-item">
                                <span class="label">{$t('report.size')}:</span>
                                <span class="value">{specimen.size}</span>
                            </div>
                        {/if}
                        
                        {#if specimen.description}
                            <div class="detail-item">
                                <span class="label">{$t('report.description')}:</span>
                                <span class="value">{specimen.description}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Microscopic Findings -->
    {#if findings.length > 0}
        <h4 class="section-title-sub">{$t('report.microscopic-findings')}</h4>
        <ul class="list-items">
            {#each findings as finding}
                <li class="panel {getSeverityClass(finding.severity)}">
                    <div class="finding-header">
                        <h5 class="finding-title">{finding.tissue || finding.location}</h5>
                        {#if finding.severity}
                            <span class="severity-badge {getSeverityClass(finding.severity)}">
                                {$t(`medical.enums.severity_levels.${finding.severity}`)}
                            </span>
                        {/if}
                    </div>
                    
                    <div class="finding-content">
                        <p class="finding-description">{finding.description}</p>
                        
                        {#if finding.architecture}
                            <div class="detail-item">
                                <span class="label">{$t('report.architecture')}:</span>
                                <span class="value">{finding.architecture}</span>
                            </div>
                        {/if}
                        
                        {#if finding.cellularChanges}
                            <div class="detail-item">
                                <span class="label">{$t('report.cellular-changes')}:</span>
                                <span class="value">{finding.cellularChanges}</span>
                            </div>
                        {/if}
                        
                        {#if finding.inflammation}
                            <div class="detail-item">
                                <span class="label">{$t('report.inflammation')}:</span>
                                <span class="value">{finding.inflammation}</span>
                            </div>
                        {/if}
                        
                        {#if finding.grade}
                            <div class="detail-item">
                                <span class="label">{$t('report.grade')}:</span>
                                <span class="value {getGradeClass(finding.grade)}">
                                    {$t(`medical.enums.histologic_grades.${finding.grade}`)}
                                </span>
                            </div>
                        {/if}
                        
                        {#if finding.margins}
                            <div class="detail-item">
                                <span class="label">{$t('report.margins')}:</span>
                                <span class="value">{finding.margins}</span>
                            </div>
                        {/if}
                        
                        {#if finding.vascularInvasion !== undefined}
                            <div class="detail-item">
                                <span class="label">{$t('report.vascular-invasion')}:</span>
                                <span class="value {finding.vascularInvasion ? 'positive' : 'negative'}">
                                    {finding.vascularInvasion ? $t('report.present') : $t('report.absent')}
                                </span>
                            </div>
                        {/if}
                        
                        {#if finding.lymphaticInvasion !== undefined}
                            <div class="detail-item">
                                <span class="label">{$t('report.lymphatic-invasion')}:</span>
                                <span class="value {finding.lymphaticInvasion ? 'positive' : 'negative'}">
                                    {finding.lymphaticInvasion ? $t('report.present') : $t('report.absent')}
                                </span>
                            </div>
                        {/if}
                        
                        {#if finding.perineural !== undefined}
                            <div class="detail-item">
                                <span class="label">{$t('report.perineural-invasion')}:</span>
                                <span class="value {finding.perineural ? 'positive' : 'negative'}">
                                    {finding.perineural ? $t('report.present') : $t('report.absent')}
                                </span>
                            </div>
                        {/if}
                        
                        {#if finding.mitoticRate}
                            <div class="detail-item">
                                <span class="label">{$t('report.mitotic-rate')}:</span>
                                <span class="value">{finding.mitoticRate}</span>
                            </div>
                        {/if}
                        
                        {#if finding.necrosisPercent}
                            <div class="detail-item">
                                <span class="label">{$t('report.necrosis')}:</span>
                                <span class="value">{finding.necrosisPercent}%</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Special Stains -->
    {#if stains.length > 0}
        <h4 class="section-title-sub">{$t('report.special-stains')}</h4>
        <div class="page -block">
            <div class="stains-grid">
                {#each stains as stain}
                    <div class="stain-item">
                        <div class="stain-header">
                            <span class="stain-name">{stain.name}</span>
                            <span class="stain-result {getStainResultClass(stain.result)}">
                                {$t(`medical.enums.stain_results.${stain.result}`)}
                            </span>
                        </div>
                        
                        {#if stain.pattern}
                            <div class="stain-pattern">
                                <span class="label">{$t('report.pattern')}:</span>
                                <span class="value">{stain.pattern}</span>
                            </div>
                        {/if}
                        
                        {#if stain.percentage}
                            <div class="stain-percentage">
                                <span class="label">{$t('report.percentage')}:</span>
                                <span class="value">{stain.percentage}%</span>
                            </div>
                        {/if}
                        
                        {#if stain.intensity}
                            <div class="stain-intensity">
                                <span class="label">{$t('report.intensity')}:</span>
                                <span class="value">{stain.intensity}</span>
                            </div>
                        {/if}
                        
                        {#if stain.notes}
                            <div class="stain-notes">
                                <span class="label">{$t('report.notes')}:</span>
                                <span class="value">{stain.notes}</span>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    {/if}
    
    <!-- Microscopic Diagnosis -->
    {#if diagnosis}
        <h4 class="section-title-sub">{$t('report.microscopic-diagnosis')}</h4>
        <div class="page -block">
            <div class="diagnosis-content">
                <p class="diagnosis-text">{diagnosis}</p>
            </div>
        </div>
    {/if}
    
    <!-- Recommendations -->
    {#if recommendations.length > 0}
        <h4 class="section-title-sub">{$t('report.recommendations')}</h4>
        <ul class="list-items">
            {#each recommendations as recommendation}
                <li class="panel recommendation-item">
                    <div class="recommendation-content">
                        <p class="recommendation-text">{recommendation.text}</p>
                        
                        {#if recommendation.urgency}
                            <div class="recommendation-urgency">
                                <span class="label">{$t('report.urgency')}:</span>
                                <span class="value urgency-{recommendation.urgency}">
                                    {$t(`medical.enums.urgency_levels.${recommendation.urgency}`)}
                                </span>
                            </div>
                        {/if}
                        
                        {#if recommendation.timeframe}
                            <div class="recommendation-timeframe">
                                <span class="label">{$t('report.timeframe')}:</span>
                                <span class="value">{recommendation.timeframe}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Additional Comments -->
    {#if additionalComments}
        <h4 class="section-title-sub">{$t('report.additional-comments')}</h4>
        <div class="page -block">
            <div class="comments-content">
                <p class="comments-text">{additionalComments}</p>
            </div>
        </div>
    {/if}
    
    <!-- Pathologist Information -->
    {#if pathologist}
        <h4 class="section-title-sub">{$t('report.pathologist')}</h4>
        <div class="page -block">
            <div class="pathologist-info">
                <span class="pathologist-name">{pathologist.name}</span>
                {#if pathologist.title}
                    <span class="pathologist-title">{pathologist.title}</span>
                {/if}
                {#if pathologist.department}
                    <span class="pathologist-department">{pathologist.department}</span>
                {/if}
            </div>
        </div>
    {/if}
    
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.microscopic-examination')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-microscopic-data')}</p>
    </div>
{/if}

<style>
    .specimen-item {
        border-left-color: var(--color-info);
    }
    
    .specimen-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .specimen-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .specimen-site {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
        background-color: var(--color-background-secondary);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
    }
    
    .specimen-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .finding-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .finding-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .severity-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .severity-mild {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .severity-moderate {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .severity-severe {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .severity-marked {
        background-color: var(--color-danger);
        color: white;
    }
    
    .finding-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .finding-description {
        margin: 0 0 0.5rem 0;
        color: var(--color-text-primary);
        line-height: 1.5;
    }
    
    .grade-low {
        color: var(--color-success-dark);
        font-weight: 600;
    }
    
    .grade-intermediate {
        color: var(--color-warning-dark);
        font-weight: 600;
    }
    
    .grade-high {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .grade-well {
        color: var(--color-success-dark);
        font-weight: 600;
    }
    
    .grade-moderate {
        color: var(--color-warning-dark);
        font-weight: 600;
    }
    
    .grade-poor {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .grade-undifferentiated {
        color: var(--color-danger);
        font-weight: 600;
    }
    
    .positive {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .negative {
        color: var(--color-success-dark);
        font-weight: 600;
    }
    
    .stains-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1rem;
    }
    
    .stain-item {
        padding: 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
        border: 1px solid var(--color-border);
    }
    
    .stain-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .stain-name {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .stain-result {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .stain-positive {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .stain-negative {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
    }
    
    .stain-weak {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .stain-strong {
        background-color: var(--color-success);
        color: white;
    }
    
    .stain-focal {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .stain-pattern,
    .stain-percentage,
    .stain-intensity,
    .stain-notes {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        margin-bottom: 0.5rem;
    }
    
    .stain-pattern .label,
    .stain-percentage .label,
    .stain-intensity .label,
    .stain-notes .label {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        min-width: 70px;
    }
    
    .stain-pattern .value,
    .stain-percentage .value,
    .stain-intensity .value,
    .stain-notes .value {
        font-size: 0.9rem;
        color: var(--color-text-primary);
    }
    
    .diagnosis-content {
        background-color: var(--color-background-secondary);
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid var(--color-primary);
    }
    
    .diagnosis-text {
        margin: 0;
        font-size: 1.1rem;
        line-height: 1.6;
        color: var(--color-text-primary);
        font-weight: 500;
    }
    
    .recommendation-item {
        border-left-color: var(--color-warning);
    }
    
    .recommendation-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .recommendation-text {
        margin: 0;
        color: var(--color-text-primary);
        line-height: 1.5;
    }
    
    .recommendation-urgency,
    .recommendation-timeframe {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    
    .urgency-low {
        color: var(--color-success-dark);
    }
    
    .urgency-medium {
        color: var(--color-warning-dark);
    }
    
    .urgency-high {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .urgency-critical {
        color: var(--color-danger);
        font-weight: 600;
    }
    
    .comments-content {
        background-color: var(--color-background-secondary);
        padding: 1rem;
        border-radius: 0.5rem;
    }
    
    .comments-text {
        margin: 0;
        color: var(--color-text-secondary);
        line-height: 1.5;
        font-style: italic;
    }
    
    .pathologist-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .pathologist-name {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .pathologist-title,
    .pathologist-department {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
    }
    
    .detail-item {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
    }
    
    .label {
        font-weight: 500;
        color: var(--color-text-secondary);
        min-width: 120px;
        flex-shrink: 0;
    }
    
    .value {
        color: var(--color-text-primary);
        flex: 1;
        line-height: 1.4;
    }
    
    /* Panel severity coloring */
    .severity-mild {
        border-left-color: var(--color-info);
    }
    
    .severity-moderate {
        border-left-color: var(--color-warning);
    }
    
    .severity-severe {
        border-left-color: var(--color-danger);
    }
    
    .severity-marked {
        border-left-color: var(--color-danger);
        border-left-width: 4px;
    }
</style>