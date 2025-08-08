<script lang="ts">
    import NodeDetails from './NodeDetails.svelte';
    import type { SessionAnalysis } from './types/visualization';

    interface Props {
        selectedNode: any | null;
        allNodes: SessionAnalysis['nodes'];
        onnodeAction?: (event: CustomEvent<{ action: string; targetId: string; reason?: string }>) => void;
        isMobile?: boolean;
    }

    let { selectedNode, allNodes, onnodeAction, isMobile = false }: Props = $props();

    function handleNodeAction(event: CustomEvent<{ action: string; targetId: string; reason?: string }>) {
        onnodeAction?.(event);
    }

    // Debug logging
    $effect(() => {
        console.log('📋 SessionDetailsTab received selectedNode:', selectedNode ? { id: selectedNode.id, type: selectedNode.type || 'unknown' } : null);
    });
</script>

{#if selectedNode}
    <NodeDetails 
        node={selectedNode}
        {allNodes}
        onnodeAction={handleNodeAction}
    />
{:else}
    <div class="empty-state">
        <p>{isMobile ? 'Select a node to view details' : 'Select a node from the diagram to view details'}</p>
    </div>
{/if}

<style>
    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--color-text-secondary, #6b7280);
        text-align: center;
        padding: 2rem;
    }

    .empty-state p {
        margin: 0;
    }
</style>