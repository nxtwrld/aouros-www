<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
        key?: string;
    }

    let { data, document, key }: Props = $props();
    
    let hasTumorCharacteristics = $derived(data && data.hasTumorCharacteristics);
    
    let tumorType = $derived(data?.tumorType || '');
    let histology = $derived(data?.histology || {});
    let grading = $derived(data?.grading || {});
    let staging = $derived(data?.staging || {});
    let morphology = $derived(data?.morphology || {});
    let immunohistochemistry = $derived(data?.immunohistochemistry || []);
    let molecularMarkers = $derived(data?.molecularMarkers || []);
    let genetics = $derived(data?.genetics || {});
    let invasion = $derived(data?.invasion || {});
    let margins = $derived(data?.margins || {});
    let prognosis = $derived(data?.prognosis || {});
    let recommendations = $derived(data?.recommendations || []);
    let oncologist = $derived(data?.oncologist);
    let pathologist = $derived(data?.pathologist);
    
    function getGradeClass(grade: string): string {
        const gradeClasses: Record<string, string> = {
            'low_grade': 'grade-low',
            'intermediate_grade': 'grade-intermediate',
            'high_grade': 'grade-high',
            'grade_1': 'grade-1',
            'grade_2': 'grade-2',
            'grade_3': 'grade-3',
            'grade_4': 'grade-4',
            'well_differentiated': 'grade-well',
            'moderately_differentiated': 'grade-moderate',
            'poorly_differentiated': 'grade-poor',
            'undifferentiated': 'grade-undifferentiated'
        };
        return gradeClasses[grade] || 'grade-unknown';
    }
    
    function getStageClass(stage: string): string {
        const stageClasses: Record<string, string> = {
            'stage_0': 'stage-0',
            'stage_i': 'stage-1',
            'stage_ii': 'stage-2',
            'stage_iii': 'stage-3',
            'stage_iv': 'stage-4',
            'stage_1': 'stage-1',
            'stage_2': 'stage-2',
            'stage_3': 'stage-3',
            'stage_4': 'stage-4',
            'early_stage': 'stage-early',
            'advanced_stage': 'stage-advanced'
        };
        return stageClasses[stage] || 'stage-unknown';
    }
    
    function getPrognosisClass(prognosis: string): string {
        const prognosisClasses: Record<string, string> = {
            'excellent': 'prognosis-excellent',
            'good': 'prognosis-good',
            'fair': 'prognosis-fair',
            'poor': 'prognosis-poor',
            'guarded': 'prognosis-guarded'
        };
        return prognosisClasses[prognosis] || 'prognosis-unknown';
    }
    
    function getMarkerClass(result: string): string {
        const markerClasses: Record<string, string> = {
            'positive': 'marker-positive',
            'negative': 'marker-negative',
            'weak_positive': 'marker-weak',
            'strong_positive': 'marker-strong',
            'equivocal': 'marker-equivocal',
            'amplified': 'marker-amplified',
            'not_amplified': 'marker-not-amplified'
        };
        return markerClasses[result] || 'marker-unknown';
    }
    
    function getInvasionClass(invasion: string): string {
        const invasionClasses: Record<string, string> = {
            'none': 'invasion-none',
            'minimal': 'invasion-minimal',
            'moderate': 'invasion-moderate',
            'extensive': 'invasion-extensive',
            'present': 'invasion-present',
            'absent': 'invasion-absent'
        };
        return invasionClasses[invasion] || 'invasion-unknown';
    }
    
    function getMarginsClass(margins: string): string {
        const marginsClasses: Record<string, string> = {
            'clear': 'margins-clear',
            'close': 'margins-close',
            'involved': 'margins-involved',
            'positive': 'margins-positive',
            'negative': 'margins-negative'
        };
        return marginsClasses[margins] || 'margins-unknown';
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
    
    function formatPercentage(value: number): string {
        if (value === undefined || value === null) return '';
        return `${value}%`;
    }
    
    function formatMutation(mutation: any): string {
        if (!mutation) return '';
        if (typeof mutation === 'string') return mutation;
        if (mutation.gene && mutation.variant) return `${mutation.gene} ${mutation.variant}`;
        if (mutation.gene) return mutation.gene;
        return JSON.stringify(mutation);
    }
</script>

{#if hasTumorCharacteristics}
    <h3 class="h3 heading -sticky">{$t('report.tumor-characteristics')}</h3>
    
    <!-- Tumor Type -->
    {#if tumorType}
        <h4 class="section-title-sub">{$t('report.tumor-type')}</h4>
        <div class="page -block">
            <div class="tumor-type-content">
                <span class="tumor-type-name">{tumorType}</span>
            </div>
        </div>
    {/if}
    
    <!-- Histology -->
    {#if Object.keys(histology).length > 0}
        <h4 class="section-title-sub">{$t('report.histology')}</h4>
        <div class="page -block">
            <div class="histology-info">
                {#if histology.primaryType}
                    <div class="detail-item">
                        <span class="label">{$t('report.primary-type')}:</span>
                        <span class="value">{histology.primaryType}</span>
                    </div>
                {/if}
                
                {#if histology.subtype}
                    <div class="detail-item">
                        <span class="label">{$t('report.subtype')}:</span>
                        <span class="value">{histology.subtype}</span>
                    </div>
                {/if}
                
                {#if histology.variant}
                    <div class="detail-item">
                        <span class="label">{$t('report.variant')}:</span>
                        <span class="value">{histology.variant}</span>
                    </div>
                {/if}
                
                {#if histology.architecture}
                    <div class="detail-item">
                        <span class="label">{$t('report.architecture')}:</span>
                        <span class="value">{histology.architecture}</span>
                    </div>
                {/if}
                
                {#if histology.cellularFeatures}
                    <div class="detail-item">
                        <span class="label">{$t('report.cellular-features')}:</span>
                        <span class="value">{histology.cellularFeatures}</span>
                    </div>
                {/if}
                
                {#if histology.mitosis}
                    <div class="detail-item">
                        <span class="label">{$t('report.mitotic-activity')}:</span>
                        <span class="value">{histology.mitosis}</span>
                    </div>
                {/if}
                
                {#if histology.necrosis}
                    <div class="detail-item">
                        <span class="label">{$t('report.necrosis')}:</span>
                        <span class="value">{histology.necrosis}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Grading -->
    {#if Object.keys(grading).length > 0}
        <h4 class="section-title-sub">{$t('report.grading')}</h4>
        <div class="page -block">
            <div class="grading-info">
                {#if grading.overallGrade}
                    <div class="grade-overall">
                        <span class="label">{$t('report.overall-grade')}:</span>
                        <span class="grade-value {getGradeClass(grading.overallGrade)}">
                            {$t(`medical.enums.tumor_grades.${grading.overallGrade}`)}
                        </span>
                    </div>
                {/if}
                
                {#if grading.histologicGrade}
                    <div class="detail-item">
                        <span class="label">{$t('report.histologic-grade')}:</span>
                        <span class="value {getGradeClass(grading.histologicGrade)}">
                            {$t(`medical.enums.tumor_grades.${grading.histologicGrade}`)}
                        </span>
                    </div>
                {/if}
                
                {#if grading.nuclearGrade}
                    <div class="detail-item">
                        <span class="label">{$t('report.nuclear-grade')}:</span>
                        <span class="value {getGradeClass(grading.nuclearGrade)}">
                            {$t(`medical.enums.tumor_grades.${grading.nuclearGrade}`)}
                        </span>
                    </div>
                {/if}
                
                {#if grading.mitosisCount}
                    <div class="detail-item">
                        <span class="label">{$t('report.mitosis-count')}:</span>
                        <span class="value">{grading.mitosisCount}</span>
                    </div>
                {/if}
                
                {#if grading.kiIndex}
                    <div class="detail-item">
                        <span class="label">{$t('report.ki-index')}:</span>
                        <span class="value">{formatPercentage(grading.kiIndex)}</span>
                    </div>
                {/if}
                
                {#if grading.gradingSystem}
                    <div class="detail-item">
                        <span class="label">{$t('report.grading-system')}:</span>
                        <span class="value">{grading.gradingSystem}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Staging -->
    {#if Object.keys(staging).length > 0}
        <h4 class="section-title-sub">{$t('report.staging')}</h4>
        <div class="page -block">
            <div class="staging-info">
                {#if staging.overallStage}
                    <div class="stage-overall">
                        <span class="label">{$t('report.overall-stage')}:</span>
                        <span class="stage-value {getStageClass(staging.overallStage)}">
                            {$t(`medical.enums.tumor_stages.${staging.overallStage}`)}
                        </span>
                    </div>
                {/if}
                
                {#if staging.tStage}
                    <div class="detail-item">
                        <span class="label">{$t('report.t-stage')}:</span>
                        <span class="value">{staging.tStage}</span>
                    </div>
                {/if}
                
                {#if staging.nStage}
                    <div class="detail-item">
                        <span class="label">{$t('report.n-stage')}:</span>
                        <span class="value">{staging.nStage}</span>
                    </div>
                {/if}
                
                {#if staging.mStage}
                    <div class="detail-item">
                        <span class="label">{$t('report.m-stage')}:</span>
                        <span class="value">{staging.mStage}</span>
                    </div>
                {/if}
                
                {#if staging.stagingSystem}
                    <div class="detail-item">
                        <span class="label">{$t('report.staging-system')}:</span>
                        <span class="value">{staging.stagingSystem}</span>
                    </div>
                {/if}
                
                {#if staging.pathologicStage}
                    <div class="detail-item">
                        <span class="label">{$t('report.pathologic-stage')}:</span>
                        <span class="value">{staging.pathologicStage}</span>
                    </div>
                {/if}
                
                {#if staging.clinicalStage}
                    <div class="detail-item">
                        <span class="label">{$t('report.clinical-stage')}:</span>
                        <span class="value">{staging.clinicalStage}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Morphology -->
    {#if Object.keys(morphology).length > 0}
        <h4 class="section-title-sub">{$t('report.morphology')}</h4>
        <div class="page -block">
            <div class="morphology-info">
                {#if morphology.size}
                    <div class="detail-item">
                        <span class="label">{$t('report.size')}:</span>
                        <span class="value size-value">{morphology.size}</span>
                    </div>
                {/if}
                
                {#if morphology.shape}
                    <div class="detail-item">
                        <span class="label">{$t('report.shape')}:</span>
                        <span class="value">{morphology.shape}</span>
                    </div>
                {/if}
                
                {#if morphology.consistency}
                    <div class="detail-item">
                        <span class="label">{$t('report.consistency')}:</span>
                        <span class="value">{morphology.consistency}</span>
                    </div>
                {/if}
                
                {#if morphology.color}
                    <div class="detail-item">
                        <span class="label">{$t('report.color')}:</span>
                        <span class="value">{morphology.color}</span>
                    </div>
                {/if}
                
                {#if morphology.cut_surface}
                    <div class="detail-item">
                        <span class="label">{$t('report.cut-surface')}:</span>
                        <span class="value">{morphology.cut_surface}</span>
                    </div>
                {/if}
                
                {#if morphology.encapsulation}
                    <div class="detail-item">
                        <span class="label">{$t('report.encapsulation')}:</span>
                        <span class="value">{morphology.encapsulation ? $t('report.present') : $t('report.absent')}</span>
                    </div>
                {/if}
                
                {#if morphology.weight}
                    <div class="detail-item">
                        <span class="label">{$t('report.weight')}:</span>
                        <span class="value">{morphology.weight}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Immunohistochemistry -->
    {#if immunohistochemistry.length > 0}
        <h4 class="section-title-sub">{$t('report.immunohistochemistry')}</h4>
        <div class="page -block">
            <div class="ihc-grid">
                {#each immunohistochemistry as ihc}
                    <div class="ihc-item">
                        <div class="ihc-header">
                            <span class="ihc-marker">{ihc.marker}</span>
                            <span class="ihc-result {getMarkerClass(ihc.result)}">
                                {$t(`medical.enums.ihc_results.${ihc.result}`)}
                            </span>
                        </div>
                        
                        <div class="ihc-details">
                            {#if ihc.intensity}
                                <div class="ihc-detail">
                                    <span class="detail-label">{$t('report.intensity')}:</span>
                                    <span class="detail-value">{ihc.intensity}</span>
                                </div>
                            {/if}
                            
                            {#if ihc.percentage}
                                <div class="ihc-detail">
                                    <span class="detail-label">{$t('report.percentage')}:</span>
                                    <span class="detail-value">{formatPercentage(ihc.percentage)}</span>
                                </div>
                            {/if}
                            
                            {#if ihc.distribution}
                                <div class="ihc-detail">
                                    <span class="detail-label">{$t('report.distribution')}:</span>
                                    <span class="detail-value">{ihc.distribution}</span>
                                </div>
                            {/if}
                            
                            {#if ihc.subcellularLocalization}
                                <div class="ihc-detail">
                                    <span class="detail-label">{$t('report.localization')}:</span>
                                    <span class="detail-value">{ihc.subcellularLocalization}</span>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
    
    <!-- Molecular Markers -->
    {#if molecularMarkers.length > 0}
        <h4 class="section-title-sub">{$t('report.molecular-markers')}</h4>
        <ul class="list-items">
            {#each molecularMarkers as marker}
                <li class="panel molecular-marker-item {getMarkerClass(marker.status)}">
                    <div class="marker-header">
                        <span class="marker-name">{marker.name}</span>
                        <span class="marker-status {getMarkerClass(marker.status)}">
                            {$t(`medical.enums.molecular_status.${marker.status}`)}
                        </span>
                    </div>
                    
                    <div class="marker-details">
                        {#if marker.method}
                            <div class="detail-item">
                                <span class="label">{$t('report.method')}:</span>
                                <span class="value">{marker.method}</span>
                            </div>
                        {/if}
                        
                        {#if marker.value}
                            <div class="detail-item">
                                <span class="label">{$t('report.value')}:</span>
                                <span class="value">{marker.value}</span>
                            </div>
                        {/if}
                        
                        {#if marker.reference}
                            <div class="detail-item">
                                <span class="label">{$t('report.reference')}:</span>
                                <span class="value">{marker.reference}</span>
                            </div>
                        {/if}
                        
                        {#if marker.clinicalSignificance}
                            <div class="detail-item">
                                <span class="label">{$t('report.clinical-significance')}:</span>
                                <span class="value">{marker.clinicalSignificance}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Genetics -->
    {#if Object.keys(genetics).length > 0}
        <h4 class="section-title-sub">{$t('report.genetics')}</h4>
        <div class="page -block">
            <div class="genetics-info">
                {#if genetics.mutations?.length > 0}
                    <div class="mutations-section">
                        <span class="label">{$t('report.mutations')}:</span>
                        <div class="mutations-list">
                            {#each genetics.mutations as mutation}
                                <div class="mutation-item">
                                    <span class="mutation-name">{formatMutation(mutation)}</span>
                                    {#if mutation.frequency}
                                        <span class="mutation-frequency">{formatPercentage(mutation.frequency)}</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if genetics.chromosomalAberrations?.length > 0}
                    <div class="aberrations-section">
                        <span class="label">{$t('report.chromosomal-aberrations')}:</span>
                        <div class="aberrations-list">
                            {#each genetics.chromosomalAberrations as aberration}
                                <span class="aberration-item">{aberration}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if genetics.microsatelliteInstability}
                    <div class="detail-item">
                        <span class="label">{$t('report.microsatellite-instability')}:</span>
                        <span class="value">{genetics.microsatelliteInstability}</span>
                    </div>
                {/if}
                
                {#if genetics.tumorMutationalBurden}
                    <div class="detail-item">
                        <span class="label">{$t('report.tumor-mutational-burden')}:</span>
                        <span class="value">{genetics.tumorMutationalBurden}</span>
                    </div>
                {/if}
                
                {#if genetics.homologousRecombination}
                    <div class="detail-item">
                        <span class="label">{$t('report.homologous-recombination')}:</span>
                        <span class="value">{genetics.homologousRecombination}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Invasion -->
    {#if Object.keys(invasion).length > 0}
        <h4 class="section-title-sub">{$t('report.invasion-assessment')}</h4>
        <div class="page -block">
            <div class="invasion-info">
                {#if invasion.vascular}
                    <div class="detail-item">
                        <span class="label">{$t('report.vascular-invasion')}:</span>
                        <span class="value {getInvasionClass(invasion.vascular)}">
                            {$t(`medical.enums.invasion_status.${invasion.vascular}`)}
                        </span>
                    </div>
                {/if}
                
                {#if invasion.lymphatic}
                    <div class="detail-item">
                        <span class="label">{$t('report.lymphatic-invasion')}:</span>
                        <span class="value {getInvasionClass(invasion.lymphatic)}">
                            {$t(`medical.enums.invasion_status.${invasion.lymphatic}`)}
                        </span>
                    </div>
                {/if}
                
                {#if invasion.perineural}
                    <div class="detail-item">
                        <span class="label">{$t('report.perineural-invasion')}:</span>
                        <span class="value {getInvasionClass(invasion.perineural)}">
                            {$t(`medical.enums.invasion_status.${invasion.perineural}`)}
                        </span>
                    </div>
                {/if}
                
                {#if invasion.depth}
                    <div class="detail-item">
                        <span class="label">{$t('report.invasion-depth')}:</span>
                        <span class="value">{invasion.depth}</span>
                    </div>
                {/if}
                
                {#if invasion.organInvasion?.length > 0}
                    <div class="organ-invasion-section">
                        <span class="label">{$t('report.organ-invasion')}:</span>
                        <div class="organ-invasion-list">
                            {#each invasion.organInvasion as organ}
                                <span class="organ-item">{organ}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Margins -->
    {#if Object.keys(margins).length > 0}
        <h4 class="section-title-sub">{$t('report.margins')}</h4>
        <div class="page -block">
            <div class="margins-info">
                {#if margins.overall}
                    <div class="margins-overall">
                        <span class="label">{$t('report.overall-margins')}:</span>
                        <span class="margins-value {getMarginsClass(margins.overall)}">
                            {$t(`medical.enums.margin_status.${margins.overall}`)}
                        </span>
                    </div>
                {/if}
                
                {#if margins.closest}
                    <div class="detail-item">
                        <span class="label">{$t('report.closest-margin')}:</span>
                        <span class="value">{margins.closest}</span>
                    </div>
                {/if}
                
                {#if margins.distance}
                    <div class="detail-item">
                        <span class="label">{$t('report.margin-distance')}:</span>
                        <span class="value">{margins.distance}</span>
                    </div>
                {/if}
                
                {#if margins.specific?.length > 0}
                    <div class="specific-margins-section">
                        <span class="label">{$t('report.specific-margins')}:</span>
                        <div class="specific-margins-list">
                            {#each margins.specific as margin}
                                <div class="specific-margin-item">
                                    <span class="margin-location">{margin.location}:</span>
                                    <span class="margin-status {getMarginsClass(margin.status)}">
                                        {$t(`medical.enums.margin_status.${margin.status}`)}
                                    </span>
                                    {#if margin.distance}
                                        <span class="margin-distance">({margin.distance})</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Prognosis -->
    {#if Object.keys(prognosis).length > 0}
        <h4 class="section-title-sub">{$t('report.prognosis')}</h4>
        <div class="page -block">
            <div class="prognosis-info">
                {#if prognosis.overall}
                    <div class="prognosis-overall">
                        <span class="label">{$t('report.overall-prognosis')}:</span>
                        <span class="prognosis-value {getPrognosisClass(prognosis.overall)}">
                            {$t(`medical.enums.prognosis_levels.${prognosis.overall}`)}
                        </span>
                    </div>
                {/if}
                
                {#if prognosis.fiveYearSurvival}
                    <div class="detail-item">
                        <span class="label">{$t('report.five-year-survival')}:</span>
                        <span class="value">{formatPercentage(prognosis.fiveYearSurvival)}</span>
                    </div>
                {/if}
                
                {#if prognosis.recurrenceRisk}
                    <div class="detail-item">
                        <span class="label">{$t('report.recurrence-risk')}:</span>
                        <span class="value">{prognosis.recurrenceRisk}</span>
                    </div>
                {/if}
                
                {#if prognosis.prognosticFactors?.length > 0}
                    <div class="prognostic-factors-section">
                        <span class="label">{$t('report.prognostic-factors')}:</span>
                        <div class="prognostic-factors-list">
                            {#each prognosis.prognosticFactors as factor}
                                <span class="prognostic-factor">{factor}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if prognosis.treatmentResponse}
                    <div class="detail-item">
                        <span class="label">{$t('report.treatment-response')}:</span>
                        <span class="value">{prognosis.treatmentResponse}</span>
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
                        <span class="recommendation-text">{recommendation.text}</span>
                        {#if recommendation.priority}
                            <span class="priority-badge {getPriorityClass(recommendation.priority)}">
                                {$t(`medical.enums.priority_levels.${recommendation.priority}`)}
                            </span>
                        {/if}
                    </div>
                    
                    <div class="recommendation-details">
                        {#if recommendation.type}
                            <div class="detail-item">
                                <span class="label">{$t('report.type')}:</span>
                                <span class="value">{recommendation.type}</span>
                            </div>
                        {/if}
                        
                        {#if recommendation.timeframe}
                            <div class="detail-item">
                                <span class="label">{$t('report.timeframe')}:</span>
                                <span class="value">{recommendation.timeframe}</span>
                            </div>
                        {/if}
                        
                        {#if recommendation.rationale}
                            <div class="detail-item">
                                <span class="label">{$t('report.rationale')}:</span>
                                <span class="value">{recommendation.rationale}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Medical Team -->
    {#if oncologist || pathologist}
        <h4 class="section-title-sub">{$t('report.medical-team')}</h4>
        <div class="page -block">
            <div class="medical-team-info">
                {#if oncologist}
                    <div class="team-member">
                        <span class="label">{$t('report.oncologist')}:</span>
                        <div class="member-details">
                            <span class="member-name">{oncologist.name}</span>
                            {#if oncologist.title}
                                <span class="member-title">{oncologist.title}</span>
                            {/if}
                            {#if oncologist.department}
                                <span class="member-department">{oncologist.department}</span>
                            {/if}
                        </div>
                    </div>
                {/if}
                
                {#if pathologist}
                    <div class="team-member">
                        <span class="label">{$t('report.pathologist')}:</span>
                        <div class="member-details">
                            <span class="member-name">{pathologist.name}</span>
                            {#if pathologist.title}
                                <span class="member-title">{pathologist.title}</span>
                            {/if}
                            {#if pathologist.department}
                                <span class="member-department">{pathologist.department}</span>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.tumor-characteristics')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-tumor-data')}</p>
    </div>
{/if}

<style>
    .tumor-type-content {
        background-color: var(--color-background-secondary);
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid var(--color-primary);
    }
    
    .tumor-type-name {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .histology-info,
    .grading-info,
    .staging-info,
    .morphology-info,
    .genetics-info,
    .invasion-info,
    .margins-info,
    .prognosis-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .grade-overall,
    .stage-overall,
    .margins-overall,
    .prognosis-overall {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0.5rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
    }
    
    .grade-value,
    .stage-value,
    .margins-value,
    .prognosis-value {
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        text-transform: uppercase;
        font-size: 0.9rem;
    }
    
    .grade-low,
    .grade-well {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .grade-intermediate,
    .grade-moderate,
    .grade-2 {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .grade-high,
    .grade-poor,
    .grade-3,
    .grade-4 {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .grade-undifferentiated {
        background-color: var(--color-danger);
        color: white;
    }
    
    .grade-1 {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .stage-0,
    .stage-1,
    .stage-early {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .stage-2 {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .stage-3 {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .stage-4,
    .stage-advanced {
        background-color: var(--color-danger);
        color: white;
    }
    
    .size-value {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .ihc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }
    
    .ihc-item {
        padding: 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
        border: 1px solid var(--color-border);
    }
    
    .ihc-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .ihc-marker {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .ihc-result {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .marker-positive {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .marker-negative {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
    }
    
    .marker-weak {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .marker-strong {
        background-color: var(--color-success);
        color: white;
    }
    
    .marker-equivocal {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .marker-amplified {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .marker-not-amplified {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .ihc-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .ihc-detail {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    
    .detail-label {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        min-width: 80px;
    }
    
    .detail-value {
        font-size: 0.9rem;
        color: var(--color-text-primary);
        font-weight: 500;
    }
    
    .molecular-marker-item {
        border-left-color: var(--color-primary);
    }
    
    .marker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .marker-name {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .marker-status {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .marker-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .mutations-section,
    .aberrations-section,
    .organ-invasion-section,
    .specific-margins-section,
    .prognostic-factors-section {
        margin-bottom: 0.75rem;
    }
    
    .mutations-list,
    .aberrations-list,
    .organ-invasion-list,
    .specific-margins-list,
    .prognostic-factors-list {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-top: 0.5rem;
    }
    
    .mutation-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
    }
    
    .mutation-name {
        font-weight: 500;
        color: var(--color-text-primary);
    }
    
    .mutation-frequency {
        color: var(--color-warning-dark);
        font-weight: 600;
    }
    
    .aberration-item,
    .organ-item,
    .prognostic-factor {
        padding: 0.25rem 0.5rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
        color: var(--color-text-primary);
    }
    
    .specific-margin-item {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        padding: 0.5rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
    }
    
    .margin-location {
        font-weight: 500;
        color: var(--color-text-secondary);
    }
    
    .margin-status {
        font-weight: 600;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        text-transform: uppercase;
    }
    
    .margins-clear,
    .margins-negative {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .margins-close {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .margins-involved,
    .margins-positive {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .margin-distance {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
    }
    
    .invasion-none,
    .invasion-absent {
        color: var(--color-success-dark);
        font-weight: 600;
    }
    
    .invasion-minimal {
        color: var(--color-warning-dark);
        font-weight: 600;
    }
    
    .invasion-moderate,
    .invasion-present {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .invasion-extensive {
        color: var(--color-danger);
        font-weight: 600;
    }
    
    .prognosis-excellent,
    .prognosis-good {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .prognosis-fair {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .prognosis-poor,
    .prognosis-guarded {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
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
    
    .recommendation-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .medical-team-info {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .team-member {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
    }
    
    .member-details {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }
    
    .member-name {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .member-title,
    .member-department {
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
        min-width: 150px;
        flex-shrink: 0;
    }
    
    .value {
        color: var(--color-text-primary);
        flex: 1;
        line-height: 1.4;
    }
    
    /* Panel marker status coloring */
    .marker-positive {
        border-left-color: var(--color-success);
    }
    
    .marker-negative {
        border-left-color: var(--color-secondary);
    }
    
    .marker-weak {
        border-left-color: var(--color-warning);
    }
    
    .marker-strong {
        border-left-color: var(--color-success);
        border-left-width: 4px;
    }
    
    .marker-equivocal {
        border-left-color: var(--color-info);
    }
    
    .marker-amplified {
        border-left-color: var(--color-danger);
    }
    
    .marker-not-amplified {
        border-left-color: var(--color-success);
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