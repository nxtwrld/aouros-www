<script lang="ts">
    import SpeakCore from '$components/ui/SpeakCore.svelte';
    import Speak from '$components/ui/Speak.svelte'
    import { process } from '$lib/textract';
    import mixpanel from "mixpanel-browser";
    import { onMount } from "svelte";

    onMount(() => {
        mixpanel.track("medassist-page", { name: 'load' });
    });


    function track(name: string, v: any = undefined) {
        mixpanel.track(name, v);
    }

    function feedback(type: string, value: number) {
        return () =>{
            track("medassist", {
                type,
                value,
            });
        }
    }

    const emptyResponse = {
        diagnosisList: [],
        counterMeassures: [],
        follow_up: [],
        medication: [],
        chat_response: "",
    }

    let description: string = 'I have a bad cough attacks for the past several days. There are several small ones during the day, but in the evening I get a severe one, when I sometime loose consciousness and find myself on the floor several minutes later.';
    let response: {
        diagnosisList: {
            name: string,
            basis: string,
            probability: number,
        }[],
        counterMeassures: string[],
        follow_up: {
            type: string,
            name: string,
            reason: string,
        }[],
        medication: {
            name: string,
            dosage: number,
            days: string,
            days_of_week: string[],
            time_of_day: string}[],
        chat_response: string,
    } = {
    "diagnosisList": [
        {
            "name": "Pertussis (Whooping Cough)",
            "basis": "Characteristic coughing spells leading to possible loss of consciousness",
            "probability": 0.6
        },
        {
            "name": "Severe Asthma",
            "basis": "Coughing spasms leading to severe distress and possible fainting",
            "probability": 0.3
        },
        {
            "name": "Chronic Bronchitis",
            "basis": "Frequent cough with exacerbation in the evening",
            "probability": 0.1
        }
    ],
    "counterMeassures": [
        "Avoid irritants like smoke, dust, and strong odors",
        "Ensure to stay hydrated",
        "Use a humidifier to keep the air moist",
        "Rest adequately and avoid strenuous activities"
    ],
    "follow_up": [
        {
            "type": "test",
            "name": "Chest X-ray",
            "reason": "To check for any abnormalities in the lungs and airways"
        },
        {
            "type": "specialist",
            "name": "Pulmonologist",
            "reason": "For further evaluation and specialized care"
        }
    ],
    "medication": [
        {
            "name": "Salbutamol",
            "dosage": 100,
            "days": "7-10 days",
            "days_of_week": ["Monday"],
            "time_of_day": "As needed for relief of cough spasms"
        }
    ],
    "chat_response": "I'm really sorry to hear that you've been experiencing such severe coughing attacks. It sounds incredibly distressing, especially with the loss of consciousness. Please make sure to avoid any known irritants and keep yourself hydrated. It's important to follow up with a healthcare professional, and I strongly encourage you to see a specialist like a pulmonologist and get a chest X-ray to better understand your condition. In the meantime, using medications like Salbutamol as prescribed can help manage the symptoms. Hang in there, and remember that proper medical care can make a significant difference. You're taking the right steps by seeking help."
}

    async function submit() {
        if (description.trim() === "") {
            track("medassist-submit", 'empty');
            return;
        }
        track("medassist-submit", description);
        const data = await process(description, 'diagnosis');
        console.log(data);
        response = Object.assign(emptyResponse, data);
        track("medassist-result", {
            diagnosis: (response.diagnosisList) ? response.diagnosisList.length : 0,
            counterMeasures: (response.counterMeassures) ? response.counterMeassures.length : 0,
            medication: (response.medication) ? response.medication.length : 0,
        });
 
    }



</script>
<img class="doctor" src="/medassist/doctor.png" />

<SpeakCore></SpeakCore>

<h1>Akeso Iaso</h1>

<h3>Patient input</h3>
<textarea bind:value={description} class="code" placeholder="Describe your symptoms"></textarea>
<Speak bind:value={description}>Record</Speak>

<button class="button" on:click={submit}>Process</button>

<div>
    Summary:

    {description}
</div>

<div class="suggestions">
    <div>
        <h3>Diagnosis:</h3>
                <div class="feedback">
            <button on:click={feedback('diagnosis',1)} ><svg>
                <use href="/sprite.svg#thumbs-up"></use>
            </svg></button>
            <button on:click={feedback('diagnosis',-1)} ><svg>
                <use href="/sprite.svg#thumbs-down"></use>
            </svg></button>
        </div>
        {#each response.diagnosisList as {name: diagnosis, basis, probability}}
            <li>{diagnosis} ({probability*100}%)
                <p>{basis}</p>
            </li>
        {/each}

    </div>
    <div>
        <h3>Counter meassures:</h3>
        <div class="feedback">
            <button on:click={feedback('measure',1)} ><svg>
                <use href="/sprite.svg#thumbs-up"></use>
            </svg></button>
            <button on:click={feedback('measure',-1)} ><svg>
                <use href="/sprite.svg#thumbs-down"></use>
            </svg></button>
        </div>
        <ul>
        {#each response.counterMeassures as counterMeassure}
            <li>{counterMeassure}</li>
        {/each}
        </ul>

    </div>

    <div>
        <h3>Follow up:</h3>
        <div class="feedback">
            <button on:click={feedback('follow_up',1)} ><svg>
                <use href="/sprite.svg#thumbs-up"></use>
            </svg></button>
            <button on:click={feedback('follow_up',-1)} ><svg>
                <use href="/sprite.svg#thumbs-down"></use>
            </svg></button>
        </div>
        <ul>
        {#each response.follow_up as {type, name, reason}}
            <li>
                {type}: {name}
                <p>{reason}</p>
            </li>
        {/each}
        </ul>
    </div>
    <div>
        <h3>Prescription recommendation:</h3>
        <div class="feedback">
            <button on:click={feedback('medication',1)} ><svg>
                <use href="/sprite.svg#thumbs-up"></use>
            </svg></button>
            <button on:click={feedback('medication',-1)} ><svg>
                <use href="/sprite.svg#thumbs-down"></use>
            </svg></button>
        </div>
        <ul>
            {#each response.medication as {name, dosage, days, days_of_week, time_of_day}}
                <li>
                    {name} {dosage}mg
                    <p>{days}</p>
                    <p>{days_of_week.join(',')} - {time_of_day}</p>
                </li>
            {/each}
        </ul>

    </div>
</div>

<div>
    <h3>Positive patient feedback:</h3>
    <div>
        {response.chat_response}
    </div>
</div>

<style>
    .doctor {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
        display: block;
    }

    .code {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
        display: block;
        padding: 1rem;
        margin-top: 1rem;
    }
    .suggestions {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1rem;
    }


    .feedback {
        display: flex;
    }
    .feedback > button{
        background-color: var(--color-primary);
        color: #FFF;
        border: none;
        padding: .5rem;
        border-radius: 50%;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .feedback > button:hover {
        background-color: #00f7ff;
    }
</style>