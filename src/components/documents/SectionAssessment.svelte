<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
        key?: string;
    }

    let { data, document, key }: Props = $props();
    
    let hasAssessment = $derived(data && data.hasAssessment);
    
    let clinicalImpression = $derived(data?.clinicalImpression || {});
    let diagnosticAssessment = $derived(data?.diagnosticAssessment || {});
    let riskAssessment = $derived(data?.riskAssessment || {});
    let functionalAssessment = $derived(data?.functionalAssessment || {});
    let mentalStatusAssessment = $derived(data?.mentalStatusAssessment || {});
    let painAssessment = $derived(data?.painAssessment || {});
    let cognitiveAssessment = $derived(data?.cognitiveAssessment || {});
    let mobilityAssessment = $derived(data?.mobilityAssessment || {});
    let nutritionalAssessment = $derived(data?.nutritionalAssessment || {});
    let recommendations = $derived(data?.recommendations || []);
    let clinician = $derived(data?.clinician);
    let assessmentDate = $derived(data?.assessmentDate);
    
    function getSeverityClass(severity: string): string {
        const severityClasses: Record<string, string> = {
            'mild': 'severity-mild',
            'moderate': 'severity-moderate',
            'severe': 'severity-severe',
            'critical': 'severity-critical'
        };
        return severityClasses[severity] || 'severity-unknown';
    }
    
    function getRiskClass(risk: string): string {
        const riskClasses: Record<string, string> = {
            'low': 'risk-low',
            'moderate': 'risk-moderate',
            'high': 'risk-high',
            'very_high': 'risk-very-high'
        };
        return riskClasses[risk] || 'risk-unknown';
    }
    
    function getConfidenceClass(confidence: string): string {
        const confidenceClasses: Record<string, string> = {
            'high': 'confidence-high',
            'moderate': 'confidence-moderate',
            'low': 'confidence-low'
        };
        return confidenceClasses[confidence] || 'confidence-unknown';
    }
    
    function getFunctionalClass(level: string): string {
        const functionalClasses: Record<string, string> = {
            'independent': 'functional-independent',
            'minimal_assistance': 'functional-minimal',
            'moderate_assistance': 'functional-moderate',
            'maximal_assistance': 'functional-maximal',
            'dependent': 'functional-dependent'
        };
        return functionalClasses[level] || 'functional-unknown';
    }
    
    function getPainClass(level: string): string {
        const painClasses: Record<string, string> = {
            'none': 'pain-none',
            'mild': 'pain-mild',
            'moderate': 'pain-moderate',
            'severe': 'pain-severe',
            'very_severe': 'pain-very-severe'
        };
        return painClasses[level] || 'pain-unknown';
    }
    
    function getCognitiveClass(level: string): string {
        const cognitiveClasses: Record<string, string> = {
            'normal': 'cognitive-normal',
            'mild_impairment': 'cognitive-mild',
            'moderate_impairment': 'cognitive-moderate',
            'severe_impairment': 'cognitive-severe'
        };
        return cognitiveClasses[level] || 'cognitive-unknown';
    }
    
    function getMobilityClass(level: string): string {
        const mobilityClasses: Record<string, string> = {
            'fully_mobile': 'mobility-full',
            'ambulatory': 'mobility-ambulatory',
            'wheelchair': 'mobility-wheelchair',
            'bedbound': 'mobility-bedbound'
        };
        return mobilityClasses[level] || 'mobility-unknown';
    }
    
    function getNutritionalClass(status: string): string {
        const nutritionalClasses: Record<string, string> = {
            'well_nourished': 'nutrition-well',
            'mild_malnutrition': 'nutrition-mild',
            'moderate_malnutrition': 'nutrition-moderate',
            'severe_malnutrition': 'nutrition-severe'
        };
        return nutritionalClasses[status] || 'nutrition-unknown';
    }
    
    function getPriorityClass(priority: string): string {
        const priorityClasses: Record<string, string> = {
            'low': 'priority-low',
            'medium': 'priority-medium',
            'high': 'priority-high',
            'urgent': 'priority-urgent'
        };
        return priorityClasses[priority] || 'priority-medium';
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
    
    function formatScore(score: any): string {
        if (score === null || score === undefined) return '';
        if (typeof score === 'object' && score.value !== undefined) {
            return `${score.value}${score.scale ? `/${score.scale}` : ''}`;
        }
        return score.toString();
    }
    
    function formatPercentage(percentage: any): string {
        if (percentage === null || percentage === undefined) return '';
        if (typeof percentage === 'number') return `${percentage}%`;
        if (typeof percentage === 'string') return percentage;
        return '';
    }
</script>

{#if hasAssessment}
    <h3 class="h3 heading -sticky">{$t('report.assessment')}</h3>
    
    <!-- Assessment Date and Clinician -->
    {#if assessmentDate || clinician}
        <div class="page -block">
            <div class="assessment-header">
                {#if assessmentDate}
                    <div class="detail-item">
                        <span class="label">{$t('report.assessment-date')}:</span>
                        <span class="value">{formatDate(assessmentDate)}</span>
                    </div>
                {/if}
                
                {#if clinician}
                    <div class="detail-item">
                        <span class="label">{$t('report.clinician')}:</span>
                        <span class="value">{clinician.name} - {clinician.title}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Clinical Impression -->
    {#if Object.keys(clinicalImpression).length > 0}
        <h4 class="section-title-sub">{$t('report.clinical-impression')}</h4>
        <div class="page -block">
            <div class="clinical-impression-info">
                {#if clinicalImpression.primaryImpression}
                    <div class="primary-impression">
                        <span class="label">{$t('report.primary-impression')}:</span>
                        <p class="impression-text">{clinicalImpression.primaryImpression}</p>
                    </div>
                {/if}
                
                {#if clinicalImpression.secondaryImpressions?.length > 0}
                    <div class="secondary-impressions-section">
                        <span class="label">{$t('report.secondary-impressions')}:</span>
                        <ul class="secondary-impressions-list">
                            {#each clinicalImpression.secondaryImpressions as impression}
                                <li>{impression}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
                
                {#if clinicalImpression.differentialDiagnosis?.length > 0}
                    <div class="differential-diagnosis-section">
                        <span class="label">{$t('report.differential-diagnosis')}:</span>
                        <ul class="differential-diagnosis-list">
                            {#each clinicalImpression.differentialDiagnosis as diagnosis}
                                <li>
                                    <span class="diagnosis-name">{diagnosis.name}</span>
                                    {#if diagnosis.probability}
                                        <span class="diagnosis-probability">{formatPercentage(diagnosis.probability)}</span>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}
                
                {#if clinicalImpression.prognosis}
                    <div class="detail-item">
                        <span class="label">{$t('report.prognosis')}:</span>
                        <span class="value">{clinicalImpression.prognosis}</span>
                    </div>
                {/if}
                
                {#if clinicalImpression.confidence}
                    <div class="detail-item">
                        <span class="label">{$t('report.confidence')}:</span>
                        <span class="value {getConfidenceClass(clinicalImpression.confidence)}">
                            {$t(`medical.enums.confidence_levels.${clinicalImpression.confidence}`)}
                        </span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Diagnostic Assessment -->
    {#if Object.keys(diagnosticAssessment).length > 0}
        <h4 class="section-title-sub">{$t('report.diagnostic-assessment')}</h4>
        <div class="page -block">
            <div class="diagnostic-assessment-info">
                {#if diagnosticAssessment.primaryDiagnosis}
                    <div class="primary-diagnosis">
                        <span class="label">{$t('report.primary-diagnosis')}:</span>
                        <div class="diagnosis-details">
                            <span class="diagnosis-name">{diagnosticAssessment.primaryDiagnosis.name}</span>
                            {#if diagnosticAssessment.primaryDiagnosis.code}
                                <span class="diagnosis-code">{diagnosticAssessment.primaryDiagnosis.code}</span>
                            {/if}
                        </div>
                    </div>
                {/if}
                
                {#if diagnosticAssessment.secondaryDiagnoses?.length > 0}
                    <div class="secondary-diagnoses-section">
                        <span class="label">{$t('report.secondary-diagnoses')}:</span>
                        <div class="secondary-diagnoses-list">
                            {#each diagnosticAssessment.secondaryDiagnoses as diagnosis}
                                <div class="diagnosis-item">
                                    <span class="diagnosis-name">{diagnosis.name}</span>
                                    {#if diagnosis.code}
                                        <span class="diagnosis-code">{diagnosis.code}</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if diagnosticAssessment.ruleOut?.length > 0}
                    <div class="rule-out-section">
                        <span class="label">{$t('report.rule-out')}:</span>
                        <div class="rule-out-list">
                            {#each diagnosticAssessment.ruleOut as diagnosis}
                                <span class="rule-out-item">{diagnosis}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if diagnosticAssessment.supportingEvidence?.length > 0}
                    <div class="supporting-evidence-section">
                        <span class="label">{$t('report.supporting-evidence')}:</span>
                        <ul class="supporting-evidence-list">
                            {#each diagnosticAssessment.supportingEvidence as evidence}
                                <li>{evidence}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
                
                {#if diagnosticAssessment.certainty}
                    <div class="detail-item">
                        <span class="label">{$t('report.diagnostic-certainty')}:</span>
                        <span class="value {getConfidenceClass(diagnosticAssessment.certainty)}">
                            {$t(`medical.enums.certainty_levels.${diagnosticAssessment.certainty}`)}
                        </span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Risk Assessment -->
    {#if Object.keys(riskAssessment).length > 0}
        <h4 class="section-title-sub">{$t('report.risk-assessment')}</h4>
        <div class="page -block">
            <div class="risk-assessment-info">
                {#if riskAssessment.overallRisk}
                    <div class="overall-risk">
                        <span class="label">{$t('report.overall-risk')}:</span>
                        <span class="risk-value {getRiskClass(riskAssessment.overallRisk)}">
                            {$t(`medical.enums.risk_levels.${riskAssessment.overallRisk}`)}
                        </span>
                    </div>
                {/if}
                
                {#if riskAssessment.fallRisk}
                    <div class="detail-item">
                        <span class="label">{$t('report.fall-risk')}:</span>
                        <span class="value {getRiskClass(riskAssessment.fallRisk)}">
                            {$t(`medical.enums.risk_levels.${riskAssessment.fallRisk}`)}
                        </span>
                    </div>
                {/if}
                
                {#if riskAssessment.pressureUlcerRisk}
                    <div class="detail-item">
                        <span class="label">{$t('report.pressure-ulcer-risk')}:</span>
                        <span class="value {getRiskClass(riskAssessment.pressureUlcerRisk)}">
                            {$t(`medical.enums.risk_levels.${riskAssessment.pressureUlcerRisk}`)}
                        </span>
                    </div>
                {/if}
                
                {#if riskAssessment.suicideRisk}
                    <div class="detail-item">
                        <span class="label">{$t('report.suicide-risk')}:</span>
                        <span class="value {getRiskClass(riskAssessment.suicideRisk)}">
                            {$t(`medical.enums.risk_levels.${riskAssessment.suicideRisk}`)}
                        </span>
                    </div>
                {/if}
                
                {#if riskAssessment.infectionRisk}
                    <div class="detail-item">
                        <span class="label">{$t('report.infection-risk')}:</span>
                        <span class="value {getRiskClass(riskAssessment.infectionRisk)}">
                            {$t(`medical.enums.risk_levels.${riskAssessment.infectionRisk}`)}
                        </span>
                    </div>
                {/if}
                
                {#if riskAssessment.riskFactors?.length > 0}
                    <div class="risk-factors-section">
                        <span class="label">{$t('report.risk-factors')}:</span>
                        <div class="risk-factors-list">
                            {#each riskAssessment.riskFactors as factor}
                                <div class="risk-factor-item">
                                    <span class="factor-name">{factor.name}</span>
                                    <span class="factor-level {getRiskClass(factor.level)}">{$t(`medical.enums.risk_levels.${factor.level}`)}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if riskAssessment.mitigationStrategies?.length > 0}
                    <div class="mitigation-strategies-section">
                        <span class="label">{$t('report.mitigation-strategies')}:</span>
                        <ul class="mitigation-strategies-list">
                            {#each riskAssessment.mitigationStrategies as strategy}
                                <li>{strategy}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Functional Assessment -->
    {#if Object.keys(functionalAssessment).length > 0}
        <h4 class="section-title-sub">{$t('report.functional-assessment')}</h4>
        <div class="page -block">
            <div class="functional-assessment-info">
                {#if functionalAssessment.overallLevel}
                    <div class="overall-functional">
                        <span class="label">{$t('report.overall-functional-level')}:</span>
                        <span class="functional-value {getFunctionalClass(functionalAssessment.overallLevel)}">
                            {$t(`medical.enums.functional_levels.${functionalAssessment.overallLevel}`)}
                        </span>
                    </div>
                {/if}
                
                {#if functionalAssessment.adlScore}
                    <div class="detail-item">
                        <span class="label">{$t('report.adl-score')}:</span>
                        <span class="value score-value">{formatScore(functionalAssessment.adlScore)}</span>
                    </div>
                {/if}
                
                {#if functionalAssessment.iadlScore}
                    <div class="detail-item">
                        <span class="label">{$t('report.iadl-score')}:</span>
                        <span class="value score-value">{formatScore(functionalAssessment.iadlScore)}</span>
                    </div>
                {/if}
                
                {#if functionalAssessment.barthel}
                    <div class="detail-item">
                        <span class="label">{$t('report.barthel-index')}:</span>
                        <span class="value score-value">{formatScore(functionalAssessment.barthel)}</span>
                    </div>
                {/if}
                
                {#if functionalAssessment.fimScore}
                    <div class="detail-item">
                        <span class="label">{$t('report.fim-score')}:</span>
                        <span class="value score-value">{formatScore(functionalAssessment.fimScore)}</span>
                    </div>
                {/if}
                
                {#if functionalAssessment.limitations?.length > 0}
                    <div class="limitations-section">
                        <span class="label">{$t('report.limitations')}:</span>
                        <ul class="limitations-list">
                            {#each functionalAssessment.limitations as limitation}
                                <li>{limitation}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
                
                {#if functionalAssessment.assistiveDevices?.length > 0}
                    <div class="assistive-devices-section">
                        <span class="label">{$t('report.assistive-devices')}:</span>
                        <div class="assistive-devices-list">
                            {#each functionalAssessment.assistiveDevices as device}
                                <span class="device-tag">{device}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Mental Status Assessment -->
    {#if Object.keys(mentalStatusAssessment).length > 0}
        <h4 class="section-title-sub">{$t('report.mental-status-assessment')}</h4>
        <div class="page -block">
            <div class="mental-status-info">
                {#if mentalStatusAssessment.orientation}
                    <div class="detail-item">
                        <span class="label">{$t('report.orientation')}:</span>
                        <span class="value">{mentalStatusAssessment.orientation}</span>
                    </div>
                {/if}
                
                {#if mentalStatusAssessment.mood}
                    <div class="detail-item">
                        <span class="label">{$t('report.mood')}:</span>
                        <span class="value">{mentalStatusAssessment.mood}</span>
                    </div>
                {/if}
                
                {#if mentalStatusAssessment.affect}
                    <div class="detail-item">
                        <span class="label">{$t('report.affect')}:</span>
                        <span class="value">{mentalStatusAssessment.affect}</span>
                    </div>
                {/if}
                
                {#if mentalStatusAssessment.thoughtProcess}
                    <div class="detail-item">
                        <span class="label">{$t('report.thought-process')}:</span>
                        <span class="value">{mentalStatusAssessment.thoughtProcess}</span>
                    </div>
                {/if}
                
                {#if mentalStatusAssessment.insight}
                    <div class="detail-item">
                        <span class="label">{$t('report.insight')}:</span>
                        <span class="value">{mentalStatusAssessment.insight}</span>
                    </div>
                {/if}
                
                {#if mentalStatusAssessment.judgment}
                    <div class="detail-item">
                        <span class="label">{$t('report.judgment')}:</span>
                        <span class="value">{mentalStatusAssessment.judgment}</span>
                    </div>
                {/if}
                
                {#if mentalStatusAssessment.phq9Score}
                    <div class="detail-item">
                        <span class="label">{$t('report.phq9-score')}:</span>
                        <span class="value score-value">{formatScore(mentalStatusAssessment.phq9Score)}</span>
                    </div>
                {/if}
                
                {#if mentalStatusAssessment.gad7Score}
                    <div class="detail-item">
                        <span class="label">{$t('report.gad7-score')}:</span>
                        <span class="value score-value">{formatScore(mentalStatusAssessment.gad7Score)}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Pain Assessment -->
    {#if Object.keys(painAssessment).length > 0}
        <h4 class="section-title-sub">{$t('report.pain-assessment')}</h4>
        <div class="page -block">
            <div class="pain-assessment-info">
                {#if painAssessment.overallLevel}
                    <div class="overall-pain">
                        <span class="label">{$t('report.overall-pain-level')}:</span>
                        <span class="pain-value {getPainClass(painAssessment.overallLevel)}">
                            {$t(`medical.enums.pain_levels.${painAssessment.overallLevel}`)}
                        </span>
                    </div>
                {/if}
                
                {#if painAssessment.painScale}
                    <div class="detail-item">
                        <span class="label">{$t('report.pain-scale')}:</span>
                        <span class="value pain-score">{formatScore(painAssessment.painScale)}</span>
                    </div>
                {/if}
                
                {#if painAssessment.location}
                    <div class="detail-item">
                        <span class="label">{$t('report.pain-location')}:</span>
                        <span class="value">{painAssessment.location}</span>
                    </div>
                {/if}
                
                {#if painAssessment.quality}
                    <div class="detail-item">
                        <span class="label">{$t('report.pain-quality')}:</span>
                        <span class="value">{painAssessment.quality}</span>
                    </div>
                {/if}
                
                {#if painAssessment.duration}
                    <div class="detail-item">
                        <span class="label">{$t('report.pain-duration')}:</span>
                        <span class="value">{painAssessment.duration}</span>
                    </div>
                {/if}
                
                {#if painAssessment.triggeringFactors?.length > 0}
                    <div class="triggering-factors-section">
                        <span class="label">{$t('report.triggering-factors')}:</span>
                        <div class="triggering-factors-list">
                            {#each painAssessment.triggeringFactors as factor}
                                <span class="factor-tag">{factor}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if painAssessment.relievingFactors?.length > 0}
                    <div class="relieving-factors-section">
                        <span class="label">{$t('report.relieving-factors')}:</span>
                        <div class="relieving-factors-list">
                            {#each painAssessment.relievingFactors as factor}
                                <span class="factor-tag">{factor}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if painAssessment.functionalImpact}
                    <div class="detail-item">
                        <span class="label">{$t('report.functional-impact')}:</span>
                        <span class="value">{painAssessment.functionalImpact}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Cognitive Assessment -->
    {#if Object.keys(cognitiveAssessment).length > 0}
        <h4 class="section-title-sub">{$t('report.cognitive-assessment')}</h4>
        <div class="page -block">
            <div class="cognitive-assessment-info">
                {#if cognitiveAssessment.overallLevel}
                    <div class="overall-cognitive">
                        <span class="label">{$t('report.overall-cognitive-level')}:</span>
                        <span class="cognitive-value {getCognitiveClass(cognitiveAssessment.overallLevel)}">
                            {$t(`medical.enums.cognitive_levels.${cognitiveAssessment.overallLevel}`)}
                        </span>
                    </div>
                {/if}
                
                {#if cognitiveAssessment.mmseScore}
                    <div class="detail-item">
                        <span class="label">{$t('report.mmse-score')}:</span>
                        <span class="value score-value">{formatScore(cognitiveAssessment.mmseScore)}</span>
                    </div>
                {/if}
                
                {#if cognitiveAssessment.mocaScore}
                    <div class="detail-item">
                        <span class="label">{$t('report.moca-score')}:</span>
                        <span class="value score-value">{formatScore(cognitiveAssessment.mocaScore)}</span>
                    </div>
                {/if}
                
                {#if cognitiveAssessment.memory}
                    <div class="detail-item">
                        <span class="label">{$t('report.memory')}:</span>
                        <span class="value">{cognitiveAssessment.memory}</span>
                    </div>
                {/if}
                
                {#if cognitiveAssessment.attention}
                    <div class="detail-item">
                        <span class="label">{$t('report.attention')}:</span>
                        <span class="value">{cognitiveAssessment.attention}</span>
                    </div>
                {/if}
                
                {#if cognitiveAssessment.language}
                    <div class="detail-item">
                        <span class="label">{$t('report.language')}:</span>
                        <span class="value">{cognitiveAssessment.language}</span>
                    </div>
                {/if}
                
                {#if cognitiveAssessment.executiveFunction}
                    <div class="detail-item">
                        <span class="label">{$t('report.executive-function')}:</span>
                        <span class="value">{cognitiveAssessment.executiveFunction}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Mobility Assessment -->
    {#if Object.keys(mobilityAssessment).length > 0}
        <h4 class="section-title-sub">{$t('report.mobility-assessment')}</h4>
        <div class="page -block">
            <div class="mobility-assessment-info">
                {#if mobilityAssessment.overallLevel}
                    <div class="overall-mobility">
                        <span class="label">{$t('report.overall-mobility-level')}:</span>
                        <span class="mobility-value {getMobilityClass(mobilityAssessment.overallLevel)}">
                            {$t(`medical.enums.mobility_levels.${mobilityAssessment.overallLevel}`)}
                        </span>
                    </div>
                {/if}
                
                {#if mobilityAssessment.gait}
                    <div class="detail-item">
                        <span class="label">{$t('report.gait')}:</span>
                        <span class="value">{mobilityAssessment.gait}</span>
                    </div>
                {/if}
                
                {#if mobilityAssessment.balance}
                    <div class="detail-item">
                        <span class="label">{$t('report.balance')}:</span>
                        <span class="value">{mobilityAssessment.balance}</span>
                    </div>
                {/if}
                
                {#if mobilityAssessment.transferAbility}
                    <div class="detail-item">
                        <span class="label">{$t('report.transfer-ability')}:</span>
                        <span class="value">{mobilityAssessment.transferAbility}</span>
                    </div>
                {/if}
                
                {#if mobilityAssessment.walkingDistance}
                    <div class="detail-item">
                        <span class="label">{$t('report.walking-distance')}:</span>
                        <span class="value">{mobilityAssessment.walkingDistance}</span>
                    </div>
                {/if}
                
                {#if mobilityAssessment.tinetti}
                    <div class="detail-item">
                        <span class="label">{$t('report.tinetti-score')}:</span>
                        <span class="value score-value">{formatScore(mobilityAssessment.tinetti)}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Nutritional Assessment -->
    {#if Object.keys(nutritionalAssessment).length > 0}
        <h4 class="section-title-sub">{$t('report.nutritional-assessment')}</h4>
        <div class="page -block">
            <div class="nutritional-assessment-info">
                {#if nutritionalAssessment.overallStatus}
                    <div class="overall-nutritional">
                        <span class="label">{$t('report.overall-nutritional-status')}:</span>
                        <span class="nutritional-value {getNutritionalClass(nutritionalAssessment.overallStatus)}">
                            {$t(`medical.enums.nutritional_status.${nutritionalAssessment.overallStatus}`)}
                        </span>
                    </div>
                {/if}
                
                {#if nutritionalAssessment.bmi}
                    <div class="detail-item">
                        <span class="label">{$t('report.bmi')}:</span>
                        <span class="value bmi-value">{nutritionalAssessment.bmi}</span>
                    </div>
                {/if}
                
                {#if nutritionalAssessment.albumin}
                    <div class="detail-item">
                        <span class="label">{$t('report.albumin')}:</span>
                        <span class="value">{nutritionalAssessment.albumin}</span>
                    </div>
                {/if}
                
                {#if nutritionalAssessment.weightLoss}
                    <div class="detail-item">
                        <span class="label">{$t('report.weight-loss')}:</span>
                        <span class="value">{nutritionalAssessment.weightLoss}</span>
                    </div>
                {/if}
                
                {#if nutritionalAssessment.appetiteChanges}
                    <div class="detail-item">
                        <span class="label">{$t('report.appetite-changes')}:</span>
                        <span class="value">{nutritionalAssessment.appetiteChanges}</span>
                    </div>
                {/if}
                
                {#if nutritionalAssessment.swallowingDifficulty}
                    <div class="detail-item">
                        <span class="label">{$t('report.swallowing-difficulty')}:</span>
                        <span class="value">{nutritionalAssessment.swallowingDifficulty ? $t('report.yes') : $t('report.no')}</span>
                    </div>
                {/if}
                
                {#if nutritionalAssessment.dietaryRestrictions?.length > 0}
                    <div class="dietary-restrictions-section">
                        <span class="label">{$t('report.dietary-restrictions')}:</span>
                        <div class="dietary-restrictions-list">
                            {#each nutritionalAssessment.dietaryRestrictions as restriction}
                                <span class="restriction-tag">{restriction}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Recommendations -->
    {#if recommendations.length > 0}
        <h4 class="section-title-sub">{$t('report.recommendations')}</h4>
        <ul class="list-items">
            {#each recommendations as recommendation}
                <li class="panel recommendation-item {getPriorityClass(recommendation.priority)}">
                    <div class="recommendation-header">
                        <div class="recommendation-main">
                            <h5 class="recommendation-title">{recommendation.title}</h5>
                            <span class="recommendation-category">{$t(`medical.enums.recommendation_categories.${recommendation.category}`)}</span>
                        </div>
                        
                        <div class="recommendation-badges">
                            {#if recommendation.priority}
                                <span class="priority-badge {getPriorityClass(recommendation.priority)}">
                                    {$t(`medical.enums.priority_levels.${recommendation.priority}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="recommendation-details">
                        <p class="recommendation-description">{recommendation.description}</p>
                        
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
                        
                        {#if recommendation.expectedOutcome}
                            <div class="detail-item">
                                <span class="label">{$t('report.expected-outcome')}:</span>
                                <span class="value">{recommendation.expectedOutcome}</span>
                            </div>
                        {/if}
                        
                        {#if recommendation.responsibleParty}
                            <div class="detail-item">
                                <span class="label">{$t('report.responsible-party')}:</span>
                                <span class="value">{recommendation.responsibleParty}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.assessment')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-assessment-data')}</p>
    </div>
{/if}

<style>
    .assessment-header {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding: 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
    }
    
    .clinical-impression-info,
    .diagnostic-assessment-info,
    .risk-assessment-info,
    .functional-assessment-info,
    .mental-status-info,
    .pain-assessment-info,
    .cognitive-assessment-info,
    .mobility-assessment-info,
    .nutritional-assessment-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .primary-impression {
        margin-bottom: 1rem;
        padding: 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
        border-left: 4px solid var(--color-primary);
    }
    
    .impression-text {
        margin: 0.25rem 0 0 0;
        color: var(--color-text-primary);
        line-height: 1.5;
        font-size: 1.05rem;
    }
    
    .primary-diagnosis {
        margin-bottom: 1rem;
        padding: 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
        border-left: 4px solid var(--color-success);
    }
    
    .diagnosis-details {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        margin-top: 0.25rem;
    }
    
    .diagnosis-name {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .diagnosis-code {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        font-family: monospace;
    }
    
    .diagnosis-probability {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .secondary-impressions-section,
    .differential-diagnosis-section,
    .secondary-diagnoses-section,
    .rule-out-section,
    .supporting-evidence-section,
    .risk-factors-section,
    .mitigation-strategies-section,
    .limitations-section,
    .assistive-devices-section,
    .triggering-factors-section,
    .relieving-factors-section,
    .dietary-restrictions-section {
        margin-top: 0.75rem;
    }
    
    .secondary-impressions-list,
    .supporting-evidence-list,
    .mitigation-strategies-list,
    .limitations-list {
        margin: 0.5rem 0 0 1.5rem;
        padding: 0;
    }
    
    .secondary-impressions-list li,
    .supporting-evidence-list li,
    .mitigation-strategies-list li,
    .limitations-list li {
        margin-bottom: 0.25rem;
        color: var(--color-text-secondary);
    }
    
    .differential-diagnosis-list,
    .secondary-diagnoses-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    
    .diagnosis-item {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        padding: 0.5rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
    }
    
    .rule-out-list,
    .assistive-devices-list,
    .triggering-factors-list,
    .relieving-factors-list,
    .dietary-restrictions-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-top: 0.5rem;
    }
    
    .rule-out-item,
    .device-tag,
    .factor-tag,
    .restriction-tag {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .risk-factors-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    
    .risk-factor-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
    }
    
    .factor-name {
        font-weight: 500;
        color: var(--color-text-primary);
    }
    
    .factor-level {
        font-weight: 600;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        text-transform: uppercase;
    }
    
    .overall-risk,
    .overall-functional,
    .overall-pain,
    .overall-cognitive,
    .overall-mobility,
    .overall-nutritional {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0.5rem 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
    }
    
    .risk-value,
    .functional-value,
    .pain-value,
    .cognitive-value,
    .mobility-value,
    .nutritional-value {
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        text-transform: uppercase;
        font-size: 0.9rem;
    }
    
    .score-value {
        font-weight: 600;
        color: var(--color-primary);
    }
    
    .pain-score {
        font-weight: 600;
        color: var(--color-danger-dark);
    }
    
    .bmi-value {
        font-weight: 600;
        color: var(--color-info-dark);
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
    
    .recommendation-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .recommendation-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .recommendation-category {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .recommendation-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .recommendation-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .recommendation-description {
        margin: 0 0 0.5rem 0;
        color: var(--color-text-primary);
        line-height: 1.5;
    }
    
    .priority-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .priority-low {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .priority-medium {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .priority-high {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .priority-urgent {
        background-color: var(--color-danger);
        color: white;
    }
    
    .confidence-high {
        color: var(--color-success-dark);
        font-weight: 600;
    }
    
    .confidence-moderate {
        color: var(--color-warning-dark);
        font-weight: 600;
    }
    
    .confidence-low {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .risk-low {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .risk-moderate {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .risk-high {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .risk-very-high {
        background-color: var(--color-danger);
        color: white;
    }
    
    .functional-independent {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .functional-minimal {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .functional-moderate {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .functional-maximal {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .functional-dependent {
        background-color: var(--color-danger);
        color: white;
    }
    
    .pain-none {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .pain-mild {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .pain-moderate {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .pain-severe {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .pain-very-severe {
        background-color: var(--color-danger);
        color: white;
    }
    
    .cognitive-normal {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .cognitive-mild {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .cognitive-moderate {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .cognitive-severe {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .mobility-full {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .mobility-ambulatory {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .mobility-wheelchair {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .mobility-bedbound {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .nutrition-well {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .nutrition-mild {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .nutrition-moderate {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .nutrition-severe {
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
        min-width: 200px;
        flex-shrink: 0;
    }
    
    .value {
        color: var(--color-text-primary);
        flex: 1;
        line-height: 1.4;
    }
    
    /* Priority-based panel coloring */
    .priority-low {
        border-left-color: var(--color-info);
    }
    
    .priority-medium {
        border-left-color: var(--color-warning);
    }
    
    .priority-high {
        border-left-color: var(--color-danger);
    }
    
    .priority-urgent {
        border-left-color: var(--color-danger);
        border-left-width: 4px;
    }
</style>