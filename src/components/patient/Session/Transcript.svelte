<script lang="ts">
    export let conversation: {
        speaker: string,
        text: string
    }[] = [];
</script>


<div class="conversation">
    {#each conversation as message}
        <div class="message -{message.speaker}">
            <p class="p">{message.text}</p>
        </div>
    {/each}
</div>


<style>


.conversation {
        display: flex;
        flex-direction: column;
        margin: 1rem;
        gap: 1rem;
    }

.message {
        position: relative;
        display: flex;
        gap: .5rem;
        width: 100%;
        background-color: var(--color-info);
        color: var(--color-info-text);
        padding: .5rem;
        border-radius: var(--radius-8);
        font-weight: 600;
    }
    /* message bubble arrow at bottom left */
    .message:after {
        content: '';
        position: absolute;
        width: 0;
        height: 0;

        border-top: 10px solid var(--color-info);
        border-right: 10px solid transparent;
        border-left: 10px solid transparent;
        bottom: -10px;
        left: 10px;
    }
    .message.-nurse,
    .message.-doctor {
        background-color: var(--color-gray-500);
        color: var(--text);
        justify-content: flex-end;
        font-weight: 300;
    }
    .message.-nurse:after,
    .message.-doctor:after {
        right: 10px;
        left: auto;
        border-top: 10px solid var(--color-gray-500);
    }


</style>
