<script lang="ts">
    import { t } from '$lib/i18n';
    
    interface Props {
        nodeId: string;
        onnodeAction?: (action: string, targetId: string, reason?: string) => void;
    }

    let { nodeId, onnodeAction }: Props = $props();

    function handleNodeAction(action: string) {
        onnodeAction?.(action, nodeId, `${action} from node details`);
    }
</script>

<footer class="session-details-actions">
    <button class="session-action-btn accept" onclick={() => handleNodeAction('accept')}>
        {$t('session.actions.accept')}
    </button>
    <button class="session-action-btn highlight" onclick={() => handleNodeAction('highlight')}>
        {$t('session.actions.highlight')}
    </button>
    <button class="session-action-btn suppress" onclick={() => handleNodeAction('suppress')}>
        {$t('session.actions.suppress')}
    </button>

</footer>

<style>
    /* All styles now use shared session-* classes */
</style>