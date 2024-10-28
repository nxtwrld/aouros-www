<script lang="ts">
    import { type Patient } from '$slib/med/types.d';
    import { patient } from '$slib/med/patients';

    
    export let report: any;
    report.date = new Date();
</script>


       
<div class="report-header">
    
    <h1>Zpráva o ambulatním vyšetření</h1>
    
<div><strong>Pacient:</strong> {$patient.name} </div>
<div><strong>Bydliště:</strong> {$patient.location} </div>
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