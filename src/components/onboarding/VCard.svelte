<script lang="ts">
    import type { SupabaseClient } from '@supabase/supabase-js';
    import type { VCard } from '$lib/contact/types.d';
    import { text } from '@sveltejs/kit';
	
    export let supabase: SupabaseClient;
    export const ready: boolean = true;
    export let data: {
        vcard: VCard
    };

    $: {

        Object.entries(vcard).forEach(([key, value]) => {
            const path = key.split('__');
            if (path.length === 1) {
                data.vcard[path[0]] = value;
                return;
            }
            if (!data.vcard[path[0]]) {
                data.vcard[path[0]] = {};
            }
            data.vcard[path[0]][path[1]] = value;
            
        })        
        //console.log(data.vcard);
    }

    let vcard = {
        n__honorificPrefixes: '',
        n__givenName: '',
        n__familyName: '',
        n__honorificSufixes: '',
        org: '',
        title: '',
        email: [{
            type: 'work',
            value: ''
        }],
        tel: [{
            type: 'work',
            value: ''
        }],
        adr: [{
            type: 'work',
            street: '',
            city: '',
            state: '',
            postalCode: '',
        }],
        note: ''
    }

    const FORM = [
        {
            label: 'Honorific Prefixes',
            id: 'honorificPrefixes',
            type: 'text',
            bind: 'n__honorificPrefixes'
        },
        {
            label: 'First Name',
            id: 'givenName',
            type: 'text',
            bind: 'n__givenName'
        },
        {
            label: 'Last Name',
            id: 'familyName',
            type: 'text',
            bind: 'n__familyName'
        },
        {
            label: 'Honorific Suffixes',
            id: 'honorificSufixes',
            type: 'text',
            bind: 'n__honorificSufixes'
        },
        {
            label: 'Organization',
            id: 'organization',
            type: 'text',
            bind: 'org'
        },
        {
            label: 'Title',
            id: 'title',
            type: 'text',
            bind: 'title'
        },
        {
            type: 'array',
            label: 'Email',
            id: 'email',
            bind: 'email'
        },
        {
            type: 'array',
            label: 'Phone',
            id: 'tel',
            bind: 'tel'
        },
        {
            type: 'array',
            label: 'Address',
            id: 'adr',
            bind: 'adr'
        },
        {
            label: 'Note',
            id: 'note',
            type: 'text',
            bind: 'note'
        }
    ]

    const formSets = {
        n: ['honorificPrefixes', 'givenName', 'familyName', 'honorificSufixes', 'org', 'title', 'note'],
        contacts: ['email', 'tel'],
        adr: ['adr']
    }
    let currentSet: 'n' | 'contacts' | 'adr' = 'n';

    export let profileForm: HTMLFormElement;


    function addItem(id) {
        vcard[id] = [...vcard[id], {
            type: 'work',
            value: ''
        }]
    }

    function removeItem(id, index) {
        vcard[id].splice(index, 1);
        vcard[id] = [...vcard[id]];
    }
</script>


<h2 class="h2">Contact information (optional)</h2>

<div class="tabhead">
{#each Object.keys(formSets) as key}
    <button  on:click={() => currentSet = key} class:-active={currentSet == key}>{key}</button>
{/each}
</div>

{#each FORM.filter((f) => formSets[currentSet].includes(f.id)) as { label, id, type, bind }}

        <!--label for={id}>{label}</label-->
        {#if type == 'text'}
        <div class="input">
        <input id={id} name={id} type="text" bind:value={vcard[bind]} placeholder={label} />
    </div>
        {:else if type == 'array'}
        <div class="form-block">
            <h4 class="h4">{label}</h4>
            {#each vcard[bind] as arr, index}
            <div class="flex contact-item">
                <div class="input">
                <select id={id + 'type' +index} name={id + 'type' +index}  bind:value={arr.type}>
                    <option value="work" selected>Work</option>
                    <option value="home">Home</option>
                    {#if id == 'tel'}
                    <option value="cell">Cell</option>
                    {/if}
                </select>
                </div>
                <div>
                {#each Object.keys(arr).filter(key => key != 'type') as key}
                    <div class="input">
                    {#if id == 'email'}
                    <input id={id + key + index} name={id + key +index} type="email" bind:value={arr[key]} placeholder={label} />
                    {:else if id == 'tel'}
                    <input id={id + key + index} name={id + key +index} type="tel" bind:value={arr[key]} placeholder={label} />
                    {:else}
                    <input id={id + key + index} name={id + key +index} type="text" bind:value={arr[key]} placeholder={label + ' ' + key} />
                    {/if}
                    </div>
                {/each}
                </div>
                <button class="button" on:click={() => removeItem(id, index)}>
                    <svg>
                        <use href="/icons.svg#close" />
                    </svg>
                </button>
            </div>
            {/each}
            <button class="button" on:click={() => addItem(id)}>Add</button>
        </div>
        {/if}

{/each}

<style> 
    .flex {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: .5rem;
    }
    .flex > select {
      width: 5rem;
    }
    .flex > div {
        flex-grow: 1;
    }
    .flex > div > input {
        width: 100%;
    }
    .contact-item > button {
        width: var(--input-height);
        height: var(--input-height);
        padding: .5rem;
    }

    svg {
        width: 100%;
        height: 100%;
    }

    .form-block {
        margin: 1rem 0;
    }

    .tabhead {
        --radius: 0;
        display: flex;
        width: 100%;
        justify-content: stretch;
        align-items: stretch;
        gap: var(--gap);
    }
    .tabhead > button,
    .tabhead > a {
        flex-grow: 1;
        padding: .5rem;
        background-color: var(--color-white);
        border-top: 3px solid var(--color-gray-800);
        transition: background-color .5s, color .5s, border-color .5s;
    }

    .tabhead > button:first-child,
    .tabhead > a:first-child {
        border-top-left-radius: var(--radius);
    }

    .tabhead > button:last-child,
    .tabhead > a:last-child {
        border-right: none;
        border-top-right-radius: var(--radius);
    }

    .tabhead > button:hover,
    .tabhead > a:hover {
        background-color: var(--color-interactivity);
        border-color: var(--color-interactivity);
        color: var(--color-interactivity-text);
        font-weight: 700;
    }

    .tabhead > button.-active,
    .tabhead > a.-active {
        font-weight: 700;
        border-color: var(--color-interactivity);
        color: var(--color-interactivity);
        background-color: transparent;
    }

    .tabhead {
        margin-bottom: 1rem;
    }
</style>
