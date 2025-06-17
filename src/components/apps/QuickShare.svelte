<script lang="ts">
    import ImportFileContainer from "$components/import/ImportFileContainer.svelte";
    import type { JOURNEY } from '$components/user/Onboarding.svelte';
    import { logger } from '$lib/logging/logger';

    interface Props {
        journey?: JOURNEY | undefined;
    }

    let { journey = undefined }: Props = $props();

    const callback: (items: any) => void = (items: any) => {
        logger.api.debug('Quick share items', items);
    }
</script>

<div>
Quick Share

<ImportFileContainer {callback}/>


Add Contact
</div>
