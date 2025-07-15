<script lang="ts">
    import { t } from '$lib/i18n';
    import { decrypt as decryptAes, importKey } from '$lib/encryption/aes';
    import { decrypt } from '$lib/documents/index';
    import { base64ToArrayBuffer } from '$lib/arrays';
    import { logger } from '$lib/logging/logger';

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

    logger.api.debug('Attachments data:', data);

    function showAttachment() {
        logger.api.debug('Showing attachment data:', data);
    }

    const loadedAttachments = new Map<string, ArrayBuffer>();

    async function loadAttachement(attachment: Attachment): Promise<ArrayBuffer> {
        logger.api.debug('Loading attachment:', attachment);
        if (!attachment.path || !key) {
            throw new Error('Missing attachment path or decryption key');
        }
        // Extract profile ID from the path (format: profileId/filename)
        const profileId = attachment.path.split('/')[0];
        const fileResponse = await fetch(`/v1/med/profiles/${profileId}/attachments?path=${encodeURIComponent(attachment.path)}`);
        logger.api.debug('File response:', fileResponse);
        
        if (!fileResponse.ok) {
            throw new Error(`Failed to fetch attachment: ${fileResponse.status} ${fileResponse.statusText}`);
        }
        
        // read the encrypted base64 string from storage
        const encryptedData = await fileResponse.text();
        // decrypt the base64 encrypted data
        const file = await decrypt([encryptedData], key);
        // parse the decrypted JSON and extract the file data
        logger.api.debug('Decrypted file:', file);
        const json = JSON.parse(file);
        return base64ToArrayBuffer(json.file)
    }

    async function downloadAttachment(attachment: Attachment): Promise<void> {
        try {
            const blob = new Blob([await loadAttachement(attachment)], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Extract file extension from attachment type or use a default
            const ext = attachment.type ? attachment.type.split('/')[1] || 'bin' : 'bin';
            a.download = 'attachment.' + ext;
            a.click();
            // Clean up the blob URL to prevent memory leaks
            URL.revokeObjectURL(url);
        } catch (error) {
            logger.api.error('Failed to download attachment:', error);
            // You might want to show a user-friendly error message here
        }
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