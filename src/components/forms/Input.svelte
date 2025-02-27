<script lang="ts">
    import InputDateTime from "./InputDateTime.svelte";
    import InputFile from "./InputFile.svelte";

    export let value: string | number = '';
    export let checked: boolean = false;
    export let group: any = '';
    export let placeholder: string = 'Input';
    export let type: string = 'text';
    export let id: string = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    export let name: string = id;
    export let required: boolean = false;
    export let label: string | undefined = undefined;
    export let style: string = '';
    export let min: string = '';
    export let max: string = '';
    export let step: string = '';
    export let disabled: boolean = false;
    export let viewable: boolean = true;
    export let readonly: boolean = false;
    export let copyable: boolean = false;
    export let autocomplete: string = 'off';
    export let tabindex: number = 0;

    export let view: boolean = false;

    let className: string = 'input';
    export {
        className as class
    }
</script>

{#if ($$slots.default || label) && type != 'checkbox' && type != 'radio'}
    <label class="label" for={id}>
        {#if label}
            {label}
        {:else}
            <slot/>
        {/if}
    </label>
{/if}
<div class="input-field">
{#if type == 'text'}
    <input type="text" {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable}
        on:change on:blur on:focus on:keypress on:keyup on:keydown/>
{:else if type == 'password'}
    
        {#if view == false}
        <input type="password" {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable} class:viewable={viewable}
            on:change on:blur on:focus on:keypress on:keyup on:keydown/>
        {:else}
        <input type="text" {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable} class:viewable={viewable}
            on:change on:blur on:focus on:keypress on:keyup on:keydown/>
        {/if}

        {#if viewable}
            <button type="button" on:click={() => view = !view} class="input-tool input-show-password">
                {#if view == false}
                    <svg>
                        <use xlink:href="/sprite.svg#password-show"></use>
                    </svg>
                {:else}
                    <svg>
                        <use xlink:href="/sprite.svg#password-hide"></use>
                    </svg>
                {/if}
            </button>
        {/if}
{:else if type == 'search'}
    <input type="search" {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable}
        on:change on:blur on:focus on:keypress on:keyup on:keydown/>
{:else if type == 'email'}
    <input type="email" {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable}
        on:change on:blur on:focus on:keypress on:keyup on:keydown/>
{:else if type == 'number'}
    <input type="number" {id} {name} {step} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable}
        {min} {max}
        on:change on:blur on:focus on:keypress on:keyup on:keydown/>
{:else if type == 'time'}
    <input type="time" {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable}
        on:change on:blur on:focus on:keypress on:keyup on:keydown/>
{:else if type == 'tel'}
    <input type="tel" {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable}
        on:change on:blur on:focus on:keypress on:keyup on:keydown/>
{:else if type == 'url'}
    <input type="url" {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable}
        on:change on:blur on:focus on:keypress on:keyup on:keydown/>
{:else if type == 'week'}
    <input type="week" {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable}
        on:change on:blur on:focus on:keypress on:keyup on:keydown/>
{:else if type == 'month'}
    <input type="month" {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly} class:copyable={copyable}
        on:change on:blur on:focus on:keypress on:keyup on:keydown/>
{:else if type == 'file'}
    <InputFile {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete}  
        on:change on:blur on:focus on:keypress on:keyup on:keydown/>
{:else if type == 'datetime-local' || type == 'datetime' || type == 'date-local' || type == 'date' || type == 'time'}
    <InputDateTime {id} {name} class={className} {tabindex} {disabled} bind:value {placeholder} {required} {style} {autocomplete} {readonly}  on:change on:blur on:focus/>
{:else if type == 'checkbox'}
    <div class="input-line" class:checked={checked}>
        <input type="checkbox" {id} {name} class={className} {tabindex} {disabled} bind:checked={checked} {style} {autocomplete} {readonly} on:change on:blur on:focus/>
            {#if ($$slots.default || label)}
            <label class="label" for={id}>
                {#if label}
                    {label}
                {:else}
                    <slot/>
                {/if}
            </label>
        {/if}
    </div>
{:else if type == 'radio'}
    <div class="input-line" class:checked={checked}>
        <input type="radio" {id} {name} class={className} {tabindex} {disabled} bind:group={group} {value} {style} {autocomplete} {readonly} on:change on:blur on:focus/>
            {#if ($$slots.default || label)}
            <label class="label" for={id}>
                {#if label}
                    {label}
                {:else}
                    <slot/>
                {/if}
            </label>
        {/if}
    </div>
{/if}
{#if copyable}
    <button type="button" class="input-tool input-copy" on:click={() => navigator.clipboard.writeText(value)} disabled={value == ''}>
        <svg>
            <use xlink:href="/sprite.svg#copy"></use>
        </svg>
    </button>
{/if}
 </div>
<style>
    .input-line {
        display: flex;
        align-items: center;
        justify-content: flex-start;
    }
    .input-field {
        position: relative;
        width: 100%;
    }
    .input-field input.viewable,
    .input-field input.copyable {
        padding-right: 2rem;
        
    }
    .input-field input.copyable.viewable {
        padding-right: 4rem;
    }

    .input-tool {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        aspect-ratio: 1/1;
        padding: 0.5rem;
        border: none;
        pointer-events: all;
        background-color: transparent;
        color: var(--color-text);
        font-size: 0.8rem;
        cursor: pointer;
        z-index: 1;
        opacity: 0.5;
    }
    .input-tool:hover {
        opacity: 1;
    }

    .input-tool svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
    }
    .input-tool:nth-last-child(2) {
        right: 2rem;
    }
</style>
