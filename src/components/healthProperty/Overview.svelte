<script lang="ts">
    import { type Signal } from "$lib/med/types.d"; 
    import { profile } from '$lib/med/profiles';
    export let property: Signal;

    console.log('property', property);
    let prop = $profile.health[property.signal] || $profile.health.signals[property.signal]; 

    console.log('prop', prop);
    //$: ageOfEntry = (signal.date) ? durationFrom(signal.date) : undefined;
    // how much is the value expiring  1== recent  < 1 == older
    //$: isExpired = (signal.date) ? durationFromFormatted('days', signal.date) -  defaultSetup.valueExpirationInDays > 0 : false;
</script>

<h2 class="h2">{property.signal}</h2>


<p class="p">Lastest value expiration status</p>

<p class="p">Overview history chart</p>