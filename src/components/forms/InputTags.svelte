<script lang="ts">
    import Input from "./Input.svelte";

    export let value: string[] = [];
    export let id: string = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    export let placeholder: string = 'Add Tags';
    export let label: string | undefined = undefined;

    let newTag: string = '';

    function removeTag(index: number) {
        value.splice(index, 1);
        value = [...value];
    }

    function addTag() {
        if (newTag) {
            value = [...value, newTag];
            newTag = '';
        }
    }

    function keyPress(event: KeyboardEvent) {
        if (event.key == 'Enter') {
            addTag();
        }
    }
</script>

{#if $$slots.default || label}
    <label class="label" for={id}>
        {#if label}
            {label}
        {:else}
            <slot/>
        {/if}
    </label>
{/if}

<div class="tags">
    {#each value as tag, index}
        <button type="button" class="tag" on:click={() => removeTag(index)}>
            <span>{tag}</span>

            <svg>
                <use href="/sprite.svg#close"></use>
            </svg>
        </button>
    {/each}
    <div class="input-inline">
        <Input {id} bind:value={newTag} {placeholder} type="text" on:keypress={keyPress} />
        <button class="button" type="button" on:click={addTag}>Add</button>
    </div>
</div>


<style>
    .tags {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
    }
    .tag {
        display: flex;
        flex-direction: row;
        align-items: center;
        background-color: var(--color-terciary);
        color: var(--color-terciary-contrast);
        border-radius: var(--border-radius);
        padding: 0.5rem;
        margin: 0.25rem;
        border: 1px solid var(--color-light);
        box-shadow: var(--shadow-interactive);
        cursor: pointer;
    }
    .tag span {
        margin-right: 0.5rem;
    }
    
    .tag svg {
        width: 1rem;
        height: 1rem;
        fill: currentColor;
    }
    .tag:hover {
        background-color: var(--color-negative);
        color: var(--color-negative-contrast);
        fill: var(--color-negative-contrast);
    }
    .input-inline {
        display: flex;
        flex-direction: row;
        align-items: stretch;
    }
    .input-inline :global(.input) {
        padding: 0.5rem;
        margin: 0.25rem;
        margin-right: 0;
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        flex-grow: 1;
        font-size: 1rem;
    }
    .input-inline .button {
        padding: 0.5rem;
        margin: 0.25rem;
        margin-left: 0;
        border-left: none;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        font-size: 1rem;
    }
</style>