<script lang="ts">
    import { run } from 'svelte/legacy';

    import { createEventDispatcher } from "svelte";
	import Input from '$components/forms/Input.svelte';
    import Textarea from '$components/forms/Textarea.svelte';
    //import ContactSelector from "$components/contact/ContactSelector.svelte";
	import type { VCard } from "$lib/contact/types.d";
    import type { Item } from "$lib/common.utils";
    import type { Link } from "$lib/common.types.d";
    import PublicKey from "$components/ui/PublicKey.svelte";
    import share from "$lib/share/store";
	import ProgressBar from "$components/ui/ProgressBar.svelte";
    //import createShares from "$lib/share/create";

    import ShareLinkedItems from "./ShareLinkedItems.svelte";

    const dispatch = createEventDispatcher();

    interface Props {
        items?: Link[];
    }

    let { items = [] }: Props = $props();

    let contact: VCard | undefined = $state(undefined);

    const lastStep: number = 5;
    let step: 0 | 1 | 2 | 3 | 4 | 5 = $state(0);

    let password: string = $state('');
    let message: string = $state('');
    let url: string = $state('https://mediqom.com/ext/adasdasdaqdqwdasdqwwde2342tf342fwqefqwefsac');

    let selectedRoute: number = $state(0);





    function getKeyDetails(contact: VCard) {
        // import spki key and get details
        //crypto.subtle.importKey('spki', contact.publicKey, false ,['encrypt']);
    }

    function checkIsNextAllowed(step: number, contact: VCard | undefined, password: string, uploadProgress: number = 0) {
        switch (step) {
            case 0:
                return false;
            case 1:
                return contact === undefined;
            case 2:
                return false;
            case 3:
                return password === '' && contact?.publicKey === '';
            case 4:
                return uploadProgress < 100;
            case 5:
                return false;
            default:
                return false;
        }
    }


    function getTitle(step: number) {
        switch (step) {
            case 0:
                return `Share ${items[0]?.title}`;
            case 1:
                return `Share with ${contact?.fn || '...'}`;
            case 2:
                return `Share with ${contact?.fn || '...'}- Review Items`;
            case 3:
                return `Share with ${contact?.fn || '...'}- Privacy`;
            case 4:
                return 'Uploading enrypted data...';
            case 5:
                return 'Share It!';
        }
    }


    function createMessagBody(items: Link[], url: string, password: string, message: string) {
        return {
            subject: 'Medical Records: ' + (items[0].title || 'Untitled'),
            body: message.replace(/\n\r?/g, '%0D%0A')

        }
    }



    let uploadProgress: number = 0;
    async function createShare() {
        
        next();
/*
        uploadProgress = 1;

        const upload = createShares(items, password, contact?.publicKey);
        
        upload.on('progress', (progress: number) => {
            uploadProgress = progress;
        });
        upload.on('done', (url: string) => {
            uploadProgress = 100;
            share.add({
                title: items[0]?.title || items[0]?.question || 'Untitled',
                contact: contact.uid,
                href: '/' + items[0].type + '/' + items[0]?.uid,
                url,
                password: password,
                publicKey: contact.publicKey,
                created: new Date().toISOString(),
                links: items

            });
            next();
        });
        */
        next();
    }

    function generatePassword() {
        password = Math.random().toString(36).slice(-10);
    }


    function next() {
        if (step < lastStep) step++;
    }
    function previous() {
        if (step > 0) step--;
        else dispatch('abort');
    }

    function setContact(event: any) {
        contact = event.detail;
        next();
    }

    function abort() {
        dispatch('abort');
    }
    run(() => {
        if (contact && contact.publicKey != '') {
            // TODO!!
            getKeyDetails(contact);
        }

        if (url != '' && password != '' && message == '') {

            message = `Dear ${contact?.fn || 'Sir/Madame'}, 
I would like to share my medical records with you. 
Please, use the following link to access them: ${url}  

Password: ${password}

Kindest regards, 
            `;
        }
    });
    let sharedMessage = $derived(createMessagBody(items, url, password, message));
    let slidesCount = $derived(lastStep + 1);
    let stepTitle = $derived(getTitle(step));
    let isNextAllowed = $derived(checkIsNextAllowed(step, contact, password, uploadProgress));
    let routes = $derived((contact) ? [...(contact.email || []).map(e => {
        return {
            ...e,
            type: 'email'
        };
    }), ... (contact.tel || []).map(e => {
        return {
            ...e,
            type: 'tel'
        };
    })] : [])
    let route = $derived(routes[selectedRoute]);
</script>

<h3 class="h3">{stepTitle}</h3>

{#if contact && step > 1}
    <p class="p">You are sharing with <strong>{contact.fn}</strong></p>
{/if}


<div class="steps">
    <div class="steps-canvas" style="width: {100*slidesCount}%;transform: translateX(-{100 / slidesCount * step}%)">

        <div class="step">
            <div class="step-contents">
                <p class="p">Sharing will create an encrypted store on our server for the selected medical record. The records can be accessed via generated link and password.</p>
            </div>
        </div>

        <div class="step">
            <div class="step-contents">
                <!--ContactSelector on:link={setContact} response="VCard" simplified={true} /-->
            </div>
        </div>

        <div class="step">
            <div class="step-contents">
                <ShareLinkedItems {items} />

            </div>
        </div>

        <div class="step">


            <div class="step-contents">
                {#if contact && contact.publicKey}
                <svg>
                    <use href="/sprite.svg#public-key" />
                </svg>
                    <p class="p">
                        Your records will be stored on our server encrypted. {contact.fn} has configured a Public Key 
                        and we will use it to encrypt the records. We will not be able to access your records.
                    </p>
                        <PublicKey value={contact.publicKey} />
                {:else}
                <svg>
                    <use href="/sprite.svg#encrypted-data" />
                </svg>
                <p class="p">You records will be stored on our server encrypted. You have to create a custom password,
                    that you will be able to share with your contact. We will not be able to access your records.
                </p>

                <div class="password-row">
                    <div>
                        <Input type="password" bind:value={password} placeholder="Password protect your record" label="Password" required copyable autocomplete="off" />
                    </div>
                    <div>
                        <button class="button" onclick={generatePassword}>Generate</button>
                    </div>
                </div>
                {/if}
            </div>
     
        </div>


        <div class="step">
            <div class="step-contents">

                <div class="centered">
                    <h4 class="h4">Encrypting keys and uploading data to the server</h4>
                    <div class="upload-progress">
                        <ProgressBar value={uploadProgress} />
                    </div>
                    <div>{uploadProgress}%</div>
                </div>
            </div>
        </div>


        <div class="step">

            <div class="step-contents">
            
                <p class="p">Please note, that the password is kept only in your app. You have to share it with your contact.</p>

                {#each routes as route, index}
                <div>
                    <Input type="radio" bind:group={selectedRoute} value={index} label={route.value} />
                </div>
                {/each}


                <Input type="text" bind:value={url} placeholder="URL" label="URL" readonly copyable />

                <Textarea bind:value={message} placeholder="Message" label="Message" />
            </div>
        </div>
    </div>
    <div class="buttons-row">
        
        <button class="button" onclick={previous}>
            {#if step == 0}
                Cancel
            {:else}
                Back
            {/if}
        </button>

        {#if step == lastStep}
            {#if route?.type == 'email'}
                <a href="mailto:{route.value}?subject={sharedMessage.subject}&body={sharedMessage.body}" class="button">Open email app</a>
            {:else if routes[selectedRoute].type == 'tel'}
                <a href="sms:{route.value}?body={sharedMessage.body}" class="button" >Open sms app</a>
            {/if}
            <button class="button -primary" onclick={abort}>Done</button>
        {:else if step == lastStep -2}
        <button class="button -primary" onclick={createShare} disabled={isNextAllowed}>Create Share</button>
        {:else}
            <button class="button -primary" onclick={next} disabled={isNextAllowed}>Next</button>
        {/if}
        
    </div>
</div>

<style>

    .steps {
        position: relative;
        width: 100%;
        overflow: hidden;
    }
    
    .steps-canvas {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;

        height: 100%;
        transition: transform 0.3s ease-in-out;
    }
    .step {
        width: 25%;
    }

    .step-contents {
        position: relative;
        width: 100%;
        height: 100%;
        max-height: 60vh;
        overflow: auto;
    }
    .password-row {
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        justify-content: stretch;
    }
    .password-row > div {
        flex-grow: 2;
    }
    .password-row > div:last-child {
        margin-left: var(--gap);
        flex-grow: 0;
    }

    .upload-progress {
        margin: 0 auto;
        width: 50%;
        height: 1rem;
        background-color: var(--color-shade);
        color: var(--color-primary);
        border-radius: var(--border-radius);
        overflow: hidden;
    }
    .centered {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
    }
</style>