<script lang="ts">
    import {parse, serialize} from 'tinyduration';

    export let value: string;
    export let placeholder: string = 'Input';
    export let id: string = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    export let label: string | undefined = undefined;
    export let name: string = id;

    type Duration = {
        years?: number,
        months?: number,
        weeks?: number,
        days?: number,
        hours?: number,
        minutes?: number,
        seconds?: number,
        milliseconds?: number
    }

    let duration: Duration = extendDuration(parse(value));
    $: {
        if(value) duration = extendDuration(parse(value));
    }

    function extendDuration(d: Duration): Duration {
        return {
            years: parseInt(d.years || 0),
            months: parseInt(d.months || 0),
            weeks: parseInt(d.weeks || 0),
            days: parseInt(d.days || 0),
            hours: parseInt(d.hours || 0),
            minutes: parseInt(d.minutes || 0),
            seconds: parseInt(d.seconds || 0),
            milliseconds: parseInt(d.milliseconds || 0),
        }
    }

    let className: string = 'input';
    export {
        className as class
    }
    function updateDuration() {
        duration = extendDuration(duration);
        value = serialize(duration);
    }
</script>



{#if $$slots.default}
<label class="label" for={id}><slot/></label>
{/if}
<!--input type="text" id="{id}" class={className} bind:value {placeholder}/-->
<div class="duration">
{#each Object.keys(duration) as key}

    <div class="duration-segment">
        <input type="text" inputmode="numeric" id="{id}-{key}" {name} class={className} bind:value={duration[key]} placeholder={key} on:keyup={updateDuration}/>
        <label for="{id}-{key}">{key}</label>
    </div>
{/each}
</div>

<style>
    .duration {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin: 0;
        justify-content: space-between;
    }
    .duration input {
        width: 100%;
        text-align: right;
        appearance: none;
        margin: 0;

        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }
    .duration-segment {
        display: flex;
        width: 12%;
        flex-direction: column;
        align-items: center;
        margin: 0;
        flex-direction: column-reverse;
    }
    .duration-segment label {
        margin: 0;
        padding: .2rem 0;
        font-size: .8rem;
        background-color: var(--color-form-input);
        color: var(--color-form-input-text);
        width: 100%;
        text-align: center;
        border-top-left-radius: var(--border-radius);
        border-top-right-radius: var(--border-radius);
        text-overflow: ellipsis;
        overflow: hidden;
    }
    .duration-segment input:focus + label {
        background-color: var(--color-form-input-active-border);
        color: var(--color-form-input-active-text);
    }
</style>


