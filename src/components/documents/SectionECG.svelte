<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
        key?: string;
    }

    let { data, document, key }: Props = $props();
    
    let hasECG = $derived(data && data.hasECG);
    
    let basicMeasurements = $derived(data?.basicMeasurements || {});
    let rhythm = $derived(data?.rhythm || {});
    let waveformAnalysis = $derived(data?.waveformAnalysis || {});
    let abnormalFindings = $derived(data?.abnormalFindings || []);
    let interpretation = $derived(data?.interpretation || {});
    let ecgDiagnoses = $derived(data?.ecgDiagnoses || []);
    let interpretingPhysician = $derived(data?.interpretingPhysician);
    let technicalQuality = $derived(data?.technicalQuality || {});
    let recommendedFollowUp = $derived(data?.recommendedFollowUp || []);
    
    function getRhythmClass(rhythm: string): string {
        const rhythmClasses: Record<string, string> = {
            'sinus_rhythm': 'rhythm-normal',
            'sinus_bradycardia': 'rhythm-bradycardia',
            'sinus_tachycardia': 'rhythm-tachycardia',
            'atrial_fibrillation': 'rhythm-afib',
            'atrial_flutter': 'rhythm-aflutter',
            'supraventricular_tachycardia': 'rhythm-svt',
            'ventricular_tachycardia': 'rhythm-vt',
            'ventricular_fibrillation': 'rhythm-vfib',
            'heart_block': 'rhythm-block',
            'paced_rhythm': 'rhythm-paced'
        };
        return rhythmClasses[rhythm] || 'rhythm-other';
    }
    
    function getSignificanceClass(significance: string): string {
        const significanceClasses: Record<string, string> = {
            'acute': 'significance-acute',
            'old': 'significance-old',
            'possible': 'significance-possible',
            'probable': 'significance-probable',
            'definite': 'significance-definite'
        };
        return significanceClasses[significance] || 'significance-unknown';
    }
    
    function getQualityClass(quality: string): string {
        const qualityClasses: Record<string, string> = {
            'excellent': 'quality-excellent',
            'good': 'quality-good',
            'fair': 'quality-fair',
            'poor': 'quality-poor',
            'uninterpretable': 'quality-uninterpretable'
        };
        return qualityClasses[quality] || 'quality-unknown';
    }
    
    function getHeartRateClass(heartRate: number): string {
        if (heartRate < 60) return 'hr-bradycardia';
        if (heartRate > 100) return 'hr-tachycardia';
        return 'hr-normal';
    }
    
    function getIntervalClass(interval: number, normal: [number, number]): string {
        if (interval < normal[0]) return 'interval-short';
        if (interval > normal[1]) return 'interval-long';
        return 'interval-normal';
    }
</script>

{#if hasECG}
    <h3 class="h3 heading -sticky">{$t('report.ecg')}</h3>
    
    {#if data.ecgDateTime}
        <div class="page -block">
            <div class="detail-item">
                <span class="label">{$t('report.ecg-date-time')}:</span>
                <span class="value">{data.ecgDateTime}</span>
            </div>
        </div>
    {/if}
    
    <!-- Basic Measurements -->
    {#if Object.keys(basicMeasurements).length > 0}
        <h4 class="section-title-sub">{$t('report.basic-measurements')}</h4>
        <div class="page -block">
            <div class="measurements-grid">
                {#if basicMeasurements.heartRate}
                    <div class="measurement-item {getHeartRateClass(basicMeasurements.heartRate)}">
                        <span class="measurement-label">{$t('report.heart-rate')}:</span>
                        <span class="measurement-value">{basicMeasurements.heartRate} {$t('report.bpm')}</span>
                    </div>
                {/if}
                
                {#if basicMeasurements.prInterval}
                    <div class="measurement-item {getIntervalClass(basicMeasurements.prInterval, [120, 200])}">
                        <span class="measurement-label">{$t('report.pr-interval')}:</span>
                        <span class="measurement-value">{basicMeasurements.prInterval} {$t('report.ms')}</span>
                    </div>
                {/if}
                
                {#if basicMeasurements.qrsWidth}
                    <div class="measurement-item {getIntervalClass(basicMeasurements.qrsWidth, [80, 120])}">
                        <span class="measurement-label">{$t('report.qrs-width')}:</span>
                        <span class="measurement-value">{basicMeasurements.qrsWidth} {$t('report.ms')}</span>
                    </div>
                {/if}
                
                {#if basicMeasurements.qtInterval}
                    <div class="measurement-item">
                        <span class="measurement-label">{$t('report.qt-interval')}:</span>
                        <span class="measurement-value">{basicMeasurements.qtInterval} {$t('report.ms')}</span>
                    </div>
                {/if}
                
                {#if basicMeasurements.qtCorrected}
                    <div class="measurement-item {getIntervalClass(basicMeasurements.qtCorrected, [350, 450])}">
                        <span class="measurement-label">{$t('report.qtc')}:</span>
                        <span class="measurement-value">{basicMeasurements.qtCorrected} {$t('report.ms')}</span>
                    </div>
                {/if}
                
                {#if basicMeasurements.axis}
                    <div class="measurement-item">
                        <span class="measurement-label">{$t('report.axis')}:</span>
                        <span class="measurement-value">{basicMeasurements.axis}°</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Rhythm Analysis -->
    {#if Object.keys(rhythm).length > 0}
        <h4 class="section-title-sub">{$t('report.rhythm-analysis')}</h4>
        <div class="page -block">
            {#if rhythm.primaryRhythm}
                <div class="rhythm-section">
                    <div class="rhythm-header">
                        <span class="rhythm-primary {getRhythmClass(rhythm.primaryRhythm)}">
                            {$t(`medical.enums.ecg_rhythms.${rhythm.primaryRhythm}`)}
                        </span>
                        {#if rhythm.regularity}
                            <span class="rhythm-regularity">
                                ({$t(`medical.enums.rhythm_regularity.${rhythm.regularity}`)})
                            </span>
                        {/if}
                    </div>
                    
                    {#if rhythm.rhythmDescription}
                        <p class="rhythm-description">{rhythm.rhythmDescription}</p>
                    {/if}
                    
                    {#if rhythm.arrhythmias?.length > 0}
                        <div class="arrhythmias-section">
                            <span class="label">{$t('report.additional-arrhythmias')}:</span>
                            <div class="arrhythmias-list">
                                {#each rhythm.arrhythmias as arrhythmia}
                                    <span class="arrhythmia-tag">{arrhythmia}</span>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
    
    <!-- Waveform Analysis -->
    {#if Object.keys(waveformAnalysis).length > 0}
        <h4 class="section-title-sub">{$t('report.waveform-analysis')}</h4>
        <div class="page -block">
            <div class="waveform-grid">
                {#if waveformAnalysis.pWave}
                    <div class="waveform-section">
                        <h5 class="waveform-title">{$t('report.p-wave')}</h5>
                        <div class="waveform-details">
                            {#if waveformAnalysis.pWave.present !== undefined}
                                <div class="detail-item">
                                    <span class="label">{$t('report.present')}:</span>
                                    <span class="value">{waveformAnalysis.pWave.present ? $t('report.yes') : $t('report.no')}</span>
                                </div>
                            {/if}
                            {#if waveformAnalysis.pWave.morphology}
                                <div class="detail-item">
                                    <span class="label">{$t('report.morphology')}:</span>
                                    <span class="value">{waveformAnalysis.pWave.morphology}</span>
                                </div>
                            {/if}
                            {#if waveformAnalysis.pWave.amplitude}
                                <div class="detail-item">
                                    <span class="label">{$t('report.amplitude')}:</span>
                                    <span class="value">{waveformAnalysis.pWave.amplitude}</span>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
                
                {#if waveformAnalysis.qrsComplex}
                    <div class="waveform-section">
                        <h5 class="waveform-title">{$t('report.qrs-complex')}</h5>
                        <div class="waveform-details">
                            {#if waveformAnalysis.qrsComplex.morphology}
                                <div class="detail-item">
                                    <span class="label">{$t('report.morphology')}:</span>
                                    <span class="value">{waveformAnalysis.qrsComplex.morphology}</span>
                                </div>
                            {/if}
                            {#if waveformAnalysis.qrsComplex.voltage}
                                <div class="detail-item">
                                    <span class="label">{$t('report.voltage')}:</span>
                                    <span class="value">{waveformAnalysis.qrsComplex.voltage}</span>
                                </div>
                            {/if}
                            {#if waveformAnalysis.qrsComplex.pathologicalQ !== undefined}
                                <div class="detail-item">
                                    <span class="label">{$t('report.pathological-q')}:</span>
                                    <span class="value {waveformAnalysis.qrsComplex.pathologicalQ ? 'abnormal' : 'normal'}">
                                        {waveformAnalysis.qrsComplex.pathologicalQ ? $t('report.present') : $t('report.absent')}
                                    </span>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
                
                {#if waveformAnalysis.tWave}
                    <div class="waveform-section">
                        <h5 class="waveform-title">{$t('report.t-wave')}</h5>
                        <div class="waveform-details">
                            {#if waveformAnalysis.tWave.morphology}
                                <div class="detail-item">
                                    <span class="label">{$t('report.morphology')}:</span>
                                    <span class="value">{waveformAnalysis.tWave.morphology}</span>
                                </div>
                            {/if}
                            {#if waveformAnalysis.tWave.inversions?.length > 0}
                                <div class="detail-item">
                                    <span class="label">{$t('report.inversions')}:</span>
                                    <span class="value">{waveformAnalysis.tWave.inversions.join(', ')}</span>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
                
                {#if waveformAnalysis.stSegment}
                    <div class="waveform-section">
                        <h5 class="waveform-title">{$t('report.st-segment')}</h5>
                        <div class="waveform-details">
                            {#if waveformAnalysis.stSegment.elevation?.length > 0}
                                <div class="detail-item">
                                    <span class="label">{$t('report.elevation')}:</span>
                                    <span class="value st-elevation">{waveformAnalysis.stSegment.elevation.join(', ')}</span>
                                </div>
                            {/if}
                            {#if waveformAnalysis.stSegment.depression?.length > 0}
                                <div class="detail-item">
                                    <span class="label">{$t('report.depression')}:</span>
                                    <span class="value st-depression">{waveformAnalysis.stSegment.depression.join(', ')}</span>
                                </div>
                            {/if}
                            {#if waveformAnalysis.stSegment.changes}
                                <div class="detail-item">
                                    <span class="label">{$t('report.changes')}:</span>
                                    <span class="value">{waveformAnalysis.stSegment.changes}</span>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Abnormal Findings -->
    {#if abnormalFindings.length > 0}
        <h4 class="section-title-sub">{$t('report.abnormal-findings')}</h4>
        <ul class="list-items">
            {#each abnormalFindings as finding}
                <li class="panel {getSignificanceClass(finding.significance)}">
                    <div class="finding-header">
                        <span class="finding-description">{finding.finding}</span>
                        {#if finding.significance}
                            <span class="significance-badge {getSignificanceClass(finding.significance)}">
                                {$t(`medical.enums.finding_significance.${finding.significance}`)}
                            </span>
                        {/if}
                    </div>
                    {#if finding.location?.length > 0}
                        <div class="finding-location">
                            <span class="label">{$t('report.leads')}:</span>
                            <span class="value">{finding.location.join(', ')}</span>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Interpretation -->
    {#if Object.keys(interpretation).length > 0}
        <h4 class="section-title-sub">{$t('report.interpretation')}</h4>
        <div class="page -block">
            {#if interpretation.overallInterpretation}
                <div class="interpretation-section">
                    <h5 class="interpretation-title">{$t('report.overall-interpretation')}</h5>
                    <p class="interpretation-text">{interpretation.overallInterpretation}</p>
                </div>
            {/if}
            
            {#if interpretation.comparison}
                <div class="interpretation-section">
                    <h5 class="interpretation-title">{$t('report.comparison')}</h5>
                    <p class="interpretation-text">{interpretation.comparison}</p>
                </div>
            {/if}
            
            {#if interpretation.clinicalCorrelation}
                <div class="interpretation-section">
                    <h5 class="interpretation-title">{$t('report.clinical-correlation')}</h5>
                    <p class="interpretation-text">{interpretation.clinicalCorrelation}</p>
                </div>
            {/if}
        </div>
    {/if}
    
    <!-- ECG Diagnoses -->
    {#if ecgDiagnoses.length > 0}
        <h4 class="section-title-sub">{$t('report.ecg-diagnoses')}</h4>
        <ul class="list-items">
            {#each ecgDiagnoses as diagnosis}
                <li class="panel diagnosis-item">
                    <div class="diagnosis-header">
                        <span class="diagnosis-name">{diagnosis.name}</span>
                        {#if diagnosis.confidence}
                            <span class="confidence-badge">{Math.round(diagnosis.confidence * 100)}%</span>
                        {/if}
                    </div>
                    {#if diagnosis.description}
                        <p class="diagnosis-description">{diagnosis.description}</p>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Technical Quality -->
    {#if Object.keys(technicalQuality).length > 0}
        <h4 class="section-title-sub">{$t('report.technical-quality')}</h4>
        <div class="page -block">
            {#if technicalQuality.quality}
                <div class="quality-section">
                    <span class="label">{$t('report.quality')}:</span>
                    <span class="quality-value {getQualityClass(technicalQuality.quality)}">
                        {$t(`medical.enums.ecg_quality.${technicalQuality.quality}`)}
                    </span>
                </div>
            {/if}
            
            {#if technicalQuality.artifacts?.length > 0}
                <div class="artifacts-section">
                    <span class="label">{$t('report.artifacts')}:</span>
                    <div class="artifacts-list">
                        {#each technicalQuality.artifacts as artifact}
                            <span class="artifact-tag">{$t(`medical.enums.ecg_artifacts.${artifact}`)}</span>
                        {/each}
                    </div>
                </div>
            {/if}
            
            {#if technicalQuality.limitations}
                <div class="limitations-section">
                    <span class="label">{$t('report.limitations')}:</span>
                    <p class="limitations-text">{technicalQuality.limitations}</p>
                </div>
            {/if}
        </div>
    {/if}
    
    <!-- Interpreting Physician -->
    {#if interpretingPhysician}
        <h4 class="section-title-sub">{$t('report.interpreting-physician')}</h4>
        <div class="page -block">
            <div class="physician-info">
                <span class="physician-name">{interpretingPhysician.name}</span>
                {#if interpretingPhysician.title}
                    <span class="physician-title">{interpretingPhysician.title}</span>
                {/if}
                {#if interpretingPhysician.department}
                    <span class="physician-department">{interpretingPhysician.department}</span>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Recommended Follow-up -->
    {#if recommendedFollowUp.length > 0}
        <h4 class="section-title-sub">{$t('report.recommended-follow-up')}</h4>
        <ul class="list-items">
            {#each recommendedFollowUp as followUp}
                <li class="panel followup-item">
                    <span class="followup-text">{followUp}</span>
                </li>
            {/each}
        </ul>
    {/if}
    
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.ecg')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-ecg-data')}</p>
    </div>
{/if}

<style>
    .measurements-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .measurement-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        border-radius: 0.25rem;
        background-color: var(--color-background-secondary);
    }
    
    .measurement-label {
        font-weight: 500;
        color: var(--color-text-secondary);
    }
    
    .measurement-value {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .hr-normal { border-left: 3px solid var(--color-success); }
    .hr-bradycardia { border-left: 3px solid var(--color-warning); }
    .hr-tachycardia { border-left: 3px solid var(--color-danger); }
    
    .interval-normal { border-left: 3px solid var(--color-success); }
    .interval-short { border-left: 3px solid var(--color-warning); }
    .interval-long { border-left: 3px solid var(--color-danger); }
    
    .rhythm-section {
        margin-bottom: 1rem;
    }
    
    .rhythm-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }
    
    .rhythm-primary {
        font-weight: 600;
        font-size: 1.1rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
    }
    
    .rhythm-normal { background-color: var(--color-success-light); color: var(--color-success-dark); }
    .rhythm-bradycardia { background-color: var(--color-warning-light); color: var(--color-warning-dark); }
    .rhythm-tachycardia { background-color: var(--color-danger-light); color: var(--color-danger-dark); }
    .rhythm-afib { background-color: var(--color-danger-light); color: var(--color-danger-dark); }
    .rhythm-aflutter { background-color: var(--color-warning-light); color: var(--color-warning-dark); }
    .rhythm-svt { background-color: var(--color-danger-light); color: var(--color-danger-dark); }
    .rhythm-vt { background-color: var(--color-danger-light); color: var(--color-danger-dark); }
    .rhythm-vfib { background-color: var(--color-danger-light); color: var(--color-danger-dark); }
    .rhythm-block { background-color: var(--color-warning-light); color: var(--color-warning-dark); }
    .rhythm-paced { background-color: var(--color-info-light); color: var(--color-info-dark); }
    .rhythm-other { background-color: var(--color-secondary-light); color: var(--color-secondary-dark); }
    
    .rhythm-regularity {
        color: var(--color-text-secondary);
        font-style: italic;
    }
    
    .rhythm-description {
        margin-bottom: 0.5rem;
    }
    
    .arrhythmias-section {
        margin-top: 0.5rem;
    }
    
    .arrhythmias-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-top: 0.25rem;
    }
    
    .arrhythmia-tag {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
    }
    
    .waveform-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1rem;
    }
    
    .waveform-section {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: var(--color-background-secondary);
    }
    
    .waveform-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: var(--color-text-primary);
    }
    
    .waveform-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .st-elevation {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .st-depression {
        color: var(--color-warning-dark);
        font-weight: 600;
    }
    
    .abnormal {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .normal {
        color: var(--color-success-dark);
    }
    
    .finding-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.5rem;
        gap: 1rem;
    }
    
    .finding-description {
        font-weight: 500;
        flex: 1;
    }
    
    .significance-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .significance-acute {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .significance-old {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
    }
    
    .significance-possible {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .significance-probable {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .significance-definite {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .finding-location {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.25rem;
    }
    
    .interpretation-section {
        margin-bottom: 1rem;
    }
    
    .interpretation-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: var(--color-text-primary);
    }
    
    .interpretation-text {
        margin-bottom: 0;
        line-height: 1.5;
    }
    
    .diagnosis-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .diagnosis-name {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .confidence-badge {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .diagnosis-description {
        margin-bottom: 0;
        color: var(--color-text-secondary);
    }
    
    .quality-section {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }
    
    .quality-value {
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.9rem;
    }
    
    .quality-excellent { background-color: var(--color-success-light); color: var(--color-success-dark); }
    .quality-good { background-color: var(--color-success-light); color: var(--color-success-dark); }
    .quality-fair { background-color: var(--color-warning-light); color: var(--color-warning-dark); }
    .quality-poor { background-color: var(--color-danger-light); color: var(--color-danger-dark); }
    .quality-uninterpretable { background-color: var(--color-danger-light); color: var(--color-danger-dark); }
    
    .artifacts-section {
        margin-bottom: 0.75rem;
    }
    
    .artifacts-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-top: 0.25rem;
    }
    
    .artifact-tag {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
    }
    
    .limitations-section {
        margin-bottom: 0.75rem;
    }
    
    .limitations-text {
        margin-top: 0.25rem;
        margin-bottom: 0;
        color: var(--color-text-secondary);
        font-style: italic;
    }
    
    .physician-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .physician-name {
        font-weight: 600;
        color: var(--color-text-primary);
    }
    
    .physician-title,
    .physician-department {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
    }
    
    .followup-item {
        border-left-color: var(--color-info);
    }
    
    .followup-text {
        color: var(--color-text-primary);
    }
    
    .diagnosis-item {
        border-left-color: var(--color-primary);
    }
    
    /* Panel significance coloring */
    .significance-acute {
        border-left-color: var(--color-danger);
    }
    
    .significance-old {
        border-left-color: var(--color-secondary);
    }
    
    .significance-possible {
        border-left-color: var(--color-info);
    }
    
    .significance-probable {
        border-left-color: var(--color-warning);
    }
    
    .significance-definite {
        border-left-color: var(--color-success);
    }
</style>