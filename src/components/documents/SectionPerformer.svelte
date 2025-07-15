<script lang="ts">
    import ProfileImage from "$components/profile/ProfileImage.svelte";
    import { t } from "$lib/i18n";
    import { logger } from '$lib/logging/logger';

    interface Props {
        data: any[] | any; // Accept both array and single object for backward compatibility
    }

    let { data }: Props = $props();
    logger.api.debug('Performer data:', data)

    // Normalize data to always be an array
    const performers = $derived(Array.isArray(data) ? data : (data ? [data] : []));
</script>

{#if performers.length > 0}
    <h3 class="h3 heading -sticky">{ $t('report.performer') }</h3>

    {#each performers as performer}
        <div class="contact-card card">
            <div class="image">
                <ProfileImage size={8} />
            </div>
            <div class="actions -vertical">
                {#if performer.tel && performer.tel[0] && performer.email[0].value}
                {@const tel = performer.tel[0]}
                <a href="tel:{performer.email[0].value}" aria-label="Call phone number">
                    <svg>
                        <use href="/icons.svg#phone" />
                    </svg>
                </a>
                {/if}
                {#if performer.email && performer.email[0] && performer.email[0].value}
                <a href="mailto:{performer.email[0].value}" aria-label="Send email">
                    <svg>
                        <use href="/icons.svg#email" />
                    </svg>
                </a>
                {/if}
                {#if performer.adr && performer.adr[0]}  
                    {@const address = performer.adr[0]}
                    <a href="https://www.google.com/maps/search/?q={address['street-address']}+{address.locality}+{address['postal-code']}" target="_blank" aria-label="View location on maps">
                        <svg>
                            <use href="/icons.svg#location-medical" />
                        </svg>
                    </a>
                {/if}
                <div class="-filler"></div>
            </div>
            <div class="details">
                <div class="contacts">
                    {#if performer.fn}
                        <p class="p name"> {performer.fn}</p>
                    {/if}

                    {#if performer.org}
                        {#each performer.org as org}
                        <p class="p"> {org['organization-name']}</p>
                            {#if org['organization-unit']}
                            {#each org['organization-unit'] as unit}
                                <p class="p"> {unit}</p>
                            {/each}
                            {/if}
                        {/each}
                    {/if}

                    {#if performer.tel}
                        {#each performer.tel as {value}}
                        {#if value}
                        <p class="p"><a class="a" href="tel:{value}">{value}</a></p>
                        {/if}
                        {/each}
                    {/if}

                    {#if performer.email}
                        {#each performer.email as {value}}
                        {#if value}
                            <p class="p"><a class="a" href="mailto:{value}">{value}</a></p>
                        {/if}
                        {/each}
                    {/if}

                    {#if performer.url}
                        {#each performer.url as {value}}
                        <p class="p"><a class="a" href="{value}" target="_blank">{value}</a></p>
                        {/each}
                    {/if}
                </div>
                <div class="location">
                    {#if performer.adr}
                        {#each performer.adr as adr}
                        <p class="p"> {adr['street-address']}</p>
                        <p class="p"> {adr.locality}</p>
                        <p class="p"> {adr['postal-code']}</p>
                        <p class="p"> {adr['country-name']}</p>
                        {/each}
                    {/if}
                </div>
            </div>
        </div>
    {/each}
{/if}



<style>
    .card {
        display: flex;
        align-items: stretch;
        gap: var(--gap);
        margin-bottom: var(--gap);
    }

    .card > * {
    }
    .card .image {
        background-color: var(--color-background);
        padding: 1rem;
    }

    .card .details {
        background-color: var(--color-background);
        flex-grow: 1;
        padding: 1rem;
        gap: 1rem;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;

    }
    .card .details > * {
        width: calc(50% - 3rem);
        min-width: 20rem;
    }
    .name {
        font-weight: bold;
        font-size: 1.5rem;
    }


    .card .actions {
        width: var(--toolbar-height);
        display: flex;
        gap: var(--gap);
        justify-content: stretch;
        align-items: stretch;
    }
    .card .actions.-vertical {
        flex-direction: column;
    }
    .card .actions .-filler {
        flex-grow: 1;
        background-color: var(--color-background);
    }

    .card .actions a {
        width: var(--toolbar-height);
        height: var(--toolbar-height);
        border: none;
        background-color: var(--color-background);
        color: var(--color-interactivity);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: .5rem;
    }
    .card .actions a svg {
        fill: currentColor;
        height: 100%;
        width: 100%;
    }
    
    .card:hover .actions a {
        background-color: var(--color-white);
    }
    .card:hover .actions a:hover {
        background-color: var(--color-interactivity);
        color: var(--color-interactivity-text);
    }
</style>