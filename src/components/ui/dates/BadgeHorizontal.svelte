<script lang="ts">
    import { date as formatter } from '$lib/datetime';
    interface Props {
        date: string;
    }

    let { date }: Props = $props();
</script>

<span class="badge-horizontal">
    <svg class="badge-horizontal-icon">
        <use href="/icons-o.svg#calendar" />
    </svg>
    <span class="badge-horizontal-text">{formatter(date)}</span>
</span>


<style>
    .badge-horizontal {
        display: inline-flex;
        align-items: center;
        gap: 0.5em;
        font-size: 1em;
        background-color: var(--color-gray-500);
        color: var(--color-gray-900);
        padding: 0.25em .5em;
        border-radius: var(--radius-8);
    }

    .badge-horizontal-icon {
        width: 1em;
        height: 1em;
        fill: currentColor;
    }

    .badge-horizontal-text {
        white-space: nowrap;
    }
</style>