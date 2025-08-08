<script lang="ts">
    import QuestionManager from './QuestionManager.svelte';
    import type { QuestionAnswerEvent } from './types/visualization';

    interface Props {
        questions: any[];
        alerts: any[];
        onquestionAnswer?: (event: CustomEvent<QuestionAnswerEvent>) => void;
    }

    let { questions = [], alerts = [], onquestionAnswer }: Props = $props();

    function handleQuestionAnswer(event: CustomEvent<QuestionAnswerEvent>) {
        onquestionAnswer?.(event);
    }
</script>

<QuestionManager 
    {questions}
    {alerts}
    onquestionAnswer={handleQuestionAnswer}
/>