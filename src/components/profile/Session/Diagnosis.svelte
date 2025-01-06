<script lang="ts">
    import { getSortForEnum, sortbyProperty } from '$lib/array';
    import { ANALYZE_STEPS } from '$lib/types.d';
    import PropertyTile from '../PropertyTile.svelte';


    export let analysis: any;

    export let step: ANALYZE_STEPS = ANALYZE_STEPS.transcript;


    enum Origin {
        doctor = 'doctor',
        symptoms = 'symptoms',
        test = 'test',
        diagnosis = 'diagnosis'
    }

    const severityEnum = {
        mild: 0,
        moderate: 1,
        severe: 2
    }

    enum DaysOfWeek  {
        Monday = 'Monday',
        Tuesday = 'Tuesday',
        Wednesday = 'Wednesday',
        Thursday = 'Thursday',
        Friday = 'Friday',
        Saturday = 'Saturday',
        Sunday = 'Sunday'
    }
    enum Frequency {
        Daily = 'Dayily',
        Weekdays = 'Weekdays',
        EveryTwoDays = 'EveryTwoDays'
    }   



    $: {
        if (analysis.diagnosis) {
            pinSpecialist(analysis.diagnosis);
        }
        if (analysis.treatment) {
            pinSpecialist(analysis.treatment);
        }
        if (analysis.followUp) {
            pinSpecialist(analysis.followUp);
        }
        if (analysis.medication) {
            pinSpecialist(analysis.medication);
        }
    }


    function pinSpecialist(ar : {
        pinned: boolean,
        origin: Origin
    }[]) {
        ar.forEach((d) => {
            d.pinned = (d.origin == Origin.doctor);
        })
    }

    function getFrequency(days: DaysOfWeek[] = []): Frequency[] | DaysOfWeek[] {
        if (days.length === 7) {
            return [Frequency.Daily];
        }
        if (days.length === 5) {
            // TODO check only workdays are present
            return [Frequency.Weekdays]
        }
        return days;
    }

    function togglePin(item) {
        console.log('Pinned', item);
        item.pinned = !item.pinned;
        analysis = {...analysis}
    }

    function removeItem(item, object) {
        object.splice(object.indexOf(item), 1);
        analysis = {...analysis}
    }

</script>
{#if analysis.complaint}
<div class="block block-complaint">
    <!--h4 class="h4">Complaint</h4-->
    <p>{analysis.complaint}</p>
</div>
{/if}

{#if analysis.signals}
<div class="block block-results">
    <h4 class="h4">Signals</h4>
    <div class="block-grid">
        {#each analysis.signals as signal}
            <PropertyTile property={signal} />

        {/each}
    </div>
</div>
{/if}


{#if analysis.symptoms}
<div class="block block-symptoms">
    <h4 class="h4">Symptoms</h4>
    {#each analysis.symptoms.sort(getSortForEnum(severityEnum, 'severity')) as symptom}
    <div class="list-item severity -{symptom.severity}">
        <div class="list-title">{symptom.name}</div>
        <div>{symptom.duration}</div>
        <div>{symptom.bodyParts}</div>
        <div class="actions">
            <button class="list-action remove" on:click|stopPropagation={() => removeItem(symptom, analysis.symptoms)}>
                <svg>
                    <use href="/icons.svg#minus"></use>
                </svg>
            </button>
        </div>
    </div>
    {/each}
</div>
{/if}


{#if analysis.diagnosis}
<div class="block block-diagnosis">
    <h4 class="h4">Diagnostic results</h4>
    {#each analysis.diagnosis.sort(sortbyProperty('probability')).reverse() as diagnosis}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="list-item" class:-pinned={diagnosis.pinned}  on:click={() => togglePin(diagnosis)}>

        <div>{#if diagnosis.code}{diagnosis.code}{:else}&nbsp;&nbsp;&nbsp;{/if}</div>
        <div class="list-title">{diagnosis.name}</div>
        <div>{diagnosis.basis}</div>
        <div>{diagnosis.probability}</div>
        <div class="actions">
            <button class="list-action pin" on:click|stopPropagation={() => togglePin(diagnosis)}>
                <svg>
                    <use href="/icons.svg#pin"></use>
                </svg>
            </button>
            <button class="list-action remove" on:click|stopPropagation={() => removeItem(diagnosis, analysis.diagnosis)}>
                <svg>
                    <use href="/icons.svg#minus"></use>
                </svg>
            </button>
        </div>
    </div>
    {/each}
</div>
{/if}

{#if analysis.treatment}
<div class="block block-recommendations">
    <h4 class="h4">Treatment Plan</h4>
    {#each analysis.treatment as treatment}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="list-item" class:-pinned={treatment.pinned}  on:click={() => togglePin(treatment)}>
        <div class="list-title">{treatment.description}</div>
        <div class="actions">
            <button class="list-action pin" on:click|stopPropagation={() => togglePin(treatment)}>
                <svg>
                    <use href="/icons.svg#pin"></use>
                </svg>
            </button>
            <button class="list-action remove" on:click|stopPropagation={() => removeItem(treatment, analysis.treatment)}>
                <svg>
                    <use href="/icons.svg#minus"></use>
                </svg>
            </button>
        </div>
    </div>
    {/each}
</div>
{/if}

{#if analysis.followUp}
<div class="block block-follow-up">
    <h4 class="h4">Follow up</h4>
    {#each analysis.followUp as followUp}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="list-item" class:-pinned={followUp.pinned} on:click={() => togglePin(followUp)}>
        <!--div>{followUp.type}</div-->
        <div class="list-title">{followUp.name}</div>
        <div class="list-description">{followUp.reason}</div>
        <div class="actions">
            <button class="list-action pin" on:click|stopPropagation={() => togglePin(followUp)}>
                <svg>
                    <use href="/icons.svg#pin"></use>
                </svg>
            </button>
            <button class="list-action remove" on:click|stopPropagation={() => removeItem(followUp, analysis.followUp)}>
                <svg>
                    <use href="/icons.svg#minus"></use>
                </svg>
            </button>
        </div>
    </div>
    {/each}
</div>
{/if}

{#if analysis.medication}
<div class="block block-prescriptions">
    <h4 class="h4">Suggested Medication</h4>
    {#each analysis.medication as medication}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="list-item" class:-pinned={medication.pinned} on:click={() => togglePin(medication)}>
        <div class="list-title">
            {medication.name} {medication.dosage}
            <div class="sub">{getFrequency(medication.days_of_week)} - {medication.days}</div>
            <div class="sub">{medication.time_of_day}</div>
        </div>
        <div class="actions">
            <button class="list-action pin" on:click|stopPropagation={() => togglePin(medication)}>
                <svg>
                    <use href="/icons.svg#pin"></use>
                </svg>
            </button>
            <button class="list-action remove" on:click|stopPropagation={() => removeItem(medication, analysis.medication)}>
                <svg>
                    <use href="/icons.svg#minus"></use>
                </svg>
            </button>
        </div>
    </div>
    {/each}
</div>
{/if}



<!--ul>

<li>Doctor suggested diagnosis</li>
<li>Analysis - suggested diagnosis</li>
<li>Doctor suggested treatment</li>
<li>Analysis - suggested treatment</li>
<li>Doctor suggested follow-up</li>
<li>Analysis - suggested follow-up</li>
<li>Doctor suggested prescriptions</li>
<li>Analysis - suggested prescriptions</li>
</ul-->


<style>

    .block {
        display: flex;
        flex-direction: column;
        margin: 0 1rem 1rem 1rem;
        break-inside: avoid;   
    }

    .block-grid {
        display: grid;
        grid-template-columns: auto auto auto;
        gap: 1rem;
    }
    .block-complaint {
        background-color: var(--color-negative);
        color: var(--color-negative-text);
        grid-column-start: 1;
        grid-column-end: 3;
        border-radius: var(--radius-8);
        padding: 1rem;
        font-weight: 700;
    }
    .block-complaint p {
        font-size: 1.4rem;
    }


    .list-item {
        display: flex;
        gap: .5rem;
        padding: .5rem;
        border-radius: var(--radius-8);
        margin-bottom: var(--gap);
        background-color: var(--color-white);
    }
    .list-item.-pinned {
        font-weight: 700;
    }
    .list-item .actions {
        display: flex;
        gap: .5rem;
        flex-wrap: nowrap;
        color: var(--color-gray-800-alpha);
        mix-blend-mode: multiply;
    }
    .list-item.-pinned .pin {
        color: var(--color-neutral);
    }
    .list-title ,
    .list-description {
        flex-grow: 1;
    }
    .list-description {
        font-weight: 300;
    }
    .list-action {
        width: 1.3rem;
        height: 1.3rem;
    }
    .list-action svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
    }

    .sub {
        font-size: 0.9rem;
        font-weight: 200;
    }




</style>