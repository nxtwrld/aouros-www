<script lang="ts">

	

    
    import { SexEnum, BloodType } from '$lib/types.d';
    import { t } from '$lib/i18n';

    
    interface Props {
        ready?: boolean;
        data: {
        health: {
            biologicalSex?: SexEnum;
            birthDate?: string;
            bloodType?:  BloodType;
        }
    };
        profileForm: HTMLFormElement;
    }

    let { ready = $bindable(false), data = $bindable(), profileForm }: Props = $props();


    let bloodType: BloodType | undefined = $state(data.health.bloodType || undefined);
    let biologicalSex: SexEnum | undefined = $state(data.health.biologicalSex || undefined);
    let birthDate: string | undefined = $state(data.health.birthDate || undefined);
    
    // Update data.health when local state changes
    $effect(() => {
        if (birthDate && birthDate != '') {
            data.health.birthDate = birthDate;
        } else {
            delete data.health.birthDate;
        }
    });
    
    $effect(() => {
        if (bloodType) {
            data.health.bloodType = bloodType;
        } else {
            delete data.health.bloodType;
        }
    });
    
    $effect(() => {
        if (biologicalSex) {
            data.health.biologicalSex = biologicalSex;
        } else {
            delete data.health.biologicalSex;
        }
    });
    
    // Update ready state based on required fields
    $effect(() => {
        ready = !!(data.health.biologicalSex && data.health.birthDate);
    });
</script>


<h2 class="h2">{ $t('app.onboarding.healh-profile') }</h2>

<div class="input">
    <label for="birthDate">{ $t('app.onboarding.date-of-birth') } ({ $t('app.onboarding.required') })</label>
    <input id="birthDate" name="birthDate" type="date" bind:value={birthDate} required />
</div>


<div class="input">
    <label for="biologicalSex">{ $t('profile.health.props.biologicalSex') } ({ $t('app.onboarding.required') })</label>
    <select id="biologicalSex" name="biologicalSex" bind:value={biologicalSex}  required>
        <option value={undefined}>{ $t('app.onboarding.please-select-your-anatomy') }</option>
        {#each Object.entries(SexEnum) as [v, o]}
        <option value={v}>{$t('medical.prop-values.biologicalSex.'+o)}</option>
        {/each}
        
    </select>
</div>



<div class="input">
    <label for="bloodType">{ $t('profile.health.props.bloodType') }</label>
    <select id="bloodType" name="bloodType" bind:value={bloodType}>
        <option value={undefined}>{ $t('app.onboarding.i-am-not-sure') }</option>
        {#each Object.entries(BloodType) as [v, o]}
        <option value={v}>{$t('medical.prop-values.bloodType.'+o)}</option>
        {/each}
        
    </select>
</div>
