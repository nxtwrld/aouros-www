<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
        key?: string;
    }

    let { data, document, key }: Props = $props();
    
    let hasAdmission = $derived(data && data.hasAdmission);
    
    let admissionDetails = $derived(data?.admissionDetails || {});
    let chiefComplaint = $derived(data?.chiefComplaint || '');
    let presentingSymptoms = $derived(data?.presentingSymptoms || []);
    let vitalSigns = $derived(data?.vitalSigns || {});
    let assessmentAndPlan = $derived(data?.assessmentAndPlan || {});
    let ordersSets = $derived(data?.ordersSets || []);
    let dischargePlan = $derived(data?.dischargePlan || {});
    let admittingPhysician = $derived(data?.admittingPhysician);
    let attendingPhysician = $derived(data?.attendingPhysician);
    let consultations = $derived(data?.consultations || []);
    let notes = $derived(data?.notes || '');
    
    function getAdmissionTypeClass(type: string): string {
        const typeClasses: Record<string, string> = {
            'emergency': 'admission-emergency',
            'elective': 'admission-elective',
            'urgent': 'admission-urgent',
            'observation': 'admission-observation',
            'transfer': 'admission-transfer',
            'direct': 'admission-direct'
        };
        return typeClasses[type] || 'admission-general';
    }
    
    function getAcuityClass(acuity: string): string {
        const acuityClasses: Record<string, string> = {
            'critical': 'acuity-critical',
            'high': 'acuity-high',
            'medium': 'acuity-medium',
            'low': 'acuity-low',
            'stable': 'acuity-stable'
        };
        return acuityClasses[acuity] || 'acuity-unknown';
    }
    
    function getSeverityClass(severity: string): string {
        const severityClasses: Record<string, string> = {
            'mild': 'severity-mild',
            'moderate': 'severity-moderate',
            'severe': 'severity-severe',
            'critical': 'severity-critical'
        };
        return severityClasses[severity] || 'severity-unknown';
    }
    
    function getStatusClass(status: string): string {
        const statusClasses: Record<string, string> = {
            'admitted': 'status-admitted',
            'pending': 'status-pending',
            'discharged': 'status-discharged',
            'transferred': 'status-transferred',
            'observation': 'status-observation'
        };
        return statusClasses[status] || 'status-unknown';
    }
    
    function getPriorityClass(priority: string): string {
        const priorityClasses: Record<string, string> = {
            'routine': 'priority-routine',
            'urgent': 'priority-urgent',
            'stat': 'priority-stat'
        };
        return priorityClasses[priority] || 'priority-routine';
    }
    
    function getVitalSignClass(vital: string, value: number): string {
        const vitalRanges: Record<string, { low: number, high: number }> = {
            'systolic': { low: 90, high: 140 },
            'diastolic': { low: 60, high: 90 },
            'heartRate': { low: 60, high: 100 },
            'temperature': { low: 36.1, high: 37.2 },
            'respiratoryRate': { low: 12, high: 20 },
            'oxygenSaturation': { low: 95, high: 100 }
        };
        
        const range = vitalRanges[vital];
        if (!range) return 'vital-normal';
        
        if (value < range.low) return 'vital-low';
        if (value > range.high) return 'vital-high';
        return 'vital-normal';
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
    
    function formatDateOnly(dateString: string): string {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch {
            return dateString;
        }
    }
</script>

{#if hasAdmission}
    <h3 class="h3 heading -sticky">{$t('report.admission')}</h3>
    
    <!-- Admission Details -->
    {#if Object.keys(admissionDetails).length > 0}
        <h4 class="section-title-sub">{$t('report.admission-details')}</h4>
        <div class="page -block">
            <div class="admission-header">
                {#if admissionDetails.admissionType}
                    <div class="admission-type {getAdmissionTypeClass(admissionDetails.admissionType)}">
                        {$t(`medical.enums.admission_types.${admissionDetails.admissionType}`)}
                    </div>
                {/if}
                
                {#if admissionDetails.acuity}
                    <div class="acuity-badge {getAcuityClass(admissionDetails.acuity)}">
                        {$t(`medical.enums.acuity_levels.${admissionDetails.acuity}`)}
                    </div>
                {/if}
                
                {#if admissionDetails.status}
                    <div class="status-badge {getStatusClass(admissionDetails.status)}">
                        {$t(`medical.enums.admission_status.${admissionDetails.status}`)}
                    </div>
                {/if}
            </div>
            
            <div class="admission-info">
                {#if admissionDetails.admissionDate}
                    <div class="detail-item">
                        <span class="label">{$t('report.admission-date')}:</span>
                        <span class="value">{formatDate(admissionDetails.admissionDate)}</span>
                    </div>
                {/if}
                
                {#if admissionDetails.admissionSource}
                    <div class="detail-item">
                        <span class="label">{$t('report.admission-source')}:</span>
                        <span class="value">{admissionDetails.admissionSource}</span>
                    </div>
                {/if}
                
                {#if admissionDetails.unit}
                    <div class="detail-item">
                        <span class="label">{$t('report.unit')}:</span>
                        <span class="value">{admissionDetails.unit}</span>
                    </div>
                {/if}
                
                {#if admissionDetails.room}
                    <div class="detail-item">
                        <span class="label">{$t('report.room')}:</span>
                        <span class="value">{admissionDetails.room}</span>
                    </div>
                {/if}
                
                {#if admissionDetails.bed}
                    <div class="detail-item">
                        <span class="label">{$t('report.bed')}:</span>
                        <span class="value">{admissionDetails.bed}</span>
                    </div>
                {/if}
                
                {#if admissionDetails.expectedLOS}
                    <div class="detail-item">
                        <span class="label">{$t('report.expected-los')}:</span>
                        <span class="value">{admissionDetails.expectedLOS}</span>
                    </div>
                {/if}
                
                {#if admissionDetails.insuranceStatus}
                    <div class="detail-item">
                        <span class="label">{$t('report.insurance-status')}:</span>
                        <span class="value">{admissionDetails.insuranceStatus}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Chief Complaint -->
    {#if chiefComplaint}
        <h4 class="section-title-sub">{$t('report.chief-complaint')}</h4>
        <div class="page -block">
            <div class="chief-complaint-content">
                <p class="complaint-text">{chiefComplaint}</p>
            </div>
        </div>
    {/if}
    
    <!-- Presenting Symptoms -->
    {#if presentingSymptoms.length > 0}
        <h4 class="section-title-sub">{$t('report.presenting-symptoms')}</h4>
        <ul class="list-items">
            {#each presentingSymptoms as symptom}
                <li class="panel {getSeverityClass(symptom.severity)}">
                    <div class="symptom-header">
                        <span class="symptom-name">{symptom.symptom}</span>
                        {#if symptom.severity}
                            <span class="severity-badge {getSeverityClass(symptom.severity)}">
                                {$t(`medical.enums.severity_levels.${symptom.severity}`)}
                            </span>
                        {/if}
                    </div>
                    
                    <div class="symptom-details">
                        {#if symptom.onset}
                            <div class="detail-item">
                                <span class="label">{$t('report.onset')}:</span>
                                <span class="value">{symptom.onset}</span>
                            </div>
                        {/if}
                        
                        {#if symptom.duration}
                            <div class="detail-item">
                                <span class="label">{$t('report.duration')}:</span>
                                <span class="value">{symptom.duration}</span>
                            </div>
                        {/if}
                        
                        {#if symptom.frequency}
                            <div class="detail-item">
                                <span class="label">{$t('report.frequency')}:</span>
                                <span class="value">{symptom.frequency}</span>
                            </div>
                        {/if}
                        
                        {#if symptom.quality}
                            <div class="detail-item">
                                <span class="label">{$t('report.quality')}:</span>
                                <span class="value">{symptom.quality}</span>
                            </div>
                        {/if}
                        
                        {#if symptom.location}
                            <div class="detail-item">
                                <span class="label">{$t('report.location')}:</span>
                                <span class="value">{symptom.location}</span>
                            </div>
                        {/if}
                        
                        {#if symptom.radiation}
                            <div class="detail-item">
                                <span class="label">{$t('report.radiation')}:</span>
                                <span class="value">{symptom.radiation}</span>
                            </div>
                        {/if}
                        
                        {#if symptom.alleviatingFactors}
                            <div class="detail-item">
                                <span class="label">{$t('report.alleviating-factors')}:</span>
                                <span class="value">{symptom.alleviatingFactors}</span>
                            </div>
                        {/if}
                        
                        {#if symptom.aggravatingFactors}
                            <div class="detail-item">
                                <span class="label">{$t('report.aggravating-factors')}:</span>
                                <span class="value">{symptom.aggravatingFactors}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Vital Signs -->
    {#if Object.keys(vitalSigns).length > 0}
        <h4 class="section-title-sub">{$t('report.vital-signs')}</h4>
        <div class="page -block">
            <div class="vitals-grid">
                {#if vitalSigns.bloodPressure}
                    <div class="vital-item">
                        <span class="vital-label">{$t('report.blood-pressure')}:</span>
                        <span class="vital-value">
                            <span class="{getVitalSignClass('systolic', vitalSigns.bloodPressure.systolic)}">{vitalSigns.bloodPressure.systolic}</span>
                            /
                            <span class="{getVitalSignClass('diastolic', vitalSigns.bloodPressure.diastolic)}">{vitalSigns.bloodPressure.diastolic}</span>
                            {$t('report.mmhg')}
                        </span>
                    </div>
                {/if}
                
                {#if vitalSigns.heartRate}
                    <div class="vital-item">
                        <span class="vital-label">{$t('report.heart-rate')}:</span>
                        <span class="vital-value {getVitalSignClass('heartRate', vitalSigns.heartRate)}">{vitalSigns.heartRate} {$t('report.bpm')}</span>
                    </div>
                {/if}
                
                {#if vitalSigns.temperature}
                    <div class="vital-item">
                        <span class="vital-label">{$t('report.temperature')}:</span>
                        <span class="vital-value {getVitalSignClass('temperature', vitalSigns.temperature)}">{vitalSigns.temperature}°C</span>
                    </div>
                {/if}
                
                {#if vitalSigns.respiratoryRate}
                    <div class="vital-item">
                        <span class="vital-label">{$t('report.respiratory-rate')}:</span>
                        <span class="vital-value {getVitalSignClass('respiratoryRate', vitalSigns.respiratoryRate)}">{vitalSigns.respiratoryRate} {$t('report.breaths-per-minute')}</span>
                    </div>
                {/if}
                
                {#if vitalSigns.oxygenSaturation}
                    <div class="vital-item">
                        <span class="vital-label">{$t('report.oxygen-saturation')}:</span>
                        <span class="vital-value {getVitalSignClass('oxygenSaturation', vitalSigns.oxygenSaturation)}">{vitalSigns.oxygenSaturation}%</span>
                    </div>
                {/if}
                
                {#if vitalSigns.pain}
                    <div class="vital-item">
                        <span class="vital-label">{$t('report.pain-score')}:</span>
                        <span class="vital-value pain-score">{vitalSigns.pain}/10</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Assessment and Plan -->
    {#if Object.keys(assessmentAndPlan).length > 0}
        <h4 class="section-title-sub">{$t('report.assessment-and-plan')}</h4>
        <div class="page -block">
            <div class="assessment-content">
                {#if assessmentAndPlan.assessment}
                    <div class="assessment-section">
                        <h5 class="assessment-title">{$t('report.assessment')}</h5>
                        <p class="assessment-text">{assessmentAndPlan.assessment}</p>
                    </div>
                {/if}
                
                {#if assessmentAndPlan.plan}
                    <div class="plan-section">
                        <h5 class="plan-title">{$t('report.plan')}</h5>
                        <p class="plan-text">{assessmentAndPlan.plan}</p>
                    </div>
                {/if}
                
                {#if assessmentAndPlan.goals?.length > 0}
                    <div class="goals-section">
                        <h5 class="goals-title">{$t('report.goals')}</h5>
                        <ul class="goals-list">
                            {#each assessmentAndPlan.goals as goal}
                                <li class="goal-item">{goal}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
                
                {#if assessmentAndPlan.expectedOutcome}
                    <div class="outcome-section">
                        <h5 class="outcome-title">{$t('report.expected-outcome')}</h5>
                        <p class="outcome-text">{assessmentAndPlan.expectedOutcome}</p>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Orders Sets -->
    {#if ordersSets.length > 0}
        <h4 class="section-title-sub">{$t('report.orders-sets')}</h4>
        <ul class="list-items">
            {#each ordersSets as orderSet}
                <li class="panel {getPriorityClass(orderSet.priority)}">
                    <div class="order-header">
                        <div class="order-main">
                            <h5 class="order-type">{orderSet.type}</h5>
                            <span class="order-description">{orderSet.description}</span>
                        </div>
                        
                        {#if orderSet.priority}
                            <span class="priority-badge {getPriorityClass(orderSet.priority)}">
                                {$t(`medical.enums.priority_levels.${orderSet.priority}`)}
                            </span>
                        {/if}
                    </div>
                    
                    <div class="order-details">
                        {#if orderSet.orderDate}
                            <div class="detail-item">
                                <span class="label">{$t('report.order-date')}:</span>
                                <span class="value">{formatDate(orderSet.orderDate)}</span>
                            </div>
                        {/if}
                        
                        {#if orderSet.frequency}
                            <div class="detail-item">
                                <span class="label">{$t('report.frequency')}:</span>
                                <span class="value">{orderSet.frequency}</span>
                            </div>
                        {/if}
                        
                        {#if orderSet.duration}
                            <div class="detail-item">
                                <span class="label">{$t('report.duration')}:</span>
                                <span class="value">{orderSet.duration}</span>
                            </div>
                        {/if}
                        
                        {#if orderSet.instructions}
                            <div class="detail-item">
                                <span class="label">{$t('report.instructions')}:</span>
                                <span class="value">{orderSet.instructions}</span>
                            </div>
                        {/if}
                        
                        {#if orderSet.orderedBy}
                            <div class="detail-item">
                                <span class="label">{$t('report.ordered-by')}:</span>
                                <span class="value">{orderSet.orderedBy}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Consultations -->
    {#if consultations.length > 0}
        <h4 class="section-title-sub">{$t('report.consultations')}</h4>
        <ul class="list-items">
            {#each consultations as consultation}
                <li class="panel consultation-item">
                    <div class="consultation-header">
                        <div class="consultation-main">
                            <h5 class="consultation-service">{consultation.service}</h5>
                            <span class="consultation-reason">{consultation.reason}</span>
                        </div>
                        
                        {#if consultation.urgency}
                            <span class="urgency-badge {getPriorityClass(consultation.urgency)}">
                                {$t(`medical.enums.urgency_levels.${consultation.urgency}`)}
                            </span>
                        {/if}
                    </div>
                    
                    <div class="consultation-details">
                        {#if consultation.requestDate}
                            <div class="detail-item">
                                <span class="label">{$t('report.request-date')}:</span>
                                <span class="value">{formatDate(consultation.requestDate)}</span>
                            </div>
                        {/if}
                        
                        {#if consultation.consultant}
                            <div class="detail-item">
                                <span class="label">{$t('report.consultant')}:</span>
                                <span class="value">{consultation.consultant}</span>
                            </div>
                        {/if}
                        
                        {#if consultation.expectedDate}
                            <div class="detail-item">
                                <span class="label">{$t('report.expected-date')}:</span>
                                <span class="value">{formatDateOnly(consultation.expectedDate)}</span>
                            </div>
                        {/if}
                        
                        {#if consultation.question}
                            <div class="detail-item">
                                <span class="label">{$t('report.question')}:</span>
                                <span class="value">{consultation.question}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Discharge Plan -->
    {#if Object.keys(dischargePlan).length > 0}
        <h4 class="section-title-sub">{$t('report.discharge-plan')}</h4>
        <div class="page -block">
            <div class="discharge-content">
                {#if dischargePlan.expectedDischargeDate}
                    <div class="detail-item">
                        <span class="label">{$t('report.expected-discharge-date')}:</span>
                        <span class="value">{formatDateOnly(dischargePlan.expectedDischargeDate)}</span>
                    </div>
                {/if}
                
                {#if dischargePlan.disposition}
                    <div class="detail-item">
                        <span class="label">{$t('report.disposition')}:</span>
                        <span class="value">{dischargePlan.disposition}</span>
                    </div>
                {/if}
                
                {#if dischargePlan.dischargeCriteria}
                    <div class="criteria-section">
                        <span class="label">{$t('report.discharge-criteria')}:</span>
                        <p class="criteria-text">{dischargePlan.dischargeCriteria}</p>
                    </div>
                {/if}
                
                {#if dischargePlan.followUpRequired}
                    <div class="followup-section">
                        <span class="label">{$t('report.follow-up-required')}:</span>
                        <p class="followup-text">{dischargePlan.followUpRequired}</p>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Physicians -->
    {#if admittingPhysician || attendingPhysician}
        <h4 class="section-title-sub">{$t('report.physicians')}</h4>
        <div class="page -block">
            <div class="physicians-info">
                {#if admittingPhysician}
                    <div class="physician-section">
                        <span class="label">{$t('report.admitting-physician')}:</span>
                        <div class="physician-details">
                            <span class="physician-name">{admittingPhysician.name}</span>
                            {#if admittingPhysician.title}
                                <span class="physician-title">{admittingPhysician.title}</span>
                            {/if}
                            {#if admittingPhysician.department}
                                <span class="physician-department">{admittingPhysician.department}</span>
                            {/if}
                        </div>
                    </div>
                {/if}
                
                {#if attendingPhysician}
                    <div class="physician-section">
                        <span class="label">{$t('report.attending-physician')}:</span>
                        <div class="physician-details">
                            <span class="physician-name">{attendingPhysician.name}</span>
                            {#if attendingPhysician.title}
                                <span class="physician-title">{attendingPhysician.title}</span>
                            {/if}
                            {#if attendingPhysician.department}
                                <span class="physician-department">{attendingPhysician.department}</span>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Additional Notes -->
    {#if notes}
        <h4 class="section-title-sub">{$t('report.additional-notes')}</h4>
        <div class="page -block">
            <div class="notes-content">
                <p class="notes-text">{notes}</p>
            </div>
        </div>
    {/if}
    
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.admission')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-admission-data')}</p>
    </div>
{/if}

<style>
    .admission-header {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }
    
    .admission-type {
        font-size: 1.2rem;
        font-weight: 600;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .admission-emergency {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .admission-elective {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .admission-urgent {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .admission-observation {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .admission-transfer {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
    }
    
    .admission-direct {
        background-color: var(--color-primary-light);
        color: var(--color-primary-dark);
    }
    
    .admission-general {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
    }
    
    .acuity-badge,
    .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .acuity-critical {
        background-color: var(--color-danger);
        color: white;
    }
    
    .acuity-high {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .acuity-medium {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .acuity-low {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .acuity-stable {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .status-admitted {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .status-pending {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .status-discharged {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .status-transferred {
        background-color: var(--color-secondary-light);
        color: var(--color-secondary-dark);
    }
    
    .status-observation {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .admission-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .chief-complaint-content {
        background-color: var(--color-background-secondary);
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid var(--color-primary);
    }
    
    .complaint-text {
        margin: 0;
        font-size: 1.1rem;
        line-height: 1.5;
        color: var(--color-text-primary);
        font-weight: 500;
    }
    
    .symptom-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .symptom-name {
        font-size: 1.1rem;
        font-weight: 600;
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
    
    .severity-critical {
        background-color: var(--color-danger);
        color: white;
    }
    
    .symptom-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .vitals-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }
    
    .vital-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
    }
    
    .vital-label {
        font-weight: 500;
        color: var(--color-text-secondary);
    }
    
    .vital-value {
        font-weight: 600;
        font-size: 1.1rem;
        color: var(--color-text-primary);
    }
    
    .vital-low {
        color: var(--color-info-dark);
    }
    
    .vital-high {
        color: var(--color-danger-dark);
    }
    
    .vital-normal {
        color: var(--color-success-dark);
    }
    
    .pain-score {
        color: var(--color-warning-dark);
        font-weight: 700;
    }
    
    .assessment-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .assessment-section,
    .plan-section,
    .goals-section,
    .outcome-section {
        background-color: var(--color-background-secondary);
        padding: 1rem;
        border-radius: 0.5rem;
    }
    
    .assessment-title,
    .plan-title,
    .goals-title,
    .outcome-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        color: var(--color-text-primary);
    }
    
    .assessment-text,
    .plan-text,
    .outcome-text {
        margin: 0;
        line-height: 1.5;
        color: var(--color-text-primary);
    }
    
    .goals-list {
        margin: 0;
        padding-left: 1.5rem;
    }
    
    .goal-item {
        margin-bottom: 0.5rem;
        color: var(--color-text-primary);
    }
    
    .order-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .order-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .order-type {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .order-description {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
    }
    
    .priority-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .priority-routine {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .priority-urgent {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .priority-stat {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .order-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .consultation-item {
        border-left-color: var(--color-secondary);
    }
    
    .consultation-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .consultation-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .consultation-service {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .consultation-reason {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
    }
    
    .urgency-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .consultation-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .discharge-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .criteria-section,
    .followup-section {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .criteria-text,
    .followup-text {
        margin: 0;
        color: var(--color-text-primary);
        line-height: 1.5;
    }
    
    .physicians-info {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .physician-section {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
    }
    
    .physician-details {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
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
    
    .notes-content {
        background-color: var(--color-background-secondary);
        padding: 1rem;
        border-radius: 0.5rem;
    }
    
    .notes-text {
        margin: 0;
        color: var(--color-text-secondary);
        line-height: 1.5;
        font-style: italic;
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
    
    .severity-critical {
        border-left-color: var(--color-danger);
        border-left-width: 4px;
    }
    
    /* Priority-based panel coloring */
    .priority-routine {
        border-left-color: var(--color-info);
    }
    
    .priority-urgent {
        border-left-color: var(--color-warning);
    }
    
    .priority-stat {
        border-left-color: var(--color-danger);
        border-left-width: 4px;
    }
</style>