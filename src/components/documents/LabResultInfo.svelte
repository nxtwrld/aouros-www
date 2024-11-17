<script lang="ts">
    import LabResultTips from "./LabResultTips.svelte";
    export let kb: any = {};

</script>


<h3 class="h3">What is {kb.term}</h3>
<p class="p">{kb.description}</p>

{#if kb.synonyms.length > 0}
<p class="p">
    Synonyms: {kb.synonyms.join(', ')}
</p>
{/if}

<h3 class="h3">Risk of low {kb.term}</h3>

{#if kb.low}
    <p class="p">{kb.low.risk}</p>

    {#if kb.low.diet.length > 0 || kb.low.behavior.length > 0}
        <h3 class="h3">How to raise your {kb.term}</h3>
    {/if}
    {#if kb.low.diet.length > 0}
        <div class="status-block">
            <LabResultTips tips={kb.low.diet} icon="diet" >What to eat</LabResultTips>
        </div>
    {/if}

    {#if kb.low.behavior.length > 0}
        <div class="status-block">
            <LabResultTips tips={kb.low.behavior} icon="behavior" >What to do</LabResultTips>
        </div>
    {/if}
{/if}


{#if kb.high}
    <h3 class="h3">Risk of high {kb.term}</h3>

    <p class="p">{kb.high.risk}</p>

    {#if kb.high.diet.length > 0 || kb.high.behavior.length > 0}
        <h3 class="h3">How to lower your {kb.term}</h3>
    {/if}

    {#if kb.high.diet.length > 0 }
        <div class="status-block">
            <LabResultTips tips={kb.high.diet} icon="diet" >What to eat</LabResultTips>
        </div>
    {/if}
    {#if kb.high.behavior.length > 0}
        <div class="status-block">
            <LabResultTips tips={kb.high.behavior} icon="behavior" >What to do</LabResultTips>
        </div>
    {/if}
{/if}

{#if kb.links}
    <h3 class="h3">Further reading:</h3>
    <p class="p">
    {#each kb.links as link}
        <a href="{link}" class="a" target="_blank">{link}</a>
    {/each}
    </p>
{/if}
