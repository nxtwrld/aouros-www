<script lang="ts">
    import { t } from '$lib/i18n';
    import { decrypt as decryptAes, importKey } from '$lib/encryption/aes';
    import { decrypt } from '$lib/documents/index';
    import { base64ToArrayBuffer } from '$lib/arrays';

    type Attachment = {
        thumbnail: string;
        type: string;
        path?: string;
        url?: string;
        file?: ArrayBuffer;
    }

  interface Props {
    data: Attachment[];
    key?: string | undefined;
  }

  let { data, key = undefined }: Props = $props();

    console.log(data);

    function showAttachment() {
        console.log(data);
    }

    const loadedAttachments = new Map<string, ArrayBuffer>();

    async function loadAttachement(attachment: Attachment): Promise<ArrayBuffer> {
        console.log('loadAttachment', attachment);
        if (!('path' in attachment) || !key) return;
        const fileResponse = await fetch('/v1/med/profiles/' + attachment.path);
        console.log(fileResponse);
        // base64 to arraybuffer to text file
        const file = await decrypt([await fileResponse.text()], key);
        // base64 to blob
        console.log('decrypted', file);
        const json = JSON.parse(file);
        return base64ToArrayBuffer(json.file)

    }

    async function downloadAttachment(attachment: Attachment): Promise<void> {
  
        const blob = new Blob([await loadAttachement(attachment)], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attachment.' + ext;
        a.click();
    }
</script>


{#if data}


    <h3 class="h3 heading -sticky">{ $t('report.attachments') }</h3>


    <div class="attachments">
        {#each data as attachment}
            <button class="attachment" onclick={() => downloadAttachment(attachment)}>
                {#if attachment.thumbnail}
                <img src={attachment.thumbnail} alt={attachment.type} />
                {/if}
            </button>
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
        gap: 1rem;
        padding: 1.5rem;
        background-color: var(--color-background);
        container: attachments /  inline-size;
        margin-bottom: var(--gap);
    }

    .attachment {
        width: auto;
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
        transition: transform .3s, border-width .3s;
        border: 0px solid var(--color-interactivity);
    }
    .attachment:hover img {
        transform: scale(1.05);
        border-width: 2px;
    }
</style>