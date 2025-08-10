<script lang="ts">
    import QuestionManager from './QuestionManager.svelte';

    interface Props {
        questions: any[];
        alerts: any[];
    }

    let { questions = [], alerts = [] }: Props = $props();

</script>

<QuestionManager 
    {questions}
    {alerts}
/>