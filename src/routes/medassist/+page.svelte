<script lang="ts">
    import SpeakCore, { Status, status } from '$components/ui/SpeakCore.svelte'
    import Speak from '$components/ui/Speak.svelte';
    import { process } from '$lib/textract';
    import mixpanel from "mixpanel-browser";
    import { onMount } from "svelte";
    import SpeechIndicator from './SpeechIndicator.svelte';
    import ui from '$lib/ui';
    import Textarea from '$components/forms/Textarea.svelte';
    import { debounce } from 'throttle-debounce';



    onMount(() => {
        mixpanel.track("medassist-page", { name: 'load' });
        const off = [
            ui.listen('speak-text', listen),
            ui.listen('speak-start', () => {
                description = '';
                response = undefined;
            })
        ]
        return () => {
            off.forEach(f => f());
        };
    });


    let selection:  {
        diagnosisList: number,
        counterMeassures: number,
        follow_up: number,
        medication: number,
    } = {
        diagnosisList: -1,
        counterMeassures: -1,
        follow_up: -1,
        medication: -1,
    }

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
    let language: string = 'en-US';
    let description: string = '';//'I have a bad cough attacks for the past several days. There are several small ones during the day, but in the evening I get a severe one, when I sometime loose consciousness and find myself on the floor several minutes later.';
    let analyzing: boolean = false;

    $: hasSelection = Object.values(selection).some(v => v > -1);

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
    } | undefined = undefined;/*{
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

*/

    function listen(text: string) {
        console.log('listen', text);
        description = text;
        analyze(text);
    }
    const analyze = debounce(2500, function(text: string) {
        console.log('analyze', text);
        description = text;
        submit();
    },
	{ atBegin: false });
    

    async function submit() {
        console.log('submit', description);
        if (description.trim() === "") {
            track("medassist-submit", 'empty');
            return;
        }
        analyzing = true;
        track("medassist-submit", description);
        const data = await process(description, 'diagnosis');
        console.log(data);
        response = Object.assign(emptyResponse, data);
        track("medassist-result", {
            diagnosis: (response.diagnosisList) ? response.diagnosisList.length : 0,
            counterMeasures: (response.counterMeassures) ? response.counterMeassures.length : 0,
            medication: (response.medication) ? response.medication.length : 0,
        });
        analyzing = false;
 
    }


    function selectItem(type: 'diagnosisList' | 'counterMeassures' | 'follow_up' | 'medication', index: number) {
        console.log('select', type, index)
        selection[type] = index;
        selection = {...selection};
    }


    function toggle() {
        if ($status === Status.LISTEN) {
            ui.emit('speak-stop');
        } else if ($status === Status.IDLE){
            ui.emit('speak-start');
        }
    }


    async function generateReport ()  {
        track("medassist-report", selection);
        
        let selected : {
            [key: string]: any
        } = Object.entries(selection).reduce((acc, [key, value]) => {
            console.log(key, value);
            if (value >= 0) {
                acc[key] = response[key][value];
            }
            return acc;
        }, {});
        selected.transcript = description;
        console.log('generate report', selection, selected);
        const data = await process(JSON.stringify(selected), 'gp_report');
        console.log(data);
    }

</script>

<SpeakCore {language}></SpeakCore>


<div class="layout">


<div class="input">
    <!--h1>Akeso Iaso</h1-->




    <div class="speak">

        <Speak bind:value={description}>
            <svelte:fragment let:status>
                <button>
                {#if status === Status.LISTEN}
                    <SpeechIndicator />            
                    <img class="doctor" src="/medassist/doctor.png" />
                    <div class="button stop">
                        <svg>
                            <use href="/sprite.svg#doctor"></use>
                        </svg>
                    </div>
                    {:else if status === Status.IDLE && !analyzing}
  
                    <img class="doctor" src="/medassist/doctor.png" />
                    <div class="button">
                        <svg>
                            <use href="/sprite.svg#microphone"></use>
                        </svg>
                    </div>
                    {:else if analyzing}
                    <SpeechIndicator />     
                    <img class="doctor" src="/medassist/doctor.png" />
                    <div class="button">
                        <svg>
                            <use href="/sprite.svg#microphone"></use>
                        </svg>
                    </div>
                    {/if}
                </button>
            </svelte:fragment>
        </Speak>
    </div>
    <h3>Record or insert your percieved symptoms:</h3>
    <!--select bind:value={language}>
        <option value="en-US">English</option>
        <option value="cs-CZ">Čeština</option>
    </select-->
    <form on:submit|preventDefault={submit}>
        <Textarea class="symptoms" bind:value={description}  placeholder="Describe your symptoms"></Textarea>
        <div>

            {#if analyzing}
                <div>Analysing...</div>
            {:else}

                <button class="button" on:click={toggle}>
                    {#if $status === Status.LISTEN}
                        Stop Listening...
                    {:else}
                        Record Audio
                    {/if}
                </button>
                <button class="button" type="submit" disabled={description == ''}>Analyze</button>
            {/if}
            {#if hasSelection}
                <button class="button" on:click={generateReport}>Generate Report</button>
            {/if}
        </div>
    </form>
    <!--button class="button" on:click={submit}>Process</button-->

</div>



{#if response}
    

<div class="suggestions -left">
    <div>
        <div class="section-title">
            <svg class="section-icon">
                <use href="/sprite.svg#diagnosis"></use>
            </svg>
            <h3>Diagnosis:</h3>
                    <div class="feedback">
                <button on:click={feedback('diagnosis',1)} ><svg>
                    <use href="/sprite.svg#thumbs-up"></use>
                </svg></button>
                <button on:click={feedback('diagnosis',-1)} ><svg>
                    <use href="/sprite.svg#thumbs-down"></use>
                </svg></button>
            </div>
        </div>
        <ul>
        {#each response.diagnosisList as {name: diagnosis, basis, probability}, index}
            <li class:selected={selection['diagnosisList'] == index}>
                <button on:click={() => selectItem('diagnosisList', index)}>
                    <h4>{diagnosis} ({probability*100}%)</h4>
                    <div class="progress">
                        <div style="width: {probability*100}%"></div>
                    </div>
                <div>{basis}</div>
                </button>
            </li>
        {/each}
        </ul>   
    </div>
    <div>
        <div class="section-title">
            <svg class="section-icon">
                <use href="/sprite.svg#report.activity"></use>
            </svg>
            <h3>Counter meassures:</h3>
            
            <div class="feedback">
                <button on:click={feedback('measure',1)} ><svg>
                    <use href="/sprite.svg#thumbs-up"></use>
                </svg></button>
                <button on:click={feedback('measure',-1)} ><svg>
                    <use href="/sprite.svg#thumbs-down"></use>
                </svg></button>
            </div>
        </div>
        <ul>
        {#each response.counterMeassures as counterMeassure, index}
            <li class:selected={selection['counterMeassures'] == index}><button on:click={() => selectItem('counterMeassures', index)}>{counterMeassure}</button></li>
        {/each}
        </ul>

    </div>
</div>
<div class="suggestions -right">
    <div>
        <div class="section-title">
            <svg class="section-icon">
                <use href="/sprite.svg#report.exam"></use>
            </svg>
            <h3>Follow up:</h3>
            <div class="feedback">
                <button on:click={feedback('follow_up',1)} ><svg>
                    <use href="/sprite.svg#thumbs-up"></use>
                </svg></button>
                <button on:click={feedback('follow_up',-1)} ><svg>
                    <use href="/sprite.svg#thumbs-down"></use>
                </svg></button>
            </div>
        </div>
        <ul>
        {#each response.follow_up as {type, name, reason}, index}
            <li class:selected={selection['follow_up'] == index}>
                <button on:click={() => selectItem('follow_up', index)}>
                <div class="section-title">

                    <h4>{name}</h4>
                {#if type == 'test'}
                    <svg>
                        <use href="/sprite.svg#event-CHECKUP"></use>
                    </svg>
                {:else if type == 'specialist'}
                    <svg>
                        <use href="/sprite.svg#event-MEDICAL_APPOINTMENT"></use>
                    </svg>
                {/if}
                 
                </div>
                <p>{reason}</p>
                </button>
            </li>
        {/each}
        </ul>
    </div>
    <div>
        <div class="section-title">
            <svg class="section-icon">
                <use href="/sprite.svg#report.medication"></use>
            </svg>
            <h3>Prescription recommendation:</h3>

            <div class="feedback">
                <button on:click={feedback('medication',1)} ><svg>
                    <use href="/sprite.svg#thumbs-up"></use>
                </svg></button>
                <button on:click={feedback('medication',-1)} ><svg>
                    <use href="/sprite.svg#thumbs-down"></use>
                </svg></button>
            </div>
        </div>
        <ul>
            {#each response.medication as {name, dosage, days, days_of_week, time_of_day}, index}
                <li class:selected={selection['medication'] == index}>
                    <button on:click={() => selectItem('medication', index)}>
                    <div class="section-title">
                        <h4>{name} {dosage}mg</h4>
                        <svg>
                            <use href="/sprite.svg#form-capsule"></use>
                        </svg>
                    </div>
                    <p>{days} - {days_of_week.join(',')} - {time_of_day}</p>
                    </button>
                </li>
            {/each}
        </ul>

    </div>
</div>
{:else}
<div class="suggestions -left">
    
</div>

<div class="suggestions -right">
    
</div>


{/if}

</div>


<div class="footer">
    <h3>Warning!</h3>
    This is a prototype of a medical assistant. The information provided is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read on this website.
</div>
<style>

    .layout {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        padding: 1rem;
    }

    button {
        border: none;
        padding: 0;
        margin: 0;
    }
    .input {
        height: 100%;
        width: 45%;
        min-width: 500px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        order: 2;
    }

    .speak {
        width: 40vh;
        height: 40vh;
        overflow: hidden;
        cursor: pointer;
        margin: 2rem;
    }
    .speak :global(button) {
        position: relative;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        border-radius: 100%;
        border: 0;
        background-color: transparent;
    }
    .speak .doctor {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: calc(100% - 60px);
        height: calc(100% - 60px);
        margin: 0 auto;
        display: block;
        border-radius: 100%;
        background-color: #FFF;
        border: 2px solid #0094fe;
        box-shadow: 0 8px 10px 3px rgba(0, 0, 0, .5);
    }
    .speak .button {
        position: absolute;
        top: 60%;
        left: calc(50% - 3rem);
        transform: scale(1);
        width: 6rem;
        height: 6rem;
        display: flex;
        align-items: center;
        padding: 0;
        justify-content: center;
        border-radius: 100%;
        background-color: #0094fe;
        box-shadow: 0 8px 10px 3px rgba(0, 0, 0, .5);
        color: #FFF;
        font-size: 1.5rem;
        font-weight: bold;
        cursor: pointer;
        transition: transform .3s, box-shadow .3s;
    }
    .speak .button.stop {
        background-color: #f00;
    }
    .speak:hover .button {
        transform: scale(1.3);
        box-shadow: 0 10px 15px 7px rgba(0, 0, 0, .8);
    }

    .speak .button svg {
        width: 3rem;
        height: 3rem;
        fill: #FFF;
    }

    form {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;
    }

    .button {
        background-color: #0094fe;
        color: #FFF;
        border: none;
        padding: .5rem 1rem;
        margin: 0;
        font-size: 1.5rem;
        border-radius: .6rem;
    }
    .button:disabled {
        background-color: #ddd;
        color: #666;
        opacity: .6;
    }

    .input :global(.symptoms) {
        width: 100%;
        max-width: 600px;
        margin: .5rem auto;
        display: block;
        padding: .8rem 0;
        border: 0;
        border-bottom: 1px solid #0094fe;
        font-family: inherit;
        font-size: 1rem;
    }
    
    .suggestions {
        width: 33%;
        font-size: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        max-width: 600px;
    }

    .section-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    }
    .section-title h3 {
        flex-grow: 1;
    }
    .section-icon {
        width: 4rem;
        height: 4rem;
        fill: #0094fe;
    }
    .feedback {
        display: flex;
        gap: 1px;
        justify-content: center;
    }

    .feedback > button{
        background-color: var(--color-primary);
        color: #FFF;
        border: none;
        padding: .5rem;
        margin: 0;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #EEE;
        fill: #499cfc;
    }
    .feedback > button:first-child {
        border-top-left-radius: 1rem;
        border-bottom-left-radius: 1rem;
    }
    .feedback > button:last-child {
        border-top-right-radius: 1rem;
        border-bottom-right-radius: 1rem;
        
    }
    .feedback > button svg {
        width: 1rem;
        height: 1rem;


    }
    .feedback > button:hover {
        background-color: #499cfc;
        fill: #FFF;
    }

    .suggestions.-left {
        order: 1;
    }
    .suggestions.-right {
        order: 3;
    }
    .response {
        width: 100%;
        font-size: 1rem;
    }
    ul {
        list-style: none;
        padding: 0;
    }
    ul li {
        margin: 0;
        margin-bottom: 1px;
        background-color: #eeee;
    }
    ul li > button {
        width: 100%;
        height: 100%;
        padding: .5rem;
        background-color: transparent;
    }
    ul li.selected {
        background-color: #7cbbff;
    }
    ul li svg {
        width: 2rem;
        height: 2rem;
        fill: #0094fe;
        margin-right: .5rem;
    }
    h4 {
        margin: .6rem 0;
    }
    .progress
    {
        width: 100%;
        height: .2rem;
        background-color: #ddd;
    }
    .progress div {
        height: 100%;
        background-color: #0094fe;
    }
    .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 1rem;
        background-color: #f0f0f0;
        color: #F00;
        font-size: .8rem;
        text-align: center;
    }
</style>