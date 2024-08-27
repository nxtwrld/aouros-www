<script lang="ts">
    import { onMount } from "svelte";




let controller: AbortController;
let signal: AbortSignal;
let base64: string | undefined = undefined;


function loadPhoto(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            base64 = e.target.result;
            //status = Status.analyzing;
            //console.log('base64', base64);


        }
        reader.readAsDataURL(file);
    }

    async function analyze(){
        console.log('analyze')
        try {
            const r1 = await fetch('/v1/import/report' , {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body:  JSON.stringify({
                    images: [base64]
                }),
                signal
            });

            const result = await r1.json();
            console.log('result', result);
        } catch (e) {
            console.error(e);
            return;
        }
 
    }

    onMount(() => {
        console.log('onMount');
        controller = new AbortController();
        signal = controller.signal;

    });

    function start() {
        if (!base64) {
            console.error('No image loaded');
            return;
        }
        analyze();
    }

    function stop(){
        console.log('stop');
        controller.abort();
    }

</script>




<input type="file" on:change={loadPhoto} />
<button on:click={start}>START</button>

<button on:click={stop}>STOP</button>