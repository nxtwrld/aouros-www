<script lang="ts">

    export let country: string = 'us';
    export let height: string = "1rem";

    const flagMapping: Record<string, string> = {
        en: 'us',
        zh: 'cn',
        cs: 'cz',
        da: 'dk',
        el: 'gr',
    } 

    let flag: string = '';

    $: flag = getCode(country.toLowerCase());

    function getCode(country: string): string {
        return flagMapping[country] || country;
    }
</script>

<span class="fi fi-{flag}" style="height: {height}"></span>


<style>

</style>