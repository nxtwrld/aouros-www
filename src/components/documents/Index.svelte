<script lang="ts">

    import { profile } from '$lib/med/profiles';
    import { updateSignals } from '$lib/health/signals';
    import userStore from '$lib/user';
    import { byUser, updateDocument, getDocument } from '$lib/med/documents';
    import { getByAnotherAuthor } from '$lib/med/documents/tools';
    import { type Profile } from '$lib/med/types.d';
    import { t } from '$lib/i18n';
    import BadgeHorizontal from '$components/ui/dates/BadgeHorizontal.svelte';
    import { type Document } from '$lib/med/documents/types.d';


    export let user: string = $profile?.id || $userStore?.id as string;
    let documents = byUser(user);


//    console.log('documents', $documents);

    function sortByDate(a: Document, b: Document) {
        if (!a.metadata.date) return 1;
        if (!b.metadata.date) return -1;
        return new Date(b.metadata.date) - new Date(a.metadata.date);
    }

    function testSignals() {
        updateSignals([{
            signal: 'weight',
            value: '85',
            unit: 'kg',
            reference: '70-90',
            date: '2024-11-28'
        }, {
            signal: 'cholesterol',
            value: '5.6',
            unit: 'mmol/L',
            reference: '3.0-5.0',
            date: '2024-11-29',
            urgency: 2
        }], $profile.id);    



    }

    // test update document
    async function testUpdateDocument() {
        // load health profile document
        let document = await getDocument($profile.healthDocumentId) as Document;




        document.content = {
    "title": "Health Profile",
    "tags": [
        "health",
        "profile"
    ],
    "birthDate": "1975-10-09",
    "biologicalSex": "female",
    "signals": {
    }

}

        //convert format to signals type
        await updateDocument(document);
        
    }

    async function checkHealthProfile() {
        if (!$profile.healthDocumentId) {
            console.log('no health profile');
            return;
        }
        console.log('health profile', $profile.healthDocumentId);
        console.log('health profile', await getDocument($profile.healthDocumentId));
    }

</script>


<!--button class="button" on:click={testSignals}>Test signals</button>
<button class="button" on:click={testUpdateDocument}>Test update</button>
<button class="button" on:click={checkHealthProfile}>Check</button-->

{#if documents}
<div class="tiles">
{#each $documents.sort(sortByDate) as document}
    {@const author = getByAnotherAuthor(document)}

    <a href="/med/p/{document.user_id}/documents/{document.id}" class="tile -vertical category-{document.metadata.category}">
        <!--Vertical date={document.metadata.date} /-->

        <div class="tile-header"> <BadgeHorizontal date={document.metadata.date} /> </div>
        <div class="tile-body">
            <h4 class="h4">{document.metadata.title}</h4>
        </div>

        <div class="tile-footer">


            <svg class="category">
                <use href="/icons-o.svg#report-{document.metadata.category}" />
            </svg>

            <div class="people">
                {#if author}
                    {author.fullName}
                {:else}
                    {$profile.fullName}
                {/if}
            </div>
        </div>
        <!--div class="actions"></div-->
    </a>
{/each}
</div>
{/if}


<style>
    .tile {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: space-between;

    }
    .tile .tile-body {
        flex-grow: 1;
        padding: .5rem;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
    }
    .tile .tile-header {
        display: flex;
        justify-content: flex-end;
        font-size: 1rem;
        padding: .5rem;
    }
    .tile .tile-footer {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: var(--color-gray-600);
    }

    .tile:hover {
        background-color: var(--color-white);
    }

    .tile:hover .tile-footer {
        background-color: var(--color);
        color: var(--color-text);
    }

    .tile  svg.category {
        color: var(--color);
        margin: .5rem;
        width: 1.6rem;
        height: 1.6rem;
        fill: currentColor;
    }
    .tile:hover  svg.category {
        color: var(--color-text);
    }

    .tile .people {
        margin: .5rem;
    }

</style>