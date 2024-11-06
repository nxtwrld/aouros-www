<script lang="ts">
    import type { SupabaseClient } from '@supabase/supabase-js';
	
    export let supabase: SupabaseClient;
    export const ready: boolean = true;
    export let data: {
        subscription: string;
    };
    export let profileForm: HTMLFormElement;


    const SUBSCRIPTIONS = [
        {
            id: 'individual',
            name: 'Individual',
            connectedAccounts: 1,
            price: 'free',
        },
        {
            id: 'family',
            name: 'Family',
            connectedAccounts: 10,
            price: '299',
        },
        {
            id: 'gp',
            name: 'Medical Practice',
            connectedAccounts: 100,
            price: '999',
        },
        {
            id: 'medical',
            name: 'Medical institution',
            connectedAccounts: 0,
            price: 'call',
        },
    ]
</script>

<div class="cards flex">
{#each SUBSCRIPTIONS as subscription}
    <div class="card flex -column" class:-selected={subscription.id == data.subscription}>
        <h3 class="h3">{subscription.name}</h3>
        <div class="card-body flex">
            <div class="details">
                <p>Connected accounts: 
                    
                    {subscription.connectedAccounts === 0
                        ? 'Unlimited'
                        : subscription.connectedAccounts
                    }
                </p>
                <p>Price: {subscription.price}</p>
            </div>
            {#if subscription.id != data.subscription}
                <button class="button" on:click={() => data.subscription = subscription.id}>Select</button>
            {/if}
        </div>
    </div>
{/each}
</div>


<style>
    .cards {
        gap: 1rem;
        align-items: stretch;
        justify-content: stretch;
        flex-wrap: wrap;
        height: 100%;
    }
    .card {
        background-color: var(--color-white);
        border-radius: var(--radius-16);
        padding: 1rem;
        width: 100%;
        height: 100%;
        align-items: space-between;
    }

    .card.-selected {
        background-color: var(--color-positive);
    }

    .card .h3 {
        margin: 0 0 1rem;
    }

    .details {
        flex-grow: 1;
    }

</style>