<script lang="ts">
    import type { SupabaseClient } from '@supabase/supabase-js';
	
    export let supabase: SupabaseClient;
    export const ready: boolean = true;
    export let data: {
        insurance: {
            number: string;
            provider: string;
        }
    };

    const INSURANCE_COMPANIES: {
        code: string;
        country: string;
        name: string;
    }[] = [
        {
            code: '111',
            country: 'CZ',
            name: 'VZP - Všeobecná zdravotní pojišťovna České republiky'
        },
        {
            code: '201',
            country: 'CZ',
            name: ' Vojenská zdravotní pojišťovna České republiky'
        },
        {
            code: '205',
            country: 'CZ',
            name: 'Oborová zdravotní pojišťovna zaměstnanců bank, pojišťoven a stavebnictví České republiky'
        },
        {
            code: '207',
            country: 'CZ',
            name: 'Oborová zdravotní pojišťovna zaměstnanců bank, pojišťoven a stavebnictví'
        },
        {
            code: '209',
            country: 'CZ',
            name: 'Zaměstnanecká pojišťovna Škoda'
        },
        {
            code: '211',
            country: 'CZ',
            name: 'Zdravotní pojišťovna ministerstva vnitra České republiky'
        },
        {
            code: '213',
            country: 'CZ',
            name: 'RBP - Revírní bratrská pokladna, zdravotní pojišťovna'
        }

    ]
    
    export let profileForm: HTMLFormElement;
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