<script lang="ts">
    import App from '$components/apps/App.svelte';
    interface Props {
        data?: any;
    }

    let { data = undefined }: Props = $props();
</script>



<App data={data} />