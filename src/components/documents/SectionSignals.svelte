<script lang="ts">
    import type { Report } from "$lib/report/types.d";
    import Signal from "./Signal.svelte";
    import focused from "$lib/focused";
    import { t } from '$lib/i18n';

    export let data: any;
    export let report: Report;

    //console.log('Results',data);
    let children: LabResult[] = [];

    function closeAll() {
        children.forEach((c: any) => {
            if (c && c.closeDetails) c.closeDetails()
        });
    }


    focused.subscribe((f: any) => {
        if(f.object) {
            closeAll();
            //filter  = 'default';
        }
    });
</script>


{#if data && data.length > 0}
    <h3 class="h3 heading -sticky">{ $t('report.vitals-and-amp-results') }</h3>

  

        <table  class="table-list">
        {#each data as item, index}

            <Signal bind:this={children[index]} on:showDetails={closeAll}
                {item} {report} />
        {/each}
        
        
        </table>

{/if}


<style>

    .h3.heading {
        /* turn of margin to accomodate the table spacing */
        margin-bottom: 0;
    }
    .report {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0 .2rem ;
    }
</style>