<script lang="ts">
    export let value: string;
    export let placeholder: string = 'Date and time';
    export let id: string = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    export let name: string = id;
    export let type = 'datetime-local';
    export let required: boolean = false;
    export let label: string | undefined = undefined;
    export let style: string = '';

    let className: string = 'input';
    export {
        className as class
    }


    let transformedValue: string = toLocalDateTime(value);

    $: if (transformedValue) value = fromLocalDateTime(transformedValue);

    function toLocalDateTime(input: string) {
        try {
            if (type == 'datetime-local') {
                const date = new Date(input);
                const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                return localDate.toISOString().slice(0, 16);
            } else if (type == 'date') {
                const date = new Date(input);
                return date.toISOString().split('T')[0];
            } else {
                console.log('input', input)
                return input
            }
        }
        catch (e) {
            return '';
        }
    }

    function fromLocalDateTime(localDateTime: string) {
        const localDate = new Date(localDateTime);
        if (type == 'datetime-local') {
            const utcDate = new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60000));
            return utcDate.toISOString().split('.')[0] + 'Z';
        } else {
            return localDate.toISOString().split('T')[0];
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
    {#if type === 'datetime-local'}
        <input type="datetime-local" {id} {name} class={className} bind:value={transformedValue} {placeholder} {required} {style} on:change on:blur on:focus/>
    {:else if type === 'datetime'}
        <input type="datetime"  {id} {name} class={className} bind:value={transformedValue} {placeholder} {required} {style} on:change on:blur on:focus/>
    {:else if type === 'date-local'}
        <input type="date-local"  {id} {name} class={className} bind:value={transformedValue} {placeholder} {required} {style} on:change on:blur on:focus/>
    {:else if type === 'date'}
        <input type="date"  {id} {name} class={className} bind:value={transformedValue} {placeholder} {required} {style} on:change on:blur on:focus/>
    {:else if type === 'time'}
        <input type="time"  {id} {name} class={className} bind:value={transformedValue} {placeholder} {required} {style} on:change on:blur on:focus/>
    {/if}


<style>
    input {
        -webkit-appearance: none;
        -webkit-min-logical-width: calc(100% - 16px);
        min-height: 1.5rem;
    }
</style>