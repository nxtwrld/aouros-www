<script lang="ts">
    import SessionMoeVisualizer from '$components/session/SessionMoeVisualizer.svelte';
    import type { Document } from '$lib/documents/types.d';
    import { t } from '$lib/i18n';
    import { date, time } from '$lib/datetime';
    
    interface Props {
        data: any; // Session analysis data
        document: Document;
        key?: string;
    }
    
    let { data, document, key }: Props = $props();
    
    // Extract session analysis and metadata from new structure
    let sessionContainer = $derived(data || document?.content?.sessionAnalysis);
    let sessionAnalysis = $derived(sessionContainer?.analysis);
    let transcript = $derived(sessionContainer?.transcript || []);
    let metadata = $derived(document?.metadata || {});
    
    /*
    let duration = $derived(() => {
        const seconds = metadata.duration || 0;
        const minutes = Math.floor(seconds / 60000); // Convert from milliseconds
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${minutes}m`;
    });*/
    
    // Check if we have valid session data
    let hasSessionData = $derived(!!sessionAnalysis?.nodes);
</script>

<h3 class="h3 heading -sticky">{$t('documents.session.title')} - {date(metadata.sessionDate)} - {time(metadata.sessionDate)}</h3>

<div class="section-session">
    <!--div class="session-header">
        <h2 class="session-title">{$t('documents.session.title')}</h2>
        
        {#if sessionDate()}
            <div class="session-meta">
                <div class="meta-item">
                    <span class="meta-label">{$t('documents.session.date')}:</span>
                    <span class="meta-value">{sessionDate().date}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">{$t('documents.session.time')}:</span>
                    <span class="meta-value">{sessionDate().time}</span>
                </div>
                {#if metadata.duration}
                    <div class="meta-item">
                        <span class="meta-label">{$t('documents.session.duration')}:</span>
                        <span class="meta-value">{duration()}</span>
                    </div>
                {/if}
                {#if metadata.performerName}
                    <div class="meta-item">
                        <span class="meta-label">{$t('documents.session.performer')}:</span>
                        <span class="meta-value">{metadata.performerName}</span>
                    </div>
                {/if}
                {#if metadata.analysisVersion}
                    <div class="meta-item">
                        <span class="meta-label">{$t('documents.session.version')}:</span>
                        <span class="meta-value">v{metadata.analysisVersion}</span>
                    </div>
                {/if}
            </div>
        {/if}
    </div-->
    
    {#if hasSessionData}
        <div class="session-visualization">
            <SessionMoeVisualizer 
                sessionData={sessionAnalysis}
                isRealTime={false}
                showLegend={true}
                enableInteractions={false}
                transcript={transcript}
            />
        </div>
    {:else}
        <div class="no-session-data">
            <p>{$t('documents.session.noData')}</p>
        </div>
    {/if}
</div>

<style>
    .section-session {
        min-height: 600px;
        display: flex;
        flex-direction: column;
        background: var(--color-surface, #fff);
    }
    
    .session-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-surface-alt, #f8fafc);
    }
    
    .session-title {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0 0 1rem;
        color: var(--color-text-primary, #1f2937);
    }
    
    .session-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        font-size: 0.875rem;
    }
    
    .meta-item {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    
    .meta-label {
        color: var(--color-text-secondary, #6b7280);
        font-weight: 500;
    }
    
    .meta-value {
        color: var(--color-text-primary, #1f2937);
    }
    
    .session-visualization {
        flex: 1;
        position: relative;
        overflow: hidden;
        min-height: 500px;
    }
    
    .no-session-data {
        padding: 3rem;
        text-align: center;
        color: var(--color-text-secondary, #6b7280);
    }
    
    /* Mobile responsive */
    @media (max-width: 640px) {
        .session-header {
            padding: 1rem;
        }
        
        .session-title {
            font-size: 1.25rem;
        }
        
        .session-meta {
            flex-direction: column;
            gap: 0.75rem;
        }
        
        .session-visualization {
            min-height: 400px;
        }
    }
</style>