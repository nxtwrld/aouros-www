<script lang="ts">
    import { run } from 'svelte/legacy';

    import {parse, serialize, type Duration} from 'tinyduration';

    function extendDuration(d: Duration): Duration {
        return {
            years: parseInt(String(d.years || 0)),
            months: parseInt(String(d.months || 0)),
            weeks: parseInt(String(d.weeks || 0)),
            days: parseInt(String(d.days || 0)),
            hours: parseInt(String(d.hours || 0)),
            minutes: parseInt(String(d.minutes || 0)),
            seconds: parseInt(String(d.seconds || 0)),
            milliseconds: parseInt(String(d.milliseconds || 0)),
        }
    }

    interface Props {
        value: string;
        placeholder?: string;
        id?: string;
        label?: string | undefined;
        name?: string;
        class?: string;
        children?: import('svelte').Snippet;
    }

    let {
        value = $bindable(),
        placeholder = 'Input',
        id = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16),
        label = undefined,
        name = id,
        class: className = 'input',
        children
    }: Props = $props();

    let duration: Duration = $state(extendDuration(parse(value || 'PT0S')));
    
    function updateDuration() {
        duration = extendDuration(duration);
        value = serialize(duration);
    }
    run(() => {
        if(value) duration = extendDuration(parse(value));
    });
</script>



{#if children}
<label class="label" for={id}>{@render children?.()}</label>
{/if}
<!--input type="text" id="{id}" class={className} bind:value {placeholder}/-->
<div class="duration">
{#each Object.keys(duration) as key}

    <div class="duration-segment">
        <input type="text" inputmode="numeric" id="{id}-{key}" {name} class={className} bind:value={duration[key as keyof Duration]} placeholder={key} onkeyup={updateDuration}/>
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


