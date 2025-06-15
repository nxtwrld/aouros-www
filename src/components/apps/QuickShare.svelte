<script lang="ts">
    import ImportFileContainer from "$components/import/ImportFileContainer.svelte";
    import type { JOURNEY } from '$components/user/Onboarding.svelte';

    interface Props {
        journey?: JOURNEY | undefined;
    }

    let { journey = undefined }: Props = $props();

    const callback: (items: any) => void = (items: any) => {
        console.log('HEY', items);
    }
</script>

<div>
Quick Share

<ImportFileContainer {callback}/>


Add Contact
</div>
