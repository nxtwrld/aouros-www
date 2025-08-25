<script lang="ts">
    import Transcript from '../profile/Session/Transcript.svelte';

    interface Props {
        conversation: {
            speaker: string;
            text: string;
            stress: string;
            urgency: string;
        }[];
    }

    let { conversation = [] }: Props = $props();
</script>

<Transcript {conversation} />