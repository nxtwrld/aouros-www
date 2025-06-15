<script lang="ts">
    import focused from '$lib/focused';
    import ui from '$lib/ui';
    import { t } from '$lib/i18n';

    interface Props {
        data: any;
    }

    let { data }: Props = $props();

    function showBodyPart(part: string) {
        ui.emit('viewer', { object: normalize(part) })
    }

    function normalize(str: string) {
        return str.replace(/ /ig, '_');
    }

    let hasTreatment = $derived(data && data.some((item: any) => item.treatment));

    function translate(str: string) {
        const translation = $t('anatomy.'+str);
        if (translation == 'anatomy.'+str) {
            return str;
        }
        return translation;
    }

</script>


{#if data && data.length > 0}

    <h3 class="h3 heading -sticky">{ $t('report.anatomy.body') }</h3>

    <table  class="table-list">
        <tbody>
        <tr>
            <th>{ $t('report.anatomy.body-part') }</th>
            <th></th>
            <th>{ $t('report.anatomy.status-and-diagnosis') }</th>
            {#if hasTreatment}
            <th>{ $t('report.anatomy.treatment') }</th>
            {/if}

        </tr>
        {#each data as { identification, status, diagnosis, treatment, urgency}}
        <tr class:selected={normalize(identification) == $focused.object} class="urgency-{urgency}">
            <td class="body-part">
                {translate(identification)}
            </td>
            <td class="-empty -actions">
                <div class="actions">
                <button onclick={() => showBodyPart(identification)}>
                    <svg>
                        <use href="/icons.svg#anatomy" />
                    </svg>
                </button>
                </div>
            </td>
            <td>
                    {#if status}
                    {status}
                    {/if}
                    {#if diagnosis}
                   {diagnosis}
                   {/if}
            </td>
            {#if hasTreatment}
            <td>        
                   {treatment}
            </td>
            {/if}

        </tr>
        {/each}
    </tbody>
    </table>



{/if}


<style>

    .heading {
        margin-bottom: 0;
    }

.table-list tr td {
    width:50%;
}
.table-list tr td:first-child {
    border-left: .5rem solid var(--color-urgency);
}




.table-list td.body-part {
    width: auto;
} 
.table-list td.-actions {
    width: auto;
}
</style>