<script lang="ts">
    import ProfileImage from "$components/profile/ProfileImage.svelte";
    import { t } from "$lib/i18n";

    export let data: any;
    console.log('Performer', data)
</script>

{#if data}

    <h3 class="h3 heading -sticky">{ $t('report.performer') }</h3>

    <div class="contact-card card">
        <div class="image">
            <ProfileImage size={8} />
        </div>
        <div class="actions -vertical">
            {#if data.tel && data.tel[0]}
            {@const tel = data.tel[0]}
            <a href="tel:{data.tel[0].value}">
                <svg>
                    <use href="/icons.svg#phone" />
                </svg>
            </a>
            {/if}
            {#if data.email && data.email[0]}
            <a href="mailto:{data.email[0].value}">
                <svg>
                    <use href="/icons.svg#email" />
                </svg>
            </a>
            {/if}
            {#if data.adr && data.adr[0]}  
                {@const address = data.adr[0]}
                <a href="https://www.google.com/maps/search/?q={address['street-address']}+{address.locality}+{address['postal-code']}" target="_blank">
                    <svg>
                        <use href="/icons.svg#location-medical" />
                    </svg>
                </a>
            {/if}
            <div class="-filler"></div>
        </div>
        <div class="details">
            <div class="contacts">
                {#if data.fn}
                    <p class="p name"> {data.fn}</p>
                {/if}

                {#if data.org}
                    {#each data.org as org}
                    <p class="p"> {org['organization-name']}</p>
                        {#if org['organization-unit']}
                        {#each org['organization-unit'] as unit}
                            <p class="p"> {unit}</p>
                        {/each}
                        {/if}
                    {/each}
                {/if}

                {#if data.tel}
                    {#each data.tel as {value}}
                    <p class="p"><a class="a" href="tel:{value}">{value}</a></p>
                    {/each}
                {/if}

                {#if data.email}
                    {#each data.email as {value}}
                    <p class="p"><a class="a" href="mailto:{value}">{value}</a></p>
                    {/each}
                {/if}

                {#if data.url}
                    {#each data.url as {value}}
                    <p class="p"><a class="a" href="{value}" target="_blank">{value}</a></p>
                    {/each}
                {/if}
            </div>
            <div class="location">
                {#if data.adr}
                    {#each data.adr as adr}
                    <p class="p"> {adr['street-address']}</p>
                    <p class="p"> {adr.locality}</p>
                    <p class="p"> {adr['postal-code']}</p>
                    <p class="p"> {adr['country-name']}</p>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
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

    .card .actions button,
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
    .card .actions button svg,
    .card .actions a svg {
        fill: currentColor;
        height: 100%;
        width: 100%;
    }
    
    .card:hover .actions button,
    .card:hover .actions a {
        background-color: var(--color-white);
    }
    .card:hover .actions button:hover,
    .card:hover .actions a:hover {
        background-color: var(--color-interactivity);
        color: var(--color-interactivity-text);

    }
</style>