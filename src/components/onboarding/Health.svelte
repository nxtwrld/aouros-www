<script lang="ts">
    import type { SupabaseClient } from '@supabase/supabase-js';
	
    export let supabase: SupabaseClient;
    export const ready: boolean = true;
    export let data: {};
    
    export let profileForm: HTMLFormElement;
</script>


Health