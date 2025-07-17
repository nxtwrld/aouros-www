<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
        key?: string;
    }

    let { data, document, key }: Props = $props();
    
    let hasSocialHistory = $derived(data && data.hasSocialHistory);
    
    let smokingHistory = $derived(data?.smokingHistory || {});
    let alcoholHistory = $derived(data?.alcoholHistory || {});
    let substanceUse = $derived(data?.substanceUse || []);
    let occupation = $derived(data?.occupation || {});
    let livingConditions = $derived(data?.livingConditions || {});
    let supportSystem = $derived(data?.supportSystem || {});
    let lifestyle = $derived(data?.lifestyle || {});
    let environmentalExposures = $derived(data?.environmentalExposures || []);
    let travelHistory = $derived(data?.travelHistory || []);
    let socialDeterminants = $derived(data?.socialDeterminants || {});
    let riskFactors = $derived(data?.riskFactors || []);
    
    function getRiskClass(risk: string): string {
        const riskClasses: Record<string, string> = {
            'low': 'risk-low',
            'moderate': 'risk-moderate',
            'high': 'risk-high',
            'very_high': 'risk-very-high'
        };
        return riskClasses[risk] || 'risk-unknown';
    }
    
    function getStatusClass(status: string): string {
        const statusClasses: Record<string, string> = {
            'never': 'status-never',
            'current': 'status-current',
            'former': 'status-former',
            'occasional': 'status-occasional',
            'active': 'status-active',
            'inactive': 'status-inactive',
            'quit': 'status-quit'
        };
        return statusClasses[status] || 'status-unknown';
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
    
    function getFrequencyClass(frequency: string): string {
        const frequencyClasses: Record<string, string> = {
            'daily': 'frequency-daily',
            'weekly': 'frequency-weekly',
            'monthly': 'frequency-monthly',
            'occasionally': 'frequency-occasionally',
            'rarely': 'frequency-rarely'
        };
        return frequencyClasses[frequency] || 'frequency-unknown';
    }
    
    function getEducationClass(level: string): string {
        const educationClasses: Record<string, string> = {
            'elementary': 'education-elementary',
            'high_school': 'education-high-school',
            'college': 'education-college',
            'graduate': 'education-graduate',
            'professional': 'education-professional'
        };
        return educationClasses[level] || 'education-unknown';
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
    
    function formatDuration(duration: any): string {
        if (!duration) return '';
        if (typeof duration === 'string') return duration;
        if (duration.value && duration.unit) {
            return `${duration.value} ${duration.unit}`;
        }
        return '';
    }
    
    function formatIncome(income: any): string {
        if (!income) return '';
        if (typeof income === 'string') return income;
        if (income.amount && income.currency) {
            return `${income.amount} ${income.currency}`;
        }
        return income.toString();
    }
</script>

{#if hasSocialHistory}
    <h3 class="h3 heading -sticky">{$t('report.social-history')}</h3>
    
    <!-- Smoking History -->
    {#if Object.keys(smokingHistory).length > 0}
        <h4 class="section-title-sub">{$t('report.smoking-history')}</h4>
        <div class="page -block">
            <div class="smoking-history-info">
                {#if smokingHistory.status}
                    <div class="status-overview">
                        <span class="label">{$t('report.smoking-status')}:</span>
                        <span class="status-value {getStatusClass(smokingHistory.status)}">
                            {$t(`medical.enums.smoking_status.${smokingHistory.status}`)}
                        </span>
                    </div>
                {/if}
                
                {#if smokingHistory.packYears}
                    <div class="detail-item">
                        <span class="label">{$t('report.pack-years')}:</span>
                        <span class="value pack-years">{smokingHistory.packYears}</span>
                    </div>
                {/if}
                
                {#if smokingHistory.cigarettesPerDay}
                    <div class="detail-item">
                        <span class="label">{$t('report.cigarettes-per-day')}:</span>
                        <span class="value">{smokingHistory.cigarettesPerDay}</span>
                    </div>
                {/if}
                
                {#if smokingHistory.startAge}
                    <div class="detail-item">
                        <span class="label">{$t('report.start-age')}:</span>
                        <span class="value">{smokingHistory.startAge}</span>
                    </div>
                {/if}
                
                {#if smokingHistory.quitDate}
                    <div class="detail-item">
                        <span class="label">{$t('report.quit-date')}:</span>
                        <span class="value">{formatDate(smokingHistory.quitDate)}</span>
                    </div>
                {/if}
                
                {#if smokingHistory.quitAttempts}
                    <div class="detail-item">
                        <span class="label">{$t('report.quit-attempts')}:</span>
                        <span class="value">{smokingHistory.quitAttempts}</span>
                    </div>
                {/if}
                
                {#if smokingHistory.tobaccoType}
                    <div class="detail-item">
                        <span class="label">{$t('report.tobacco-type')}:</span>
                        <span class="value">{smokingHistory.tobaccoType}</span>
                    </div>
                {/if}
                
                {#if smokingHistory.secondhandExposure}
                    <div class="detail-item">
                        <span class="label">{$t('report.secondhand-exposure')}:</span>
                        <span class="value">{smokingHistory.secondhandExposure ? $t('report.yes') : $t('report.no')}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Alcohol History -->
    {#if Object.keys(alcoholHistory).length > 0}
        <h4 class="section-title-sub">{$t('report.alcohol-history')}</h4>
        <div class="page -block">
            <div class="alcohol-history-info">
                {#if alcoholHistory.status}
                    <div class="status-overview">
                        <span class="label">{$t('report.alcohol-status')}:</span>
                        <span class="status-value {getStatusClass(alcoholHistory.status)}">
                            {$t(`medical.enums.alcohol_status.${alcoholHistory.status}`)}
                        </span>
                    </div>
                {/if}
                
                {#if alcoholHistory.drinksPerWeek}
                    <div class="detail-item">
                        <span class="label">{$t('report.drinks-per-week')}:</span>
                        <span class="value drinks-amount">{alcoholHistory.drinksPerWeek}</span>
                    </div>
                {/if}
                
                {#if alcoholHistory.bingeDrinking}
                    <div class="detail-item">
                        <span class="label">{$t('report.binge-drinking')}:</span>
                        <span class="value">{alcoholHistory.bingeDrinking ? $t('report.yes') : $t('report.no')}</span>
                    </div>
                {/if}
                
                {#if alcoholHistory.preferredBeverage}
                    <div class="detail-item">
                        <span class="label">{$t('report.preferred-beverage')}:</span>
                        <span class="value">{alcoholHistory.preferredBeverage}</span>
                    </div>
                {/if}
                
                {#if alcoholHistory.startAge}
                    <div class="detail-item">
                        <span class="label">{$t('report.start-age')}:</span>
                        <span class="value">{alcoholHistory.startAge}</span>
                    </div>
                {/if}
                
                {#if alcoholHistory.duration}
                    <div class="detail-item">
                        <span class="label">{$t('report.duration')}:</span>
                        <span class="value">{formatDuration(alcoholHistory.duration)}</span>
                    </div>
                {/if}
                
                {#if alcoholHistory.auditScore}
                    <div class="detail-item">
                        <span class="label">{$t('report.audit-score')}:</span>
                        <span class="value audit-score">{alcoholHistory.auditScore}</span>
                    </div>
                {/if}
                
                {#if alcoholHistory.problemsRelated?.length > 0}
                    <div class="problems-section">
                        <span class="label">{$t('report.problems-related')}:</span>
                        <ul class="problems-list">
                            {#each alcoholHistory.problemsRelated as problem}
                                <li>{problem}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Substance Use -->
    {#if substanceUse.length > 0}
        <h4 class="section-title-sub">{$t('report.substance-use')}</h4>
        <ul class="list-items">
            {#each substanceUse as substance}
                <li class="panel substance-item {getRiskClass(substance.risk)}">
                    <div class="substance-header">
                        <div class="substance-main">
                            <h5 class="substance-name">{substance.name}</h5>
                            <span class="substance-type">{$t(`medical.enums.substance_types.${substance.type}`)}</span>
                        </div>
                        
                        <div class="substance-badges">
                            {#if substance.status}
                                <span class="status-badge {getStatusClass(substance.status)}">
                                    {$t(`medical.enums.substance_status.${substance.status}`)}
                                </span>
                            {/if}
                            {#if substance.risk}
                                <span class="risk-badge {getRiskClass(substance.risk)}">
                                    {$t(`medical.enums.risk_levels.${substance.risk}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="substance-details">
                        {#if substance.frequency}
                            <div class="detail-item">
                                <span class="label">{$t('report.frequency')}:</span>
                                <span class="value {getFrequencyClass(substance.frequency)}">
                                    {$t(`medical.enums.frequency_levels.${substance.frequency}`)}
                                </span>
                            </div>
                        {/if}
                        
                        {#if substance.amount}
                            <div class="detail-item">
                                <span class="label">{$t('report.amount')}:</span>
                                <span class="value">{substance.amount}</span>
                            </div>
                        {/if}
                        
                        {#if substance.method}
                            <div class="detail-item">
                                <span class="label">{$t('report.method')}:</span>
                                <span class="value">{substance.method}</span>
                            </div>
                        {/if}
                        
                        {#if substance.duration}
                            <div class="detail-item">
                                <span class="label">{$t('report.duration')}:</span>
                                <span class="value">{formatDuration(substance.duration)}</span>
                            </div>
                        {/if}
                        
                        {#if substance.lastUse}
                            <div class="detail-item">
                                <span class="label">{$t('report.last-use')}:</span>
                                <span class="value">{formatDate(substance.lastUse)}</span>
                            </div>
                        {/if}
                        
                        {#if substance.treatmentHistory}
                            <div class="detail-item">
                                <span class="label">{$t('report.treatment-history')}:</span>
                                <span class="value">{substance.treatmentHistory}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Occupation -->
    {#if Object.keys(occupation).length > 0}
        <h4 class="section-title-sub">{$t('report.occupation')}</h4>
        <div class="page -block">
            <div class="occupation-info">
                {#if occupation.current}
                    <div class="detail-item">
                        <span class="label">{$t('report.current-occupation')}:</span>
                        <span class="value">{occupation.current}</span>
                    </div>
                {/if}
                
                {#if occupation.employer}
                    <div class="detail-item">
                        <span class="label">{$t('report.employer')}:</span>
                        <span class="value">{occupation.employer}</span>
                    </div>
                {/if}
                
                {#if occupation.duration}
                    <div class="detail-item">
                        <span class="label">{$t('report.duration')}:</span>
                        <span class="value">{formatDuration(occupation.duration)}</span>
                    </div>
                {/if}
                
                {#if occupation.previousJobs?.length > 0}
                    <div class="previous-jobs-section">
                        <span class="label">{$t('report.previous-jobs')}:</span>
                        <div class="previous-jobs-list">
                            {#each occupation.previousJobs as job}
                                <div class="job-item">
                                    <span class="job-title">{job.title}</span>
                                    <span class="job-duration">{formatDuration(job.duration)}</span>
                                    {#if job.hazards}
                                        <span class="job-hazards">{job.hazards}</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if occupation.workHazards?.length > 0}
                    <div class="work-hazards-section">
                        <span class="label">{$t('report.work-hazards')}:</span>
                        <div class="work-hazards-list">
                            {#each occupation.workHazards as hazard}
                                <span class="hazard-tag">{hazard}</span>
                            {/each}
                        </div>
                    </div>
                {/if}
                
                {#if occupation.retirementStatus}
                    <div class="detail-item">
                        <span class="label">{$t('report.retirement-status')}:</span>
                        <span class="value">{occupation.retirementStatus}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Living Conditions -->
    {#if Object.keys(livingConditions).length > 0}
        <h4 class="section-title-sub">{$t('report.living-conditions')}</h4>
        <div class="page -block">
            <div class="living-conditions-info">
                {#if livingConditions.type}
                    <div class="detail-item">
                        <span class="label">{$t('report.housing-type')}:</span>
                        <span class="value">{$t(`medical.enums.housing_types.${livingConditions.type}`)}</span>
                    </div>
                {/if}
                
                {#if livingConditions.ownership}
                    <div class="detail-item">
                        <span class="label">{$t('report.ownership')}:</span>
                        <span class="value">{$t(`medical.enums.ownership_types.${livingConditions.ownership}`)}</span>
                    </div>
                {/if}
                
                {#if livingConditions.householdSize}
                    <div class="detail-item">
                        <span class="label">{$t('report.household-size')}:</span>
                        <span class="value">{livingConditions.householdSize}</span>
                    </div>
                {/if}
                
                {#if livingConditions.livingAlone}
                    <div class="detail-item">
                        <span class="label">{$t('report.living-alone')}:</span>
                        <span class="value">{livingConditions.livingAlone ? $t('report.yes') : $t('report.no')}</span>
                    </div>
                {/if}
                
                {#if livingConditions.pets}
                    <div class="detail-item">
                        <span class="label">{$t('report.pets')}:</span>
                        <span class="value">{livingConditions.pets}</span>
                    </div>
                {/if}
                
                {#if livingConditions.heatingType}
                    <div class="detail-item">
                        <span class="label">{$t('report.heating-type')}:</span>
                        <span class="value">{livingConditions.heatingType}</span>
                    </div>
                {/if}
                
                {#if livingConditions.accessibility}
                    <div class="detail-item">
                        <span class="label">{$t('report.accessibility')}:</span>
                        <span class="value">{livingConditions.accessibility}</span>
                    </div>
                {/if}
                
                {#if livingConditions.neighborhoodSafety}
                    <div class="detail-item">
                        <span class="label">{$t('report.neighborhood-safety')}:</span>
                        <span class="value">{$t(`medical.enums.safety_levels.${livingConditions.neighborhoodSafety}`)}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Support System -->
    {#if Object.keys(supportSystem).length > 0}
        <h4 class="section-title-sub">{$t('report.support-system')}</h4>
        <div class="page -block">
            <div class="support-system-info">
                {#if supportSystem.familySupport}
                    <div class="detail-item">
                        <span class="label">{$t('report.family-support')}:</span>
                        <span class="value">{$t(`medical.enums.support_levels.${supportSystem.familySupport}`)}</span>
                    </div>
                {/if}
                
                {#if supportSystem.friendsSupport}
                    <div class="detail-item">
                        <span class="label">{$t('report.friends-support')}:</span>
                        <span class="value">{$t(`medical.enums.support_levels.${supportSystem.friendsSupport}`)}</span>
                    </div>
                {/if}
                
                {#if supportSystem.emergencyContact}
                    <div class="detail-item">
                        <span class="label">{$t('report.emergency-contact')}:</span>
                        <span class="value">{supportSystem.emergencyContact}</span>
                    </div>
                {/if}
                
                {#if supportSystem.caregiver}
                    <div class="detail-item">
                        <span class="label">{$t('report.caregiver')}:</span>
                        <span class="value">{supportSystem.caregiver}</span>
                    </div>
                {/if}
                
                {#if supportSystem.communityResources?.length > 0}
                    <div class="community-resources-section">
                        <span class="label">{$t('report.community-resources')}:</span>
                        <ul class="community-resources-list">
                            {#each supportSystem.communityResources as resource}
                                <li>{resource}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
                
                {#if supportSystem.religiousAffiliation}
                    <div class="detail-item">
                        <span class="label">{$t('report.religious-affiliation')}:</span>
                        <span class="value">{supportSystem.religiousAffiliation}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Lifestyle -->
    {#if Object.keys(lifestyle).length > 0}
        <h4 class="section-title-sub">{$t('report.lifestyle')}</h4>
        <div class="page -block">
            <div class="lifestyle-info">
                {#if lifestyle.exercise}
                    <div class="detail-item">
                        <span class="label">{$t('report.exercise')}:</span>
                        <span class="value">{lifestyle.exercise}</span>
                    </div>
                {/if}
                
                {#if lifestyle.diet}
                    <div class="detail-item">
                        <span class="label">{$t('report.diet')}:</span>
                        <span class="value">{lifestyle.diet}</span>
                    </div>
                {/if}
                
                {#if lifestyle.sleep}
                    <div class="detail-item">
                        <span class="label">{$t('report.sleep')}:</span>
                        <span class="value">{lifestyle.sleep}</span>
                    </div>
                {/if}
                
                {#if lifestyle.stressLevel}
                    <div class="detail-item">
                        <span class="label">{$t('report.stress-level')}:</span>
                        <span class="value">{$t(`medical.enums.stress_levels.${lifestyle.stressLevel}`)}</span>
                    </div>
                {/if}
                
                {#if lifestyle.hobbies}
                    <div class="detail-item">
                        <span class="label">{$t('report.hobbies')}:</span>
                        <span class="value">{lifestyle.hobbies}</span>
                    </div>
                {/if}
                
                {#if lifestyle.screenTime}
                    <div class="detail-item">
                        <span class="label">{$t('report.screen-time')}:</span>
                        <span class="value">{lifestyle.screenTime}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Environmental Exposures -->
    {#if environmentalExposures.length > 0}
        <h4 class="section-title-sub">{$t('report.environmental-exposures')}</h4>
        <ul class="list-items">
            {#each environmentalExposures as exposure}
                <li class="panel exposure-item {getRiskClass(exposure.risk)}">
                    <div class="exposure-header">
                        <div class="exposure-main">
                            <h5 class="exposure-name">{exposure.name}</h5>
                            <span class="exposure-type">{$t(`medical.enums.exposure_types.${exposure.type}`)}</span>
                        </div>
                        
                        <div class="exposure-badges">
                            {#if exposure.risk}
                                <span class="risk-badge {getRiskClass(exposure.risk)}">
                                    {$t(`medical.enums.risk_levels.${exposure.risk}`)}
                                </span>
                            {/if}
                            {#if exposure.duration}
                                <span class="duration-badge">{formatDuration(exposure.duration)}</span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="exposure-details">
                        <p class="exposure-description">{exposure.description}</p>
                        
                        {#if exposure.source}
                            <div class="detail-item">
                                <span class="label">{$t('report.source')}:</span>
                                <span class="value">{exposure.source}</span>
                            </div>
                        {/if}
                        
                        {#if exposure.protectiveEquipment}
                            <div class="detail-item">
                                <span class="label">{$t('report.protective-equipment')}:</span>
                                <span class="value">{exposure.protectiveEquipment}</span>
                            </div>
                        {/if}
                        
                        {#if exposure.healthEffects}
                            <div class="detail-item">
                                <span class="label">{$t('report.health-effects')}:</span>
                                <span class="value">{exposure.healthEffects}</span>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Travel History -->
    {#if travelHistory.length > 0}
        <h4 class="section-title-sub">{$t('report.travel-history')}</h4>
        <ul class="list-items">
            {#each travelHistory as travel}
                <li class="panel travel-item">
                    <div class="travel-header">
                        <div class="travel-main">
                            <h5 class="travel-destination">{travel.destination}</h5>
                            <span class="travel-dates">{formatDate(travel.startDate)} - {formatDate(travel.endDate)}</span>
                        </div>
                        
                        <div class="travel-badges">
                            {#if travel.risk}
                                <span class="risk-badge {getRiskClass(travel.risk)}">
                                    {$t(`medical.enums.risk_levels.${travel.risk}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="travel-details">
                        {#if travel.purpose}
                            <div class="detail-item">
                                <span class="label">{$t('report.purpose')}:</span>
                                <span class="value">{travel.purpose}</span>
                            </div>
                        {/if}
                        
                        {#if travel.accommodations}
                            <div class="detail-item">
                                <span class="label">{$t('report.accommodations')}:</span>
                                <span class="value">{travel.accommodations}</span>
                            </div>
                        {/if}
                        
                        {#if travel.vaccinations?.length > 0}
                            <div class="vaccinations-section">
                                <span class="label">{$t('report.vaccinations')}:</span>
                                <div class="vaccinations-list">
                                    {#each travel.vaccinations as vaccination}
                                        <span class="vaccination-tag">{vaccination}</span>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                        
                        {#if travel.illnesses?.length > 0}
                            <div class="illnesses-section">
                                <span class="label">{$t('report.illnesses')}:</span>
                                <ul class="illnesses-list">
                                    {#each travel.illnesses as illness}
                                        <li>{illness}</li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
    <!-- Social Determinants -->
    {#if Object.keys(socialDeterminants).length > 0}
        <h4 class="section-title-sub">{$t('report.social-determinants')}</h4>
        <div class="page -block">
            <div class="social-determinants-info">
                {#if socialDeterminants.education}
                    <div class="detail-item">
                        <span class="label">{$t('report.education')}:</span>
                        <span class="value {getEducationClass(socialDeterminants.education)}">
                            {$t(`medical.enums.education_levels.${socialDeterminants.education}`)}
                        </span>
                    </div>
                {/if}
                
                {#if socialDeterminants.income}
                    <div class="detail-item">
                        <span class="label">{$t('report.income')}:</span>
                        <span class="value">{formatIncome(socialDeterminants.income)}</span>
                    </div>
                {/if}
                
                {#if socialDeterminants.insurance}
                    <div class="detail-item">
                        <span class="label">{$t('report.insurance')}:</span>
                        <span class="value">{socialDeterminants.insurance}</span>
                    </div>
                {/if}
                
                {#if socialDeterminants.transportation}
                    <div class="detail-item">
                        <span class="label">{$t('report.transportation')}:</span>
                        <span class="value">{socialDeterminants.transportation}</span>
                    </div>
                {/if}
                
                {#if socialDeterminants.foodSecurity}
                    <div class="detail-item">
                        <span class="label">{$t('report.food-security')}:</span>
                        <span class="value">{$t(`medical.enums.security_levels.${socialDeterminants.foodSecurity}`)}</span>
                    </div>
                {/if}
                
                {#if socialDeterminants.housingSecurity}
                    <div class="detail-item">
                        <span class="label">{$t('report.housing-security')}:</span>
                        <span class="value">{$t(`medical.enums.security_levels.${socialDeterminants.housingSecurity}`)}</span>
                    </div>
                {/if}
                
                {#if socialDeterminants.language}
                    <div class="detail-item">
                        <span class="label">{$t('report.primary-language')}:</span>
                        <span class="value">{socialDeterminants.language}</span>
                    </div>
                {/if}
                
                {#if socialDeterminants.interpreterNeeded}
                    <div class="detail-item">
                        <span class="label">{$t('report.interpreter-needed')}:</span>
                        <span class="value">{socialDeterminants.interpreterNeeded ? $t('report.yes') : $t('report.no')}</span>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
    
    <!-- Risk Factors -->
    {#if riskFactors.length > 0}
        <h4 class="section-title-sub">{$t('report.risk-factors')}</h4>
        <ul class="list-items">
            {#each riskFactors as riskFactor}
                <li class="panel risk-factor-item {getRiskClass(riskFactor.level)}">
                    <div class="risk-factor-header">
                        <div class="risk-factor-main">
                            <h5 class="risk-factor-name">{riskFactor.name}</h5>
                            <span class="risk-factor-category">{$t(`medical.enums.risk_categories.${riskFactor.category}`)}</span>
                        </div>
                        
                        <div class="risk-factor-badges">
                            {#if riskFactor.level}
                                <span class="risk-badge {getRiskClass(riskFactor.level)}">
                                    {$t(`medical.enums.risk_levels.${riskFactor.level}`)}
                                </span>
                            {/if}
                        </div>
                    </div>
                    
                    <div class="risk-factor-details">
                        <p class="risk-factor-description">{riskFactor.description}</p>
                        
                        {#if riskFactor.modifiable}
                            <div class="detail-item">
                                <span class="label">{$t('report.modifiable')}:</span>
                                <span class="value">{riskFactor.modifiable ? $t('report.yes') : $t('report.no')}</span>
                            </div>
                        {/if}
                        
                        {#if riskFactor.interventions?.length > 0}
                            <div class="interventions-section">
                                <span class="label">{$t('report.interventions')}:</span>
                                <ul class="interventions-list">
                                    {#each riskFactor.interventions as intervention}
                                        <li>{intervention}</li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
    
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.social-history')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-social-history-data')}</p>
    </div>
{/if}

<style>
    .smoking-history-info,
    .alcohol-history-info,
    .occupation-info,
    .living-conditions-info,
    .support-system-info,
    .lifestyle-info,
    .social-determinants-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .status-overview {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0.5rem 1rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.5rem;
    }
    
    .status-value {
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        text-transform: uppercase;
        font-size: 0.9rem;
    }
    
    .pack-years {
        font-weight: 600;
        color: var(--color-danger-dark);
    }
    
    .drinks-amount {
        font-weight: 600;
        color: var(--color-warning-dark);
    }
    
    .audit-score {
        font-weight: 600;
        color: var(--color-primary);
    }
    
    .problems-section,
    .previous-jobs-section,
    .work-hazards-section,
    .community-resources-section,
    .vaccinations-section,
    .illnesses-section,
    .interventions-section {
        margin-top: 0.75rem;
    }
    
    .problems-list,
    .community-resources-list,
    .illnesses-list,
    .interventions-list {
        margin: 0.5rem 0 0 1.5rem;
        padding: 0;
    }
    
    .problems-list li,
    .community-resources-list li,
    .illnesses-list li,
    .interventions-list li {
        margin-bottom: 0.25rem;
        color: var(--color-text-secondary);
    }
    
    .previous-jobs-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    
    .job-item {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        padding: 0.5rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
        flex-wrap: wrap;
    }
    
    .job-title {
        font-weight: 600;
        color: var(--color-text-primary);
        flex: 1;
    }
    
    .job-duration {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
    }
    
    .job-hazards {
        color: var(--color-danger-dark);
        font-size: 0.9rem;
        font-weight: 500;
    }
    
    .work-hazards-list,
    .vaccinations-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-top: 0.5rem;
    }
    
    .hazard-tag,
    .vaccination-tag {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .vaccination-tag {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .substance-item {
        border-left-color: var(--color-warning);
    }
    
    .substance-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .substance-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .substance-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .substance-type {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .substance-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .substance-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .exposure-item {
        border-left-color: var(--color-danger);
    }
    
    .exposure-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .exposure-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .exposure-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .exposure-type {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .exposure-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .exposure-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .exposure-description {
        margin: 0 0 0.5rem 0;
        color: var(--color-text-primary);
        line-height: 1.5;
    }
    
    .travel-item {
        border-left-color: var(--color-secondary);
    }
    
    .travel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .travel-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .travel-destination {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .travel-dates {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .travel-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .travel-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .risk-factor-item {
        border-left-color: var(--color-info);
    }
    
    .risk-factor-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        gap: 1rem;
    }
    
    .risk-factor-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    
    .risk-factor-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-primary);
    }
    
    .risk-factor-category {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
    }
    
    .risk-factor-badges {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
    }
    
    .risk-factor-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .risk-factor-description {
        margin: 0 0 0.5rem 0;
        color: var(--color-text-primary);
        line-height: 1.5;
    }
    
    .status-badge,
    .risk-badge,
    .duration-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
    }
    
    .status-never {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .status-current {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .status-former {
        background-color: var(--color-warning-light);
        color: var(--color-warning-dark);
    }
    
    .status-occasional {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
    }
    
    .status-active {
        background-color: var(--color-danger-light);
        color: var(--color-danger-dark);
    }
    
    .status-inactive {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
    }
    
    .status-quit {
        background-color: var(--color-success-light);
        color: var(--color-success-dark);
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
    
    .frequency-daily {
        color: var(--color-danger-dark);
        font-weight: 600;
    }
    
    .frequency-weekly {
        color: var(--color-warning-dark);
        font-weight: 600;
    }
    
    .frequency-monthly {
        color: var(--color-info-dark);
        font-weight: 600;
    }
    
    .frequency-occasionally {
        color: var(--color-text-secondary);
    }
    
    .frequency-rarely {
        color: var(--color-text-secondary);
    }
    
    .education-elementary {
        color: var(--color-text-secondary);
    }
    
    .education-high-school {
        color: var(--color-text-primary);
    }
    
    .education-college {
        color: var(--color-success-dark);
    }
    
    .education-graduate {
        color: var(--color-success-dark);
        font-weight: 600;
    }
    
    .education-professional {
        color: var(--color-primary);
        font-weight: 600;
    }
    
    .duration-badge {
        background-color: var(--color-info-light);
        color: var(--color-info-dark);
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
    
    /* Panel coloring based on risk levels */
    .risk-low {
        border-left-color: var(--color-success);
    }
    
    .risk-moderate {
        border-left-color: var(--color-warning);
    }
    
    .risk-high {
        border-left-color: var(--color-danger);
    }
    
    .risk-very-high {
        border-left-color: var(--color-danger);
        border-left-width: 4px;
    }
</style>