<script lang="ts">
    import ImportFileContainer from "$components/import/ImportFileContainer.svelte";
    import type { JOURNEY } from '$components/user/Onboarding.svelte';

    export let journey: JOURNEY | undefined = undefined;

    const callback: (items: any) => void = (items: any) => {
        console.log('HEY', items);
    }
</script>

<div>
Quick Share

<ImportFileContainer {callback}/>


Add Contact
</div>
