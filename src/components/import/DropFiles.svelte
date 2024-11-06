<script lang="ts">
    //import { ACCEPTED_FILES} from '$slib/files/CONFIG';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { files } from '$slib/files';
    import { fromEvent } from 'file-selector'; 
    

    let dragover: boolean = false;
    let dragTimer: any;
    let dropActive: boolean = true;


    function handleDragOver(event: DragEvent) {
        if (!dropActive) return;
        if (dragTimer) clearTimeout(dragTimer);
        event.preventDefault(); // Necessary to allow for a drop event
        dragover = true;
    }

    async function handleDrop(event: DragEvent) {
        if (!dropActive) return;
        dragover = false;
        if (!event.dataTransfer) return;
        event.preventDefault();

        const newFiles = await fromEvent(event) as File[];
        if (newFiles.length >  0) {
            console.log('Files dropped', newFiles, $files);
            files.set([ ...$files,  ...newFiles ]);
            goto('/med/import');
        }
        // Process the files

    }

    function handleDragEnd(event: DragEvent) {
        if (!dropActive) return;
        if (dragTimer) clearTimeout(dragTimer);
        dragTimer = setTimeout(() => {
            dragover = false;
        }, 300);
    }



</script>


    <div class="droparea" on:drop={handleDrop} on:dragover={handleDragOver} on:dragleave={handleDragEnd} on:dragend={handleDragEnd}>
        <slot />
        {#if dragover}
        <div class="drag-active overlay" transition:fade>
            <p>Drop files here</p>
        </div>

    {/if}
    </div>



<style>

    .droparea {

        height: 100%;
        width: 100%;
    }


</style>