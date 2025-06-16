<script lang="ts">
    
    import Signal from "./Signal.svelte";
    import focused from "$lib/focused";
    import { t } from '$lib/i18n';
    import type { Document } from '$lib/documents/types.d';


  interface Props {
    document: Document;
    data: any;
  }

  let { document, data }: Props = $props();

    //console.log('Results',data);
    let children: LabResult[] = $state([]);

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
                {item} {document} />
        {/each}
        
        
        </table>

{/if}


<style>

    .h3.heading {
        /* turn of margin to accomodate the table spacing */
        margin-bottom: 0;
    }
</style>