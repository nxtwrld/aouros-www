<script lang="ts">
	import insuranceProviders from '$data/insurance.providers.json';
    export const ready: boolean = true;

    const INSURANCE_COMPANIES: {
        code: string;
        country: string;
        name: string;
    }[] = [...insuranceProviders];
    
    interface Props {
        data: {
        insurance: {
            number: string;
            provider: string;
        }
    };
        profileForm: HTMLFormElement;
    }

    let { data = $bindable(), profileForm }: Props = $props();
</script>



<h2 class="h2">Insurance (optional)</h2>

<div class="input">
    <label for="insurance_number">Insurance number</label>
    <input id="insurance_number" name="insurance_number" type="text" bind:value={data.insurance.number} />
</div>

<div class="input">
    <label for="insurance_provider">Insurance provider</label>
    <select id="insurance_provider" name="insurance_provider" bind:value={data.insurance.provider}>
        <option value="">Select insurance provider</option>
        {#each INSURANCE_COMPANIES as { code, name }}
            <option value={code}>{name}</option>
        {/each}
    </select>
</div>