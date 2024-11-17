<script lang="ts">
    import DonutChart from "./DonutChart.svelte";

    export let value: number = 0;

    export let colors: string[] = ["var(--color-shade)", "var(--color-primary)"];
</script>

<div class="progress">
<DonutChart 
    data={[{value: value}, {value: 100 - value}]}
    colors={colors}
     />
    <svg viewBox="0 0 500 500" preserveAspectRatio="xMidYMid meet">
        <text style="fill: {colors[1]}" class="progress-value" x="50%" y="55%" >{value}</text>
    </svg>
</div>

<style>
    .progress {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
    }
    .progress svg {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
    }
    .progress svg .progress-value {
        font-size: 12rem;
        font-weight: bold;
        fill: var(--color-primary-dark);
        text-anchor: middle;
        dominant-baseline: middle;
    }

</style>