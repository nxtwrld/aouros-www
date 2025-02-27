<script lang="ts">

    export let value: number = 0;
    let className: string = '';



    export let offset: {
        right?: string,
        left?: string
    } = {};

    $: offsetExtended = getOffset(offset);

        
    export let type: 'linear' | 'circular' = 'linear';
    export let max: number = 100;
    export {
        className as class
    }

    function getOffset(offset) {
        return Object.assign({
            right: '0px',
            left: '0px'
        }, offset);
    }


</script>

{#if type == 'linear'}
<div class="progress {className} {type}">
    <div class="indicator" style="width: calc({100/max * value}% - {offsetExtended.left} - {offsetExtended.right})"></div>
</div>
{:else if type == 'circular'}
TODO
{/if}

<style>
    .progress {
        position: relative;
        height: 100%;
    }
    .indicator {
        height: 100%;
        background-color: currentColor;
        transition: width var(--transition-default);
    }

</style>