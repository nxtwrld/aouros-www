<script lang="ts">
    import { t } from '$lib/i18n';
    
    export let data: {
        thumbnail: string;
        type: string;
        url?: string;
        file: ArrayBuffer
    }[]

    console.log(data);
</script>


{#if data}


    <h3 class="h3 heading -sticky">{ $t('report.attachments') }</h3>


    <div class="attachments">
        {#each data as attachment}
            <div class="attachment">
                {#if attachment.thumbnail}
                <img src={attachment.thumbnail} alt={attachment.type} />
                {/if}
            </div>
        {/each}
    </div>
{/if}


<style>

    .attachments {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: stretch;
        align-items: stretch;
        flex-grow: 1;
        gap: var(--gap);
        padding: 1rem;
        background-color: var(--color-background);
        container: attachments /  inline-size;
        margin-bottom: var(--gap);
    }

    .attachment {
        width: 15rem;
        height: 15rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;

    }
    .attachment img {
        height: 100%;
        object-fit: contain;
        box-shadow: 0 1rem 1rem -1rem rgba(0,0,0,.6);
    }

    @container attachments (inline-size < 30rem) {
        .attachment {
            width: calc(50%);
            min-width: none;
        }
    }
    @container attachments (inline-size < 50rem) {
        .attachment {
            width: calc(33%);
            min-width: none;
        }
    }
    @container attachments (inline-size < 70rem) {
        .attachment {
            width: calc(25%);
            min-width: none;
        }
    }
</style>