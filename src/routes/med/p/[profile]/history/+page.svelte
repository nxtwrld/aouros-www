<script lang="ts">
    import { type Profile } from '$lib/types.d';

    interface Props {
        data: {
        profile: Profile
    };
    }

    let { data }: Props = $props();
    const profile: Profile = data.profile;
</script>
 
<h1>History</h1>
