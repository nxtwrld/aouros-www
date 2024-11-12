<script lang="ts">
    import type { SupabaseClient } from '@supabase/supabase-js';
    export let supabase: SupabaseClient;
    export const ready: boolean = true;
    export let data: {};
    
    export let profileForm: HTMLFormElement;
</script>


    <h2 class="h2">You account is almost ready!</h2>
<div class="result-icon">
<svg>
    <use href="/icons-o.svg#registration-form" />
</svg>
</div>
<h2 class="h2">Hit SAVE to enter!</h2>

<style>

    .h2 {
        text-align: center;
    }
    .result-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-grow: 1;
        margin: 5rem 0;
    }
    .result-icon svg {
        width: 11rem;
        height: 11rem;
        fill: var(--color-interactivity);
        animation: pulsate 2s infinite;
    }

    @keyframes pulsate {
        0% {
            opacity: .7;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: .7;
        }
    }
</style>