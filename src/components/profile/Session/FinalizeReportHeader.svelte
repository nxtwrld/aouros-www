<script lang="ts">
    import { profile } from '$lib/profiles';

    
    interface Props {
        report: any;
    }

    let { report = $bindable() }: Props = $props();
    report.date = new Date();
</script>


       
<div class="report-header">
    
    <h1>Zpráva o ambulatním vyšetření</h1>
    
<div><strong>Pacient:</strong> {$profile.fullName} </div>
<div><strong>Bydliště:</strong> {$profile.vcard?.address?.[0]} </div>
<br/>
<div><strong>Datum:</strong> {report.date.toLocaleDateString()}</div>
</div>


<style>

    .report-header {
        margin-bottom: 2rem;
        font-family: var(--font-face-print);
    }
    strong {
        font-weight: 800;
    }

    h1 {
        font-size: 2rem;
        margin-bottom: 1rem;

    }
</style>