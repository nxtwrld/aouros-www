<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
        key?: string;
    }

    let { data, document, key }: Props = $props();
        console.log('Medications input',$state.snapshot(data) )
    // Check if we have medication data
    let hasMedications = $derived(data && (
        data.hasMedications || 
        data.currentMedications?.length > 0 || 
        data.newPrescriptions?.length > 0 ||
        data.discontinuedMedications?.length > 0 ||
        data.medicationChanges?.length > 0
    ));
    
    // Extract medication sections
    let currentMedications = $derived(data?.currentMedications || []);
    let newPrescriptions = $derived(data?.newPrescriptions || []);
    let discontinuedMedications = $derived(data?.discontinuedMedications || []);
    let medicationChanges = $derived(data?.medicationChanges || []);
    let medicationAllergies = $derived(data?.medicationAllergies || []);
    let interactions = $derived(data?.interactions || []);
    let adherenceAssessment = $derived(data?.adherenceAssessment);
    
    // Helper functions
    function getStatusClass(status: string) {
        const statusClasses = {
            'active': 'status-active',
            'completed': 'status-completed',
            'discontinued': 'status-discontinued',
            'on_hold': 'status-hold',
            'unknown': 'status-unknown'
        };
        return statusClasses[status] || 'status-unknown';
    }
    
    function getAdherenceClass(adherence: string) {
        const adherenceClasses = {
            'excellent': 'adherence-excellent',
            'good': 'adherence-good', 
            'fair': 'adherence-fair',
            'poor': 'adherence-poor',
            'unknown': 'adherence-unknown'
        };
        return adherenceClasses[adherence] || 'adherence-unknown';
    }
    
    function getChangeTypeClass(changeType: string) {
        const changeClasses = {
            'dose_increase': 'change-increase',
            'dose_decrease': 'change-decrease',
            'frequency_change': 'change-frequency',
            'discontinued': 'change-discontinued',
            'switched': 'change-switched',
            'added': 'change-added'
        };
        return changeClasses[changeType] || 'change-neutral';
    }
    
    function getSeverityClass(severity: string) {
        const severityClasses = {
            'mild': 'severity-mild',
            'moderate': 'severity-moderate',
            'major': 'severity-major',
            'severe': 'severity-severe',
            'life_threatening': 'severity-critical',
            'contraindicated': 'severity-critical'
        };
        return severityClasses[severity] || 'severity-unknown';
    }
    
    function getRouteDisplay(route: string) {
        const routeMap = {
            'oral': 'By mouth',
            'sublingual': 'Under tongue',
            'nasal': 'Nasal',
            'inhalation': 'Inhaled',
            'topical': 'Topical',
            'transdermal': 'Patch',
            'rectal': 'Rectal',
            'intravenous': 'IV',
            'intramuscular': 'IM',
            'subcutaneous': 'SubQ',
            'ophthalmic': 'Eye drops',
            'otic': 'Ear drops',
            'vaginal': 'Vaginal',
            'buccal': 'Buccal'
        };
        return routeMap[route] || route;
    }
</script>

{#if hasMedications}
    <h3 class="h3 heading -sticky">{$t('report.medications')}</h3>
    
    <div class="page -block">
        <!-- Current Medications -->
        {#if currentMedications.length > 0}
            <div class="medication-section">
                <h4 class="section-title">{$t('report.current-medications')}</h4>
                <div class="medications-list">
                    {#each currentMedications as medication}
                        <div class="medication-card">
                            <div class="medication-header">
                                <h5 class="medication-name">{medication.medicationName}</h5>
                                <span class="medication-status {getStatusClass(medication.status)}">{medication.status || 'active'}</span>
                            </div>
                            
                            <div class="medication-details">
                                {#if medication.genericName}
                                    <div class="detail-item">
                                        <span class="label">{$t('report.generic-name')}:</span>
                                        <span class="value">{medication.genericName}</span>
                                    </div>
                                {/if}
                                
                                {#if medication.strength || medication.dosage}
                                    <div class="detail-item">
                                        <span class="label">{$t('report.dose')}:</span>
                                        <span class="value dosage-value">{medication.strength || medication.dosage}</span>
                                    </div>
                                {/if}
                                
                                {#if medication.route}
                                    <div class="detail-item">
                                        <span class="label">{$t('report.route')}:</span>
                                        <span class="value">{getRouteDisplay(medication.route)}</span>
                                    </div>
                                {/if}
                                
                                {#if medication.frequency}
                                    <div class="detail-item">
                                        <span class="label">{$t('report.frequency')}:</span>
                                        <span class="value">{medication.frequency}</span>
                                    </div>
                                {/if}
                                
                                {#if medication.indication}
                                    <div class="detail-item">
                                        <span class="label">{$t('report.indication')}:</span>
                                        <span class="value">{medication.indication}</span>
                                    </div>
                                {/if}
                                
                                {#if medication.adherence}
                                    <div class="detail-item">
                                        <span class="label">{$t('report.adherence')}:</span>
                                        <span class="value {getAdherenceClass(medication.adherence)}">{medication.adherence}</span>
                                    </div>
                                {/if}
                            </div>
                            
                            {#if medication.sideEffects?.length > 0}
                                <div class="side-effects">
                                    <span class="label">{$t('report.side-effects')}:</span>
                                    <div class="side-effects-list">
                                        {#each medication.sideEffects as effect}
                                            <span class="side-effect-tag">{effect}</span>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                            
                            {#if medication.notes}
                                <div class="medication-notes">
                                    <span class="label">{$t('report.notes')}:</span>
                                    <p>{medication.notes}</p>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        
        <!-- New Prescriptions -->
        {#if newPrescriptions.length > 0}
            <div class="medication-section">
                <h4 class="section-title">{$t('report.new-prescriptions')}</h4>
                <div class="medications-list">
                    {#each newPrescriptions as prescription}
                        <div class="medication-card prescription-card">
                            <div class="medication-header">
                                <h5 class="medication-name">{prescription.medicationName}</h5>
                                <span class="prescription-badge">{$t('report.new')}</span>
                            </div>
                            
                            <div class="medication-details">
                                {#if prescription.strength}
                                    <div class="detail-item">
                                        <span class="label">{$t('report.strength')}:</span>
                                        <span class="value dosage-value">{prescription.strength}</span>
                                    </div>
                                {/if}
                                
                                {#if prescription.dosage}
                                    <div class="detail-item">
                                        <span class="label">{$t('report.dosage')}:</span>
                                        <span class="value">{prescription.dosage}</span>
                                    </div>
                                {/if}
                                
                                {#if prescription.frequency?.schedule}
                                    <div class="detail-item">
                                        <span class="label">{$t('report.frequency')}:</span>
                                        <span class="value">{prescription.frequency.schedule}</span>
                                    </div>
                                {/if}
                                
                                {#if prescription.duration?.quantity}
                                    <div class="detail-item">
                                        <span class="label">{$t('report.quantity')}:</span>
                                        <span class="value">{prescription.duration.quantity}</span>
                                    </div>
                                {/if}
                            </div>
                            
                            {#if prescription.instructions?.administration || prescription.instructions?.specialInstructions}
                                <div class="medication-instructions">
                                    {#if prescription.instructions.administration}
                                        <p><strong>{$t('report.administration')}:</strong> {prescription.instructions.administration}</p>
                                    {/if}
                                    {#if prescription.instructions.specialInstructions}
                                        <p><strong>{$t('report.special-instructions')}:</strong> {prescription.instructions.specialInstructions}</p>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        
        <!-- Medication Changes -->
        {#if medicationChanges.length > 0}
            <div class="medication-section">
                <h4 class="section-title">{$t('report.medication-changes')}</h4>
                <div class="changes-list">
                    {#each medicationChanges as change}
                        <div class="change-item {getChangeTypeClass(change.changeType)}">
                            <div class="change-header">
                                <span class="medication-name">{change.medicationName}</span>
                                <span class="change-type">{change.changeType.replace('_', ' ')}</span>
                            </div>
                            
                            {#if change.previousDose || change.newDose}
                                <div class="dose-change">
                                    {#if change.previousDose}
                                        <span class="previous-dose">{$t('report.previous')}: {change.previousDose}</span>
                                    {/if}
                                    {#if change.newDose}
                                        <span class="arrow">→</span>
                                        <span class="new-dose">{$t('report.new')}: {change.newDose}</span>
                                    {/if}
                                </div>
                            {/if}
                            
                            {#if change.reason}
                                <div class="change-reason">
                                    <span class="label">{$t('report.reason')}:</span>
                                    <span class="value">{change.reason}</span>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        
        <!-- Discontinued Medications -->
        {#if discontinuedMedications.length > 0}
            <div class="medication-section">
                <h4 class="section-title">{$t('report.discontinued-medications')}</h4>
                <div class="discontinued-list">
                    {#each discontinuedMedications as discontinued}
                        <div class="discontinued-item">
                            <span class="medication-name">{discontinued.medicationName}</span>
                            {#if discontinued.dateDiscontinued}
                                <span class="date-discontinued">{discontinued.dateDiscontinued}</span>
                            {/if}
                            {#if discontinued.reasonDiscontinued}
                                <span class="reason">({discontinued.reasonDiscontinued})</span>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        
        <!-- Drug Interactions -->
        {#if interactions.length > 0}
            <div class="medication-section">
                <h4 class="section-title">{$t('report.drug-interactions')}</h4>
                <div class="interactions-list">
                    {#each interactions as interaction}
                        <div class="interaction-item {getSeverityClass(interaction.severity)}">
                            <div class="interaction-drugs">
                                <span class="drug1">{interaction.drug1}</span>
                                <span class="interaction-symbol">⚠️</span>
                                <span class="drug2">{interaction.drug2}</span>
                            </div>
                            <div class="interaction-details">
                                <span class="severity {getSeverityClass(interaction.severity)}">{interaction.severity}</span>
                                {#if interaction.effect}
                                    <span class="effect">{interaction.effect}</span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        
        <!-- Medication Allergies -->
        {#if medicationAllergies.length > 0}
            <div class="medication-section">
                <h4 class="section-title">{$t('report.medication-allergies')}</h4>
                <div class="allergies-list">
                    {#each medicationAllergies as allergy}
                        <div class="allergy-item {getSeverityClass(allergy.severity)}">
                            <span class="medication">{allergy.medication}</span>
                            <span class="reaction">{allergy.reaction}</span>
                            {#if allergy.severity}
                                <span class="severity {getSeverityClass(allergy.severity)}">{allergy.severity}</span>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        
        <!-- Adherence Assessment -->
        {#if adherenceAssessment}
            <div class="medication-section">
                <h4 class="section-title">{$t('report.adherence-assessment')}</h4>
                <div class="adherence-card">
                    {#if adherenceAssessment.overallAdherence}
                        <div class="overall-adherence">
                            <span class="label">{$t('report.overall-adherence')}:</span>
                            <span class="value {getAdherenceClass(adherenceAssessment.overallAdherence)}">{adherenceAssessment.overallAdherence}</span>
                        </div>
                    {/if}
                    
                    {#if adherenceAssessment.barriers?.length > 0}
                        <div class="barriers">
                            <span class="label">{$t('report.barriers')}:</span>
                            <ul>
                                {#each adherenceAssessment.barriers as barrier}
                                    <li>{barrier}</li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                    
                    {#if adherenceAssessment.interventions?.length > 0}
                        <div class="interventions">
                            <span class="label">{$t('report.interventions')}:</span>
                            <ul>
                                {#each adherenceAssessment.interventions as intervention}
                                    <li>{intervention}</li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.medications')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-medication-data')}</p>
    </div>
{/if}

<style>
    .heading {
        margin-bottom: 0;
    }
    
    .medication-section {
        margin-bottom: 2rem;
    }
    
    .section-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
        color: var(--color-primary);
        border-bottom: 2px solid var(--color-primary-light);
        padding-bottom: 0.5rem;
    }
    
    .medications-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .medication-card {
        padding: 1rem;
        border: 1px solid var(--color-gray-300);
        border-radius: 0.5rem;
        background-color: var(--color-background);
        border-left: 4px solid var(--color-info);
    }
    
    .prescription-card {
        border-left-color: var(--color-success);
        background-color: var(--color-success-light);
    }
    
    .medication-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
    }
    
    .medication-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .medication-status {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .status-active {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .status-discontinued {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .status-hold {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .prescription-badge {
        background-color: var(--color-success);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .medication-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }
    
    .detail-item {
        display: flex;
        gap: 0.5rem;
    }
    
    .label {
        font-weight: 500;
        color: var(--color-text-secondary);
        min-width: 80px;
    }
    
    .value {
        color: var(--color-text-primary);
    }
    
    .dosage-value {
        font-weight: 600;
        color: var(--color-success-dark);
    }
    
    .adherence-excellent {
        color: var(--color-success-dark);
        font-weight: 600;
    }
    
    .adherence-good {
        color: var(--color-success);
        font-weight: 600;
    }
    
    .adherence-fair {
        color: var(--color-warning-dark);
        font-weight: 600;
    }
    
    .adherence-poor {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .side-effects {
        margin-bottom: 0.75rem;
    }
    
    .side-effects-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-top: 0.25rem;
    }
    
    .side-effect-tag {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
    }
    
    .medication-notes, .medication-instructions {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
    }
    
    .medication-notes p, .medication-instructions p {
        margin: 0.25rem 0 0 0;
        line-height: 1.4;
    }
    
    /* Medication Changes */
    .changes-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .change-item {
        padding: 0.75rem;
        border-radius: 0.5rem;
        border-left: 4px solid;
    }
    
    .change-increase {
        background-color: var(--color-success-light);
        border-left-color: var(--color-success);
    }
    
    .change-decrease {
        background-color: var(--color-warning-light);
        border-left-color: var(--color-warning);
    }
    
    .change-discontinued {
        background-color: var(--color-danger-light);
        border-left-color: var(--color-danger);
    }
    
    .change-added {
        background-color: var(--color-info-light);
        border-left-color: var(--color-info);
    }
    
    .change-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .change-type {
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        color: var(--color-text-secondary);
    }
    
    .dose-change {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }
    
    .arrow {
        color: var(--color-text-secondary);
        font-weight: bold;
    }
    
    .new-dose {
        font-weight: 600;
    }
    
    /* Discontinued Medications */
    .discontinued-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .discontinued-item {
        padding: 0.5rem;
        background-color: var(--color-gray-100);
        border-radius: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .date-discontinued {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
    }
    
    .reason {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        font-style: italic;
    }
    
    /* Drug Interactions */
    .interactions-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .interaction-item {
        padding: 0.75rem;
        border-radius: 0.5rem;
        border-left: 4px solid;
    }
    
    .severity-mild {
        background-color: var(--color-info-light);
        border-left-color: var(--color-info);
    }
    
    .severity-moderate {
        background-color: var(--color-warning-light);
        border-left-color: var(--color-warning);
    }
    
    .severity-major, .severity-severe, .severity-critical {
        background-color: var(--color-danger-light);
        border-left-color: var(--color-danger);
    }
    
    .interaction-drugs {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-weight: 600;
    }
    
    .interaction-symbol {
        color: var(--color-warning-dark);
    }
    
    .interaction-details {
        display: flex;
        gap: 1rem;
        font-size: 0.9rem;
    }
    
    .severity {
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.8rem;
    }
    
    /* Allergies */
    .allergies-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .allergy-item {
        padding: 0.5rem;
        border-radius: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-left: 4px solid var(--color-danger);
        background-color: var(--color-danger-light);
    }
    
    .allergy-item .medication {
        font-weight: 600;
    }
    
    /* Adherence Assessment */
    .adherence-card {
        padding: 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
        border: 1px solid var(--color-gray-300);
    }
    
    .overall-adherence {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }
    
    .barriers, .interventions {
        margin-bottom: 0.75rem;
    }
    
    .barriers ul, .interventions ul {
        margin: 0.5rem 0 0 1.5rem;
        padding: 0;
    }
    
    .barriers li, .interventions li {
        margin-bottom: 0.25rem;
    }
    
    .no-data {
        text-align: center;
        color: var(--color-text-secondary);
        font-style: italic;
        padding: 2rem;
    }
</style>