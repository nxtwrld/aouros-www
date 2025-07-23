<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
        key?: string;
    }

    let { data, document, key }: Props = $props();
    
    let hasSpecialStains = $derived(data && data.hasSpecialStains);
    
    let stains = $derived(data?.stains || []);
    let immunohistochemistry = $derived(data?.immunohistochemistry || []);
    let histochemistry = $derived(data?.histochemistry || []);
    let cytochemistry = $derived(data?.cytochemistry || []);
    let molecularStains = $derived(data?.molecularStains || []);
    let stainingSummary = $derived(data?.stainingSummary || {});
    let technicalQuality = $derived(data?.technicalQuality || {});
    let technician = $derived(data?.technician);
    let pathologist = $derived(data?.pathologist);
    
    function getResultClass(result: string): string {
        const resultClasses: Record<string, string> = {
            'positive': 'result-positive',
            'negative': 'result-negative',
            'equivocal': 'result-equivocal',
            'inconclusive': 'result-inconclusive',
            'weak_positive': 'result-weak-positive',
            'strong_positive': 'result-strong-positive'
        };
        return resultClasses[result] || 'result-unknown';
    }
    
    function getIntensityClass(intensity: string): string {
        const intensityClasses: Record<string, string> = {
            'weak': 'intensity-weak',
            'moderate': 'intensity-moderate',
            'strong': 'intensity-strong',
            'variable': 'intensity-variable'
        };
        return intensityClasses[intensity] || 'intensity-unknown';
    }
    
    function getDistributionClass(distribution: string): string {
        const distributionClasses: Record<string, string> = {
            'focal': 'distribution-focal',
            'diffuse': 'distribution-diffuse',
            'patchy': 'distribution-patchy',
            'uniform': 'distribution-uniform'
        };
        return distributionClasses[distribution] || 'distribution-unknown';
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
    
    function getStainTypeClass(type: string): string {
        const typeClasses: Record<string, string> = {
            'immunohistochemistry': 'type-ihc',
            'histochemistry': 'type-histo',
            'cytochemistry': 'type-cyto',
            'molecular': 'type-molecular',
            'special': 'type-special'
        };
        return typeClasses[type] || 'type-general';
    }
    
    function formatPercentage(percentage: any): string {
        if (percentage === null || percentage === undefined) return '';
        if (typeof percentage === 'number') return `${percentage}%`;
        if (typeof percentage === 'string') return percentage;
        return '';
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
    
    function formatScore(score: any): string {
        if (score === null || score === undefined) return '';
        if (typeof score === 'object' && score.value !== undefined) {
            return `${score.value}${score.scale ? `/${score.scale}` : ''}`;
        }
        return score.toString();
    }
</script>

{#if hasSpecialStains}
    <h3 class="h3 heading -sticky">{$t('report.special-stains')}</h3>
    
    <!-- Staining Summary -->
    {#if Object.keys(stainingSummary).length > 0}
        <h4 class="section-title-sub">{$t('report.staining-summary')}</h4>
        <div class="page -block">
            <div class="staining-summary-info">
                {#if stainingSummary.totalStains}
                    <div class="detail-item">
                        <span class="label">{$t('report.total-stains')}:</span>
                        <span class="value">{stainingSummary.totalStains}</span>
                    </div>
                {/if}
                
                {#if stainingSummary.positiveStains}
                    <div class="detail-item">
                        <span class="label">{$t('report.positive-stains')}:</span>
                        <span class="value positive-count">{stainingSummary.positiveStains}</span>
                    </div>
                {/if}
                
                {#if stainingSummary.negativeStains}
                    <div class="detail-item">
                        <span class="label">{$t('report.negative-stains')}:</span>
                        <span class="value negative-count">{stainingSummary.negativeStains}</span>
                    </div>
                {/if}
                
                {#if stainingSummary.diagnosticUtility}
                    <div class="detail-item">
                        <span class="label">{$t('report.diagnostic-utility')}:</span>
                        <span class="value">{stainingSummary.diagnosticUtility}</span>
                    </div>
                {/if}
                
                {#if stainingSummary.overallInterpretation}
                    <div class="overall-interpretation">
                        <span class="label">{$t('report.overall-interpretation')}:</span>
                        <p class="interpretation-text">{stainingSummary.overallInterpretation}</p>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Immunohistochemistry -->
    {#if immunohistochemistry.length > 0}
        <h4 class="section-title-sub">{$t('report.immunohistochemistry')}</h4>
        <ul class="list-items">
            {#each immunohistochemistry as ihc}
                <li class="panel stain-item {getStainTypeClass('immunohistochemistry')} {getResultClass(ihc.result)}">
                    <div class="stain-header">
                        <div class="stain-main">
                            <h5 class="stain-name">{ihc.name}</h5>
                            <div class="stain-details-inline">
                                <span class="antibody-info">{ihc.antibody}</span>
                                {#if ihc.clone}
                                    <span class="clone-info">{$t('report.clone')}: {ihc.clone}</span>
                                {/if}
                            </div>
                        </div>
                        
                        <div class="stain-badges">
                            {#if ihc.result}
                                <span class="result-badge {getResultClass(ihc.result)}">
                                    {$t(`medical.enums.stain_results.${ihc.result}`)}
                                </span>
                            {/if}
                            {#if ihc.intensity}
                                <span class="intensity-badge {getIntensityClass(ihc.intensity)}">
                                    {$t(`medical.enums.stain_intensity.${ihc.intensity}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="stain-details">
                        {#if ihc.percentage}
                            <div class="detail-item">
                                <span class="label">{$t('report.percentage-positive')}:</span>
                                <span class="value percentage-value">{formatPercentage(ihc.percentage)}</span>
                            </div>
                        {/if}
                        
                        {#if ihc.distribution}
                            <div class="detail-item">
                                <span class="label">{$t('report.distribution')}:</span>
                                <span class="value {getDistributionClass(ihc.distribution)}">
                                    {$t(`medical.enums.stain_distribution.${ihc.distribution}`)}
                                </span>
                            </div>
                        {/if}
                        
                        {#if ihc.pattern}
                            <div class="detail-item">
                                <span class="label">{$t('report.pattern')}:</span>
                                <span class="value">{ihc.pattern}</span>
                            </div>
                        {/if}
                        
                        {#if ihc.subcellularLocalization}
                            <div class="detail-item">
                                <span class="label">{$t('report.subcellular-localization')}:</span>
                                <span class="value">{ihc.subcellularLocalization}</span>
                            </div>
                        {/if}
                        
                        {#if ihc.controlResults}
                            <div class="detail-item">
                                <span class="label">{$t('report.control-results')}:</span>
                                <span class="value">{ihc.controlResults}</span>
                            </div>
                        {/if}
                        
                        {#if ihc.dilution}
                            <div class="detail-item">
                                <span class="label">{$t('report.dilution')}:</span>
                                <span class="value">{ihc.dilution}</span>
                            </div>
                        {/if}
                        
                        {#if ihc.incubationTime}
                            <div class="detail-item">
                                <span class="label">{$t('report.incubation-time')}:</span>
                                <span class="value">{ihc.incubationTime}</span>
                            </div>
                        {/if}
                        
                        {#if ihc.retrievalMethod}
                            <div class="detail-item">
                                <span class="label">{$t('report.retrieval-method')}:</span>
                                <span class="value">{ihc.retrievalMethod}</span>
                            </div>
                        {/if}
                    </div>
                    
                    {#if ihc.interpretation}
                        <div class="stain-interpretation">
                            <span class="label">{$t('report.interpretation')}:</span>
                            <p class="interpretation-text">{ihc.interpretation}</p>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Histochemistry -->
    {#if histochemistry.length > 0}
        <h4 class="section-title-sub">{$t('report.histochemistry')}</h4>
        <ul class="list-items">
            {#each histochemistry as histo}
                <li class="panel stain-item {getStainTypeClass('histochemistry')} {getResultClass(histo.result)}">
                    <div class="stain-header">
                        <div class="stain-main">
                            <h5 class="stain-name">{histo.name}</h5>
                            <span class="stain-purpose">{histo.purpose}</span>
                        </div>
                        
                        <div class="stain-badges">
                            {#if histo.result}
                                <span class="result-badge {getResultClass(histo.result)}">
                                    {$t(`medical.enums.stain_results.${histo.result}`)}
                                </span>
                            {/if}
                            {#if histo.intensity}
                                <span class="intensity-badge {getIntensityClass(histo.intensity)}">
                                    {$t(`medical.enums.stain_intensity.${histo.intensity}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="stain-details">
                        {#if histo.morphology}
                            <div class="detail-item">
                                <span class="label">{$t('report.morphology')}:</span>
                                <span class="value">{histo.morphology}</span>
                            </div>
                        {/if}
                        
                        {#if histo.distribution}
                            <div class="detail-item">
                                <span class="label">{$t('report.distribution')}:</span>
                                <span class="value {getDistributionClass(histo.distribution)}">
                                    {$t(`medical.enums.stain_distribution.${histo.distribution}`)}
                                </span>
                            </div>
                        {/if}
                        
                        {#if histo.stainDuration}
                            <div class="detail-item">
                                <span class="label">{$t('report.stain-duration')}:</span>
                                <span class="value">{histo.stainDuration}</span>
                            </div>
                        {/if}
                        
                        {#if histo.pH}
                            <div class="detail-item">
                                <span class="label">{$t('report.ph')}:</span>
                                <span class="value">{histo.pH}</span>
                            </div>
                        {/if}
                        
                        {#if histo.temperature}
                            <div class="detail-item">
                                <span class="label">{$t('report.temperature')}:</span>
                                <span class="value">{histo.temperature}</span>
                            </div>
                        {/if}
                    </div>
                    
                    {#if histo.interpretation}
                        <div class="stain-interpretation">
                            <span class="label">{$t('report.interpretation')}:</span>
                            <p class="interpretation-text">{histo.interpretation}</p>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Cytochemistry -->
    {#if cytochemistry.length > 0}
        <h4 class="section-title-sub">{$t('report.cytochemistry')}</h4>
        <ul class="list-items">
            {#each cytochemistry as cyto}
                <li class="panel stain-item {getStainTypeClass('cytochemistry')} {getResultClass(cyto.result)}">
                    <div class="stain-header">
                        <div class="stain-main">
                            <h5 class="stain-name">{cyto.name}</h5>
                            <span class="stain-purpose">{cyto.purpose}</span>
                        </div>
                        
                        <div class="stain-badges">
                            {#if cyto.result}
                                <span class="result-badge {getResultClass(cyto.result)}">
                                    {$t(`medical.enums.stain_results.${cyto.result}`)}
                                </span>
                            {/if}
                            {#if cyto.intensity}
                                <span class="intensity-badge {getIntensityClass(cyto.intensity)}">
                                    {$t(`medical.enums.stain_intensity.${cyto.intensity}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="stain-details">
                        {#if cyto.cellTypes}
                            <div class="detail-item">
                                <span class="label">{$t('report.cell-types')}:</span>
                                <span class="value">{cyto.cellTypes}</span>
                            </div>
                        {/if}
                        
                        {#if cyto.positivePercentage}
                            <div class="detail-item">
                                <span class="label">{$t('report.positive-percentage')}:</span>
                                <span class="value percentage-value">{formatPercentage(cyto.positivePercentage)}</span>
                            </div>
                        {/if}
                        
                        {#if cyto.subcellularLocation}
                            <div class="detail-item">
                                <span class="label">{$t('report.subcellular-location')}:</span>
                                <span class="value">{cyto.subcellularLocation}</span>
                            </div>
                        {/if}
                        
                        {#if cyto.enzymeActivity}
                            <div class="detail-item">
                                <span class="label">{$t('report.enzyme-activity')}:</span>
                                <span class="value">{cyto.enzymeActivity}</span>
                            </div>
                        {/if}
                        
                        {#if cyto.controls}
                            <div class="detail-item">
                                <span class="label">{$t('report.controls')}:</span>
                                <span class="value">{cyto.controls}</span>
                            </div>
                        {/if}
                    </div>
                    
                    {#if cyto.interpretation}
                        <div class="stain-interpretation">
                            <span class="label">{$t('report.interpretation')}:</span>
                            <p class="interpretation-text">{cyto.interpretation}</p>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Molecular Stains -->
    {#if molecularStains.length > 0}
        <h4 class="section-title-sub">{$t('report.molecular-stains')}</h4>
        <ul class="list-items">
            {#each molecularStains as molecular}
                <li class="panel stain-item {getStainTypeClass('molecular')} {getResultClass(molecular.result)}">
                    <div class="stain-header">
                        <div class="stain-main">
                            <h5 class="stain-name">{molecular.name}</h5>
                            <span class="stain-type">{$t(`medical.enums.molecular_stain_types.${molecular.type}`)}</span>
                        </div>
                        
                        <div class="stain-badges">
                            {#if molecular.result}
                                <span class="result-badge {getResultClass(molecular.result)}">
                                    {$t(`medical.enums.stain_results.${molecular.result}`)}
                                </span>
                            {/if}
                            {#if molecular.sensitivity}
                                <span class="sensitivity-badge">{molecular.sensitivity}</span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="stain-details">
                        {#if molecular.target}
                            <div class="detail-item">
                                <span class="label">{$t('report.target')}:</span>
                                <span class="value">{molecular.target}</span>
                            </div>
                        {/if}
                        
                        {#if molecular.probe}
                            <div class="detail-item">
                                <span class="label">{$t('report.probe')}:</span>
                                <span class="value">{molecular.probe}</span>
                            </div>
                        {/if}
                        
                        {#if molecular.hybridizationConditions}
                            <div class="detail-item">
                                <span class="label">{$t('report.hybridization-conditions')}:</span>
                                <span class="value">{molecular.hybridizationConditions}</span>
                            </div>
                        {/if}
                        
                        {#if molecular.signalStrength}
                            <div class="detail-item">
                                <span class="label">{$t('report.signal-strength')}:</span>
                                <span class="value">{molecular.signalStrength}</span>
                            </div>
                        {/if}
                        
                        {#if molecular.backgroundNoise}
                            <div class="detail-item">
                                <span class="label">{$t('report.background-noise')}:</span>
                                <span class="value">{molecular.backgroundNoise}</span>
                            </div>
                        {/if}
                        
                        {#if molecular.specificity}
                            <div class="detail-item">
                                <span class="label">{$t('report.specificity')}:</span>
                                <span class="value">{molecular.specificity}</span>
                            </div>
                        {/if}
                    </div>
                    
                    {#if molecular.interpretation}
                        <div class="stain-interpretation">
                            <span class="label">{$t('report.interpretation')}:</span>
                            <p class="interpretation-text">{molecular.interpretation}</p>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- General Stains -->
    {#if stains.length > 0}
        <h4 class="section-title-sub">{$t('report.general-stains')}</h4>
        <ul class="list-items">
            {#each stains as stain}
                <li class="panel stain-item {getStainTypeClass(stain.type)} {getResultClass(stain.result)}">
                    <div class="stain-header">
                        <div class="stain-main">
                            <h5 class="stain-name">{stain.name}</h5>
                            <span class="stain-type">{$t(`medical.enums.stain_types.${stain.type}`)}</span>
                        </div>
                        
                        <div class="stain-badges">
                            {#if stain.result}
                                <span class="result-badge {getResultClass(stain.result)}">
                                    {$t(`medical.enums.stain_results.${stain.result}`)}
                                </span>
                            {/if}
                            {#if stain.score}
                                <span class="score-badge">{formatScore(stain.score)}</span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="stain-details">
                        {#if stain.method}
                            <div class="detail-item">
                                <span class="label">{$t('report.method')}:</span>
                                <span class="value">{stain.method}</span>
                            </div>
                        {/if}
                        
                        {#if stain.reagents}
                            <div class="detail-item">
                                <span class="label">{$t('report.reagents')}:</span>
                                <span class="value">{stain.reagents}</span>
                            </div>
                        {/if}
                        
                        {#if stain.counterstain}
                            <div class="detail-item">
                                <span class="label">{$t('report.counterstain')}:</span>
                                <span class="value">{stain.counterstain}</span>
                            </div>
                        {/if}
                        
                        {#if stain.protocol}
                            <div class="detail-item">
                                <span class="label">{$t('report.protocol')}:</span>
                                <span class="value">{stain.protocol}</span>
                            </div>
                        {/if}
                    </div>
                    
                    {#if stain.interpretation}
                        <div class="stain-interpretation">
                            <span class="label">{$t('report.interpretation')}:</span>
                            <p class="interpretation-text">{stain.interpretation}</p>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Technical Quality -->
    {#if Object.keys(technicalQuality).length > 0}
        <h4 class="section-title-sub">{$t('report.technical-quality')}</h4>
        <div class="page -block">
            <div class="technical-quality-info">
                {#if technicalQuality.overall}
                    <div class="quality-overall">
                        <span class="label">{$t('report.overall-quality')}:</span>
                        <span class="quality-value {getQualityClass(technicalQuality.overall)}">
                            {$t(`medical.enums.quality_levels.${technicalQuality.overall}`)}
                        </span>
                    </div>
                {/if}
                
                {#if technicalQuality.staining}
                    <div class="detail-item">
                        <span class="label">{$t('report.staining-quality')}:</span>
                        <span class="value">{$t(`medical.enums.quality_levels.${technicalQuality.staining}`)}</span>
                    </div>
                {/if}
                
                {#if technicalQuality.morphology}
                    <div class="detail-item">
                        <span class="label">{$t('report.morphology-quality')}:</span>
                        <span class="value">{$t(`medical.enums.quality_levels.${technicalQuality.morphology}`)}</span>
                    </div>
                {/if}
                
                {#if technicalQuality.artifacts?.length > 0}
                    <div class="artifacts-section">
                        <span class="label">{$t('report.artifacts')}:</span>
                        <div class="artifacts-list">
                            {#each technicalQuality.artifacts as artifact}
                                <span class="artifact-tag">{artifact}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if technicalQuality.recommendations?.length > 0}
                    <div class="recommendations-section">
                        <span class="label">{$t('report.recommendations')}:</span>
                        <ul class="recommendations-list">
                            {#each technicalQuality.recommendations as recommendation}
                                <li>{recommendation}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Staff Information -->
    {#if pathologist || technician}
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
                
                {#if technician}
                    <div class="staff-member">
                        <span class="label">{$t('report.technician')}:</span>
                        <div class="staff-details">
                            <span class="staff-name">{technician.name}</span>
                            {#if technician.title}
                                <span class="staff-title">{technician.title}</span>
                            {/if}
                            {#if technician.certifications}
                                <span class="staff-certifications">{technician.certifications}</span>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.special-stains')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-special-stains-data')}</p>
    </div>
{/if}

<style>
    .staining-summary-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .positive-count {
        color: var(--color-success-dark);
        font-weight: 600;
    }
    
    .negative-count {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .overall-interpretation {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--color-border);
    }
    
    .interpretation-text {
        margin: 0.25rem 0 0 0;
        color: var(--color-text-primary);
        line-height: 1.5;
        font-style: italic;
    }
    
    .stain-item {
        border-left-color: var(--color-info);
    }
    
    .stain-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .stain-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .stain-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .stain-details-inline {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        flex-wrap: wrap;
    }
    
    .antibody-info {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .clone-info {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
        font-weight: 500;
    }
    
    .stain-purpose,
    .stain-type {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .stain-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .stain-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .percentage-value {
        font-weight: 600;
        color: var(--color-primary);
    }
    
    .stain-interpretation {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--color-border);
    }
    
    .technical-quality-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .quality-overall {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0.5rem 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
    }
    
    .quality-value {
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        text-transform: uppercase;
        font-size: 0.9rem;
    }
    
    .artifacts-section {
        margin-top: 0.75rem;
    }
    
    .artifacts-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-top: 0.5rem;
    }
    
    .artifact-tag {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .recommendations-section {
        margin-top: 0.75rem;
    }
    
    .recommendations-list {
        margin: 0.5rem 0 0 1.5rem;
        padding: 0;
    }
    
    .recommendations-list li {
        margin-bottom: 0.25rem;
        color: var(--color-text-secondary);
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
    .staff-department,
    .staff-certifications {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
    }
    
    .result-badge,
    .intensity-badge,
    .sensitivity-badge,
    .score-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .result-positive {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .result-negative {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .result-equivocal {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .result-inconclusive {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
    }
    
    .result-weak-positive {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
        opacity: 0.8;
    }
    
    .result-strong-positive {
        background-color: var(--color-success);
        color: white;
    }
    
    .intensity-weak {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .intensity-moderate {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .intensity-strong {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .intensity-variable {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
    }
    
    .distribution-focal {
        color: var(--color-info-dark);
    }
    
    .distribution-diffuse {
        color: var(--color-success-dark);
    }
    
    .distribution-patchy {
        color: var(--color-warning-dark);
    }
    
    .distribution-uniform {
        color: var(--color-primary);
    }
    
    .sensitivity-badge {
        background-color: var(--color-primary-light);
        color: var(--color-primary-dark);
    }
    
    .score-badge {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
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
    
    /* Stain type panel coloring */
    .type-ihc {
        border-left-color: var(--color-primary);
    }
    
    .type-histo {
        border-left-color: var(--color-info);
    }
    
    .type-cyto {
        border-left-color: var(--color-secondary);
    }
    
    .type-molecular {
        border-left-color: var(--color-success);
    }
    
    .type-special {
        border-left-color: var(--color-warning);
    }
    
    .type-general {
        border-left-color: var(--color-text-secondary);
    }
    
    /* Result-based panel coloring overrides */
    .result-positive {
        border-left-color: var(--color-success);
    }
    
    .result-negative {
        border-left-color: var(--color-danger);
    }
    
    .result-equivocal {
        border-left-color: var(--color-warning);
    }
    
    .result-inconclusive {
        border-left-color: var(--color-secondary);
    }
    
    .result-weak-positive {
        border-left-color: var(--color-success);
        opacity: 0.8;
    }
    
    .result-strong-positive {
        border-left-color: var(--color-success);
        border-left-width: 4px;
    }
</style>