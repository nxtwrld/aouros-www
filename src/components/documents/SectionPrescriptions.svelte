<script lang="ts">
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
        document?: any;
    }

    let { data, document }: Props = $props();
    
    // Extract prescription data
    let prescriptions = $derived(() => {
        if (!data) return [];
        
        if (data.prescriptions) return data.prescriptions;
        if (Array.isArray(data)) return data;
        return [];
    });
    
    let isPrescription = $derived(() => {
        return data?.isPrescription !== false && prescriptions.length > 0;
    });
    
    function formatSchedule(prescription: any) {
        const parts = [];
        
        if (prescription.times_per_day && prescription.times_per_day > 0) {
            parts.push(`${prescription.times_per_day}x daily`);
        }
        
        if (prescription.days && prescription.days > 0) {
            parts.push(`for ${prescription.days} days`);
        }
        
        if (prescription.time_of_day && prescription.time_of_day.length > 0) {
            const times = prescription.time_of_day.filter(t => t !== 'anytime');
            if (times.length > 0) {
                parts.push(`at ${times.join(', ')}`);
            }
        }
        
        if (prescription.days_of_week && prescription.days_of_week.length > 0 && prescription.days_of_week.length < 7) {
            parts.push(`on ${prescription.days_of_week.join(', ')}`);
        }
        
        return parts.length > 0 ? parts.join(' ') : 'As needed';
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
            'intramascular': 'IM',
            'subcutaneous': 'SubQ'
        };
        return routeMap[route] || route;
    }
</script>

{#if isPrescription}
    <h3 class="h3 heading -sticky">{$t('report.prescriptions')}</h3>
    
    <div class="page -block">
        <div class="prescriptions-list">
            {#each prescriptions as prescription, index}
                <div class="prescription-card">
                    <div class="prescription-header">
                        <h4 class="medication-name">{prescription.name}</h4>
                        <div class="prescription-meta">
                            <span class="dosage">{prescription.dosage}</span>
                            <span class="form">{prescription.form}</span>
                            <span class="route">{getRouteDisplay(prescription.route)}</span>
                        </div>
                    </div>
                    
                    <div class="prescription-schedule">
                        <strong>{$t('report.schedule')}:</strong>
                        <span>{formatSchedule(prescription)}</span>
                    </div>
                    
                    {#if prescription.notes}
                        <div class="prescription-notes">
                            <strong>{$t('report.notes')}:</strong>
                            <p>{prescription.notes}</p>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{:else if data}
    <h3 class="h3 heading -sticky">{$t('report.prescriptions')}</h3>
    <div class="page -block">
        <p class="no-data">{$t('report.no-prescription-data')}</p>
    </div>
{/if}

<style>
    .heading {
        margin-bottom: 0;
    }
    
    .prescriptions-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .prescription-card {
        padding: 1rem;
        border: 1px solid var(--color-gray-300);
        border-radius: 0.5rem;
        background-color: var(--color-background);
        border-left: 4px solid var(--color-primary);
    }
    
    .prescription-header {
        margin-bottom: 0.75rem;
    }
    
    .medication-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        color: var(--color-text-primary);
    }
    
    .prescription-meta {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        font-size: 0.9rem;
        color: var(--color-text-secondary);
    }
    
    .prescription-meta span {
        padding: 0.25rem 0.5rem;
        background-color: var(--color-background-secondary);
        border-radius: 0.25rem;
        border: 1px solid var(--color-gray-200);
    }
    
    .dosage {
        background-color: var(--color-success-light) !important;
        color: var(--color-success-dark);
        border-color: var(--color-success) !important;
    }
    
    .prescription-schedule {
        margin-bottom: 0.5rem;
        font-size: 0.95rem;
    }
    
    .prescription-schedule strong {
        color: var(--color-text-primary);
    }
    
    .prescription-notes {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
    }
    
    .prescription-notes strong {
        color: var(--color-text-primary);
    }
    
    .prescription-notes p {
        margin: 0.25rem 0 0 0;
        line-height: 1.4;
    }
    
    .no-data {
        text-align: center;
        color: var(--color-text-secondary);
        font-style: italic;
        padding: 2rem;
    }
</style>