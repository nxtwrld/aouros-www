<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
        key?: string;
    }

    let { data, document, key }: Props = $props();
    
    let hasTreatmentResponse = $derived(data && data.hasTreatmentResponse);
    
    let overallResponse = $derived(data?.overallResponse || {});
    let responses = $derived(data?.responses || []);
    let sideEffects = $derived(data?.sideEffects || []);
    let adherence = $derived(data?.adherence || {});
    let qualityOfLife = $derived(data?.qualityOfLife || {});
    let functionalStatus = $derived(data?.functionalStatus || {});
    let biomarkers = $derived(data?.biomarkers || []);
    let imaging = $derived(data?.imaging || []);
    let recommendations = $derived(data?.recommendations || []);
    
    function getResponseClass(response: string): string {
        const responseClasses: Record<string, string> = {
            'complete': 'response-complete',
            'partial': 'response-partial',
            'stable': 'response-stable',
            'progression': 'response-progression',
            'mixed': 'response-mixed'
        };
        return responseClasses[response] || 'response-unknown';
    }
    
    function getSeverityClass(severity: string): string {
        const severityClasses: Record<string, string> = {
            'mild': 'severity-mild',
            'moderate': 'severity-moderate',
            'severe': 'severity-severe',
            'life_threatening': 'severity-critical'
        };
        return severityClasses[severity] || 'severity-unknown';
    }
    
    function getAdherenceClass(adherence: string): string {
        const adherenceClasses: Record<string, string> = {
            'excellent': 'adherence-excellent',
            'good': 'adherence-good',
            'fair': 'adherence-fair',
            'poor': 'adherence-poor'
        };
        return adherenceClasses[adherence] || 'adherence-unknown';
    }
    
    function getChangeClass(change: string): string {
        const changeClasses: Record<string, string> = {
            'improved': 'change-improved',
            'stable': 'change-stable',
            'deteriorated': 'change-deteriorated',
            'significant_improvement': 'change-significant-improvement',
            'significant_deterioration': 'change-significant-deterioration'
        };
        return changeClasses[change] || 'change-unknown';
    }
    
    function getTrendClass(trend: string): string {
        const trendClasses: Record<string, string> = {
            'improving': 'trend-improving',
            'stable': 'trend-stable',
            'declining': 'trend-declining',
            'fluctuating': 'trend-fluctuating'
        };
        return trendClasses[trend] || 'trend-unknown';
    }
    
    function formatDate(dateString: string): string {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch {
            return dateString;
        }
    }
    
    function formatPercentage(value: any): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return `${value}%`;
        if (typeof value === 'string') return value;
        return '';
    }
    
    function formatScore(score: any): string {
        if (score === null || score === undefined) return '';
        if (typeof score === 'object' && score.value !== undefined) {
            return `${score.value}${score.unit ? ` ${score.unit}` : ''}`;
        }
        return score.toString();
    }
</script>

{#if hasTreatmentResponse}
    <h3 class="h3 heading -sticky">{$t('report.treatment-response')}</h3>
    
    <!-- Overall Response -->
    {#if Object.keys(overallResponse).length > 0}
        <h4 class="section-title-sub">{$t('report.overall-response')}</h4>
        <div class="page -block">
            <div class="overall-response-info">
                {#if overallResponse.status}
                    <div class="response-status">
                        <span class="label">{$t('report.response-status')}:</span>
                        <span class="response-value {getResponseClass(overallResponse.status)}">
                            {$t(`medical.enums.treatment_response.${overallResponse.status}`)}
                        </span>
                    </div>
                {/if}
                
                {#if overallResponse.responseRate}
                    <div class="detail-item">
                        <span class="label">{$t('report.response-rate')}:</span>
                        <span class="value">{formatPercentage(overallResponse.responseRate)}</span>
                    </div>
                {/if}
                
                {#if overallResponse.timeToResponse}
                    <div class="detail-item">
                        <span class="label">{$t('report.time-to-response')}:</span>
                        <span class="value">{overallResponse.timeToResponse}</span>
                    </div>
                {/if}
                
                {#if overallResponse.duration}
                    <div class="detail-item">
                        <span class="label">{$t('report.duration')}:</span>
                        <span class="value">{overallResponse.duration}</span>
                    </div>
                {/if}
                
                {#if overallResponse.lastEvaluated}
                    <div class="detail-item">
                        <span class="label">{$t('report.last-evaluated')}:</span>
                        <span class="value">{formatDate(overallResponse.lastEvaluated)}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Treatment Responses -->
    {#if responses.length > 0}
        <h4 class="section-title-sub">{$t('report.treatment-responses')}</h4>
        <ul class="list-items">
            {#each responses as response}
                <li class="panel response-item {getResponseClass(response.status)}">
                    <div class="response-header">
                        <div class="response-main">
                            <h5 class="treatment-name">{response.treatmentName}</h5>
                            <span class="treatment-type">{$t(`medical.enums.treatment_types.${response.treatmentType}`)}</span>
                        </div>
                        
                        <div class="response-badges">
                            {#if response.status}
                                <span class="status-badge {getResponseClass(response.status)}">
                                    {$t(`medical.enums.treatment_response.${response.status}`)}
                                </span>
                            {/if}
                            {#if response.trend}
                                <span class="trend-badge {getTrendClass(response.trend)}">
                                    {$t(`medical.enums.response_trends.${response.trend}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="response-details">
                        {#if response.startDate}
                            <div class="detail-item">
                                <span class="label">{$t('report.start-date')}:</span>
                                <span class="value">{formatDate(response.startDate)}</span>
                            </div>
                        {/if}
                        
                        {#if response.evaluationDate}
                            <div class="detail-item">
                                <span class="label">{$t('report.evaluation-date')}:</span>
                                <span class="value">{formatDate(response.evaluationDate)}</span>
                            </div>
                        {/if}
                        
                        {#if response.responseRate}
                            <div class="detail-item">
                                <span class="label">{$t('report.response-rate')}:</span>
                                <span class="value response-rate">{formatPercentage(response.responseRate)}</span>
                            </div>
                        {/if}
                        
                        {#if response.dosage}
                            <div class="detail-item">
                                <span class="label">{$t('report.dosage')}:</span>
                                <span class="value">{response.dosage}</span>
                            </div>
                        {/if}
                        
                        {#if response.modifications?.length > 0}
                            <div class="modifications-section">
                                <span class="label">{$t('report.modifications')}:</span>
                                <ul class="modifications-list">
                                    {#each response.modifications as modification}
                                        <li>
                                            <span class="modification-date">{formatDate(modification.date)}</span>
                                            <span class="modification-description">{modification.description}</span>
                                        </li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}
                    </div>
                    
                    {#if response.notes}
                        <div class="response-notes">
                            <span class="label">{$t('report.notes')}:</span>
                            <p class="notes-text">{response.notes}</p>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Side Effects -->
    {#if sideEffects.length > 0}
        <h4 class="section-title-sub">{$t('report.side-effects')}</h4>
        <ul class="list-items">
            {#each sideEffects as sideEffect}
                <li class="panel side-effect-item {getSeverityClass(sideEffect.severity)}">
                    <div class="side-effect-header">
                        <div class="side-effect-main">
                            <h5 class="side-effect-name">{sideEffect.name}</h5>
                            <span class="affected-system">{$t(`medical.enums.body_systems.${sideEffect.affectedSystem}`)}</span>
                        </div>
                        
                        <div class="side-effect-badges">
                            {#if sideEffect.severity}
                                <span class="severity-badge {getSeverityClass(sideEffect.severity)}">
                                    {$t(`medical.enums.severity_levels.${sideEffect.severity}`)}
                                </span>
                            {/if}
                            {#if sideEffect.frequency}
                                <span class="frequency-badge">{sideEffect.frequency}</span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="side-effect-details">
                        <p class="side-effect-description">{sideEffect.description}</p>
                        
                        {#if sideEffect.onsetDate}
                            <div class="detail-item">
                                <span class="label">{$t('report.onset-date')}:</span>
                                <span class="value">{formatDate(sideEffect.onsetDate)}</span>
                            </div>
                        {/if}
                        
                        {#if sideEffect.duration}
                            <div class="detail-item">
                                <span class="label">{$t('report.duration')}:</span>
                                <span class="value">{sideEffect.duration}</span>
                            </div>
                        {/if}
                        
                        {#if sideEffect.causality}
                            <div class="detail-item">
                                <span class="label">{$t('report.causality')}:</span>
                                <span class="value">{$t(`medical.enums.causality_levels.${sideEffect.causality}`)}</span>
                            </div>
                        {/if}
                        
                        {#if sideEffect.management}
                            <div class="detail-item">
                                <span class="label">{$t('report.management')}:</span>
                                <span class="value">{sideEffect.management}</span>
                            </div>
                        {/if}
                        
                        {#if sideEffect.resolved}
                            <div class="detail-item">
                                <span class="label">{$t('report.resolved')}:</span>
                                <span class="value">{sideEffect.resolved ? $t('report.yes') : $t('report.no')}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Adherence -->
    {#if Object.keys(adherence).length > 0}
        <h4 class="section-title-sub">{$t('report.treatment-adherence')}</h4>
        <div class="page -block">
            <div class="adherence-info">
                {#if adherence.overall}
                    <div class="adherence-overall">
                        <span class="label">{$t('report.overall-adherence')}:</span>
                        <span class="adherence-value {getAdherenceClass(adherence.overall)}">
                            {$t(`medical.enums.adherence_levels.${adherence.overall}`)}
                        </span>
                    </div>
                {/if}
                
                {#if adherence.percentage}
                    <div class="detail-item">
                        <span class="label">{$t('report.adherence-percentage')}:</span>
                        <span class="value">{formatPercentage(adherence.percentage)}</span>
                    </div>
                {/if}
                
                {#if adherence.missedDoses}
                    <div class="detail-item">
                        <span class="label">{$t('report.missed-doses')}:</span>
                        <span class="value">{adherence.missedDoses}</span>
                    </div>
                {/if}
                
                {#if adherence.barriers?.length > 0}
                    <div class="barriers-section">
                        <span class="label">{$t('report.barriers')}:</span>
                        <ul class="barriers-list">
                            {#each adherence.barriers as barrier}
                                <li>{barrier}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
                
                {#if adherence.interventions?.length > 0}
                    <div class="interventions-section">
                        <span class="label">{$t('report.interventions')}:</span>
                        <ul class="interventions-list">
                            {#each adherence.interventions as intervention}
                                <li>{intervention}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Quality of Life -->
    {#if Object.keys(qualityOfLife).length > 0}
        <h4 class="section-title-sub">{$t('report.quality-of-life')}</h4>
        <div class="page -block">
            <div class="quality-of-life-info">
                {#if qualityOfLife.overallScore}
                    <div class="detail-item">
                        <span class="label">{$t('report.overall-score')}:</span>
                        <span class="value qol-score">{formatScore(qualityOfLife.overallScore)}</span>
                    </div>
                {/if}
                
                {#if qualityOfLife.physicalFunction}
                    <div class="detail-item">
                        <span class="label">{$t('report.physical-function')}:</span>
                        <span class="value">{formatScore(qualityOfLife.physicalFunction)}</span>
                    </div>
                {/if}
                
                {#if qualityOfLife.emotionalWellbeing}
                    <div class="detail-item">
                        <span class="label">{$t('report.emotional-wellbeing')}:</span>
                        <span class="value">{formatScore(qualityOfLife.emotionalWellbeing)}</span>
                    </div>
                {/if}
                
                {#if qualityOfLife.socialFunction}
                    <div class="detail-item">
                        <span class="label">{$t('report.social-function')}:</span>
                        <span class="value">{formatScore(qualityOfLife.socialFunction)}</span>
                    </div>
                {/if}
                
                {#if qualityOfLife.change}
                    <div class="detail-item">
                        <span class="label">{$t('report.change-from-baseline')}:</span>
                        <span class="value {getChangeClass(qualityOfLife.change)}">
                            {$t(`medical.enums.change_levels.${qualityOfLife.change}`)}
                        </span>
                    </div>
                {/if}
                
                {#if qualityOfLife.assessmentDate}
                    <div class="detail-item">
                        <span class="label">{$t('report.assessment-date')}:</span>
                        <span class="value">{formatDate(qualityOfLife.assessmentDate)}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Functional Status -->
    {#if Object.keys(functionalStatus).length > 0}
        <h4 class="section-title-sub">{$t('report.functional-status')}</h4>
        <div class="page -block">
            <div class="functional-status-info">
                {#if functionalStatus.performanceStatus}
                    <div class="detail-item">
                        <span class="label">{$t('report.performance-status')}:</span>
                        <span class="value">{functionalStatus.performanceStatus}</span>
                    </div>
                {/if}
                
                {#if functionalStatus.karnofsky}
                    <div class="detail-item">
                        <span class="label">{$t('report.karnofsky-score')}:</span>
                        <span class="value karnofsky-score">{functionalStatus.karnofsky}</span>
                    </div>
                {/if}
                
                {#if functionalStatus.ecog}
                    <div class="detail-item">
                        <span class="label">{$t('report.ecog-score')}:</span>
                        <span class="value ecog-score">{functionalStatus.ecog}</span>
                    </div>
                {/if}
                
                {#if functionalStatus.mobilityLevel}
                    <div class="detail-item">
                        <span class="label">{$t('report.mobility-level')}:</span>
                        <span class="value">{$t(`medical.enums.mobility_levels.${functionalStatus.mobilityLevel}`)}</span>
                    </div>
                {/if}
                
                {#if functionalStatus.change}
                    <div class="detail-item">
                        <span class="label">{$t('report.change-from-baseline')}:</span>
                        <span class="value {getChangeClass(functionalStatus.change)}">
                            {$t(`medical.enums.change_levels.${functionalStatus.change}`)}
                        </span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Biomarkers -->
    {#if biomarkers.length > 0}
        <h4 class="section-title-sub">{$t('report.biomarkers')}</h4>
        <ul class="list-items">
            {#each biomarkers as biomarker}
                <li class="panel biomarker-item {getTrendClass(biomarker.trend)}">
                    <div class="biomarker-header">
                        <div class="biomarker-main">
                            <h5 class="biomarker-name">{biomarker.name}</h5>
                            <span class="biomarker-type">{$t(`medical.enums.biomarker_types.${biomarker.type}`)}</span>
                        </div>
                        
                        <div class="biomarker-badges">
                            {#if biomarker.trend}
                                <span class="trend-badge {getTrendClass(biomarker.trend)}">
                                    {$t(`medical.enums.response_trends.${biomarker.trend}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="biomarker-details">
                        {#if biomarker.baselineValue}
                            <div class="detail-item">
                                <span class="label">{$t('report.baseline-value')}:</span>
                                <span class="value">{biomarker.baselineValue}</span>
                            </div>
                        {/if}
                        
                        {#if biomarker.currentValue}
                            <div class="detail-item">
                                <span class="label">{$t('report.current-value')}:</span>
                                <span class="value">{biomarker.currentValue}</span>
                            </div>
                        {/if}
                        
                        {#if biomarker.normalRange}
                            <div class="detail-item">
                                <span class="label">{$t('report.normal-range')}:</span>
                                <span class="value">{biomarker.normalRange}</span>
                            </div>
                        {/if}
                        
                        {#if biomarker.percentChange}
                            <div class="detail-item">
                                <span class="label">{$t('report.percent-change')}:</span>
                                <span class="value percent-change">{formatPercentage(biomarker.percentChange)}</span>
                            </div>
                        {/if}
                        
                        {#if biomarker.testDate}
                            <div class="detail-item">
                                <span class="label">{$t('report.test-date')}:</span>
                                <span class="value">{formatDate(biomarker.testDate)}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Imaging -->
    {#if imaging.length > 0}
        <h4 class="section-title-sub">{$t('report.imaging-response')}</h4>
        <ul class="list-items">
            {#each imaging as imagingStudy}
                <li class="panel imaging-item {getResponseClass(imagingStudy.response)}">
                    <div class="imaging-header">
                        <div class="imaging-main">
                            <h5 class="imaging-type">{$t(`medical.enums.imaging_types.${imagingStudy.type}`)}</h5>
                            <span class="imaging-date">{formatDate(imagingStudy.date)}</span>
                        </div>
                        
                        <div class="imaging-badges">
                            {#if imagingStudy.response}
                                <span class="response-badge {getResponseClass(imagingStudy.response)}">
                                    {$t(`medical.enums.treatment_response.${imagingStudy.response}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="imaging-details">
                        {#if imagingStudy.findings}
                            <div class="detail-item">
                                <span class="label">{$t('report.findings')}:</span>
                                <span class="value">{imagingStudy.findings}</span>
                            </div>
                        {/if}
                        
                        {#if imagingStudy.lesionCount}
                            <div class="detail-item">
                                <span class="label">{$t('report.lesion-count')}:</span>
                                <span class="value">{imagingStudy.lesionCount}</span>
                            </div>
                        {/if}
                        
                        {#if imagingStudy.totalDiameter}
                            <div class="detail-item">
                                <span class="label">{$t('report.total-diameter')}:</span>
                                <span class="value">{imagingStudy.totalDiameter}</span>
                            </div>
                        {/if}
                        
                        {#if imagingStudy.changeFromBaseline}
                            <div class="detail-item">
                                <span class="label">{$t('report.change-from-baseline')}:</span>
                                <span class="value change-value">{imagingStudy.changeFromBaseline}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Recommendations -->
    {#if recommendations.length > 0}
        <h4 class="section-title-sub">{$t('report.recommendations')}</h4>
        <ul class="list-items">
            {#each recommendations as recommendation}
                <li class="panel recommendation-item">
                    <div class="recommendation-header">
                        <span class="recommendation-text">{recommendation.text}</span>
                        {#if recommendation.urgency}
                            <span class="urgency-badge {getSeverityClass(recommendation.urgency)}">
                                {$t(`medical.enums.urgency_levels.${recommendation.urgency}`)}
                            </span>
                        {/if}
                    </div>
                    
                    <div class="recommendation-details">
                        {#if recommendation.rationale}
                            <div class="detail-item">
                                <span class="label">{$t('report.rationale')}:</span>
                                <span class="value">{recommendation.rationale}</span>
                            </div>
                        {/if}
                        
                        {#if recommendation.timeframe}
                            <div class="detail-item">
                                <span class="label">{$t('report.timeframe')}:</span>
                                <span class="value">{recommendation.timeframe}</span>
                            </div>
                        {/if}
                        
                        {#if recommendation.provider}
                            <div class="detail-item">
                                <span class="label">{$t('report.provider')}:</span>
                                <span class="value">{recommendation.provider}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.treatment-response')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-treatment-response-data')}</p>
    </div>
{/if}

<style>
    .overall-response-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .response-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0.5rem 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
    }
    
    .response-value {
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        text-transform: uppercase;
        font-size: 0.9rem;
    }
    
    .response-complete {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .response-partial {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .response-stable {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .response-progression {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .response-mixed {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
    }
    
    .response-item {
        border-left-color: var(--color-info);
    }
    
    .response-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .response-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .treatment-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .treatment-type {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .response-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .response-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .response-rate {
        font-weight: 600;
        color: var(--color-success-dark);
    }
    
    .modifications-section {
        margin-top: 0.75rem;
    }
    
    .modifications-list {
        margin: 0.5rem 0 0 1rem;
        padding: 0;
        list-style: none;
    }
    
    .modifications-list li {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
        padding: 0.25rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
    }
    
    .modification-date {
        font-weight: 500;
        color: var(--color-primary);
        min-width: 80px;
    }
    
    .modification-description {
        color: var(--color-text-secondary);
        flex: 1;
    }
    
    .response-notes {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--color-border);
    }
    
    .notes-text {
        margin: 0.25rem 0 0 0;
        color: var(--color-text-secondary);
        line-height: 1.5;
        font-style: italic;
    }
    
    .side-effect-item {
        border-left-color: var(--color-warning);
    }
    
    .side-effect-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .side-effect-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .side-effect-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .affected-system {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .side-effect-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .side-effect-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .side-effect-description {
        margin: 0 0 0.5rem 0;
        color: var(--color-text-primary);
        line-height: 1.5;
    }
    
    .adherence-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .adherence-overall {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0.5rem 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
    }
    
    .adherence-value {
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        text-transform: uppercase;
        font-size: 0.9rem;
    }
    
    .adherence-excellent {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .adherence-good {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .adherence-fair {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .adherence-poor {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .barriers-section,
    .interventions-section {
        margin-top: 0.75rem;
    }
    
    .barriers-list,
    .interventions-list {
        margin: 0.5rem 0 0 1.5rem;
        padding: 0;
    }
    
    .barriers-list li,
    .interventions-list li {
        margin-bottom: 0.25rem;
        color: var(--color-text-secondary);
    }
    
    .quality-of-life-info,
    .functional-status-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .qol-score,
    .karnofsky-score,
    .ecog-score {
        font-weight: 600;
        color: var(--color-primary);
    }
    
    .biomarker-item {
        border-left-color: var(--color-secondary);
    }
    
    .biomarker-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .biomarker-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .biomarker-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .biomarker-type {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .biomarker-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .biomarker-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .percent-change {
        font-weight: 600;
        color: var(--color-primary);
    }
    
    .imaging-item {
        border-left-color: var(--color-info);
    }
    
    .imaging-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .imaging-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .imaging-type {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .imaging-date {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .imaging-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .imaging-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .change-value {
        font-weight: 600;
        color: var(--color-primary);
    }
    
    .recommendation-item {
        border-left-color: var(--color-info);
    }
    
    .recommendation-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .recommendation-text {
        font-weight: 500;
        color: var(--color-text-primary);
        flex: 1;
    }
    
    .recommendation-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .status-badge,
    .trend-badge,
    .severity-badge,
    .frequency-badge,
    .urgency-badge,
    .response-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .trend-improving {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .trend-stable {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .trend-declining {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .trend-fluctuating {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
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
    
    .severity-critical {
        background-color: var(--color-danger);
        color: white;
    }
    
    .frequency-badge {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
    }
    
    .urgency-badge {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .change-improved {
        color: var(--color-success-dark);
        font-weight: 600;
    }
    
    .change-stable {
        color: var(--color-info-dark);
        font-weight: 600;
    }
    
    .change-deteriorated {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .change-significant-improvement {
        color: var(--color-success-dark);
        font-weight: 600;
    }
    
    .change-significant-deterioration {
        color: var(--color-danger-dark);
        font-weight: 600;
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
    
    /* Panel coloring based on response status */
    .response-complete {
        border-left-color: var(--color-success);
    }
    
    .response-partial {
        border-left-color: var(--color-warning);
    }
    
    .response-stable {
        border-left-color: var(--color-info);
    }
    
    .response-progression {
        border-left-color: var(--color-danger);
        border-left-width: 4px;
    }
    
    .response-mixed {
        border-left-color: var(--color-secondary);
    }
    
    /* Panel coloring based on severity */
    .severity-mild {
        border-left-color: var(--color-info);
    }
    
    .severity-moderate {
        border-left-color: var(--color-warning);
    }
    
    .severity-severe {
        border-left-color: var(--color-danger);
    }
    
    .severity-critical {
        border-left-color: var(--color-danger);
        border-left-width: 4px;
    }
    
    /* Panel coloring based on trend */
    .trend-improving {
        border-left-color: var(--color-success);
    }
    
    .trend-stable {
        border-left-color: var(--color-info);
    }
    
    .trend-declining {
        border-left-color: var(--color-danger);
    }
    
    .trend-fluctuating {
        border-left-color: var(--color-warning);
    }
</style>