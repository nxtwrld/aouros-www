<script lang="ts">


export let data: { 
    id: string;
    type: 'document' | 'other';
 }[] = [];

 $: byType = data.reduce((acc, {type, id}) => {
    if (!acc[type]) acc[type] = [];
    acc[type].push(id);
    return acc;
 }, {}) as Record<string, string[]>;

</script>


{#each Object.keys(byType) as type}
    <h2>{type}</h2>
    <ul>
        {#each byType[type] as id}
            <li><a href="/{type}/{id}">{id}</a></li>
        {/each}
    </ul>
{/each}