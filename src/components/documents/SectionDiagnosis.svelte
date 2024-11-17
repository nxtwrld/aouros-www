<script lang="ts">
    import { t } from '$lib/i18n';

    export let data: any;
</script>


{#if data}
    <h3 class="h3 heading -sticky">{ $t('report.diagnosis') }</h3>
    <div class="page -block">
        {#if data.code}
        <strong>{data.code}</strong>&nbsp;&nbsp;
        {/if}
        {#if data.description}
            {data.description}
        {/if}
    </div>
{/if}