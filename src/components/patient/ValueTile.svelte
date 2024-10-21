<script lang="ts">
    export let result: {
        test: string;
        value: number;
        unit: string;
        reference: string;
    }

    $: referenceRange = result.reference.split('-').map(Number)

    $: unit = getUnit(result.unit)

    function getUnit(u: string) {
        switch (u) {
            case 'C':
                return '&#8451;'
            case 'F':
                return '&#8457;'
            default:
                return u
        }
    }
</script>

<div class="grid-tile" class:-danger={result.value < referenceRange[0] || result.value > referenceRange[1]} >
    <div class="title">{result.test}</div>
    <div class="value"><strong>{result.value}</strong> <span class="unit">{@html unit} </span></div>
</div>


<style>



    .grid-tile {
        display: flex;
        flex-direction: column;
        gap: .5rem;
        padding: .5rem;
        height: 6rem;
        
        align-items: stretch;
        border-radius: var(--radius-8);
        margin-bottom: var(--gap);
        background-color: var(--color-white);
    }
    .grid-tile .title {
    }

    .grid-tile .value {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        align-items: flex-end;
        flex-grow: 1;
        gap: .2rem;
        font-size: 2rem;
        font-weight: 700;
    }
    .grid-tile .unit {
        font-size: 1.5rem;
        font-weight: 300;
    }

</style>