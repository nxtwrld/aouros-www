<script lang="ts">
    import { type Profile, SexEnum } from '$slib/med/types.d';
    import { profiles } from '$slib/med/profiles';
    import Profiles from '$scomponents/profile/Profiles.svelte';
    import shortcuts from '$slib/shortcuts';
    import { onMount } from 'svelte';
    import Select from '$components/forms/Select.svelte';
    import { goto } from '$app/navigation';
    
    
    const commands = [
        {
            command: 'view',
            path: '/med/p/[UID]/'
        },
        {
            command: 'session',
            path: '/med/p/[UID]/session'
        },
        {
            command: 'history',
            path: '/med/p/[UID]/history'
        }
    ];
    
    let results: Profile[] = [];
    let inputValue: string = '';
    let inputElement: HTMLInputElement;
    
    let selectedResult: number = -1;
    let selectedCommand: number = -1;

    $: {
        search(inputValue);
    }

    function search (str: string = '') {
        console.log(str);
        selectedResult = -1;
        selectedCommand = -1;
        if (str === '') {
            results = [];
            return;
        }
        results = $profiles.filter((p: Profile) => {
            return p.name.toLowerCase().includes(str.toLowerCase());
        });
        if (results.length > 0) {
            selectedResult = 0;
        }
    }
    let isSearchOpen: boolean = false;
    let blurTimer: ReturnType<typeof setTimeout>;

    function showSearch() {
        isSearchOpen = true;
        setTimeout(() => inputElement.focus(), 100);

    }   
    function hideSearch() {
        isSearchOpen = false;
        inputElement.blur();
        inputValue = '';
        results = [];
        selectedCommand = -1;
        selectedResult = -1;
    }

    function handleKeyDown(e: KeyboardEvent) {
        console.log(e.code);
        if (e.code === 'Escape') {
            hideSearch();
        }
        if (e.code === 'Tab') {
            pressTab();
            return false;
        }
        if (e.code === 'ArrowDown') {
            selectedResult++;
            pressTab();
        }
        if (e.code === 'ArrowUp') {
            selectedResult--;
            pressTab();
        }
        if (e.code === 'Enter') {
            if (results[selectedResult]) {
                if (selectedCommand === -1) selectedCommand = 0;
                goto(commands[selectedCommand].path.replace('[UID]', results[selectedResult].uid));

                hideSearch();
            }
        }
    }

    function pressTab () {
        inputElement.focus()
            if (results[selectedResult]) {
                inputValue = results[selectedResult].name;

                // place carrer at the end of the input
                setTimeout(() => {
                    if (selectedCommand + 1 <= commands.length -1) selectedCommand++;
                    else selectedCommand = 0;
                    focusInput();
                }, 10);
            }
    }


    function focusInput() {
        inputElement.focus()
        inputElement.setSelectionRange(inputValue.length, inputValue.length);
        console.log(selectedCommand);

    }

    function blurredInput() {
        blurTimer = setTimeout(() => {
            hideSearch();
        }, 200);
    }

    function focusedInput() {
        clearTimeout(blurTimer);
    }

    onMount(() => {

        const off = [
            shortcuts.on('find', showSearch),
            shortcuts.on('KeyF', showSearch),
            shortcuts.on('Escape', hideSearch)
        ]

        return () => {
            off.forEach(f => f());
        }
    });
</script>

<div class="search-panel" class:-open={isSearchOpen }>
    <div class="search-input-box">
        <div class="hint">
            <span class="value">{inputValue}</span>
            {#if commands[selectedCommand]}
                <span class="command">&nbsp; &gt;&gt; {commands[selectedCommand].command}</span>
            {/if}
        </div>
        <input type="search" 
            placeholder="Search profiles"
            bind:this={inputElement} 
            bind:value={inputValue} 
            on:blur={blurredInput}
            on:focus={focusedInput}
            on:keydown={handleKeyDown} />
        <input type="text" class="secondary"/>
    </div>
    {#if results.length == 0 && inputValue.length > 0}
        <div class="search-results-empty">
                <div>No results</div>
        </div>
    {:else if results.length > 0}
    <div class="search-results">
        {#each results as result, i}
            <div class="search-result" class:-selected={i === selectedResult}>
                 <div class="search-result-name">{result.name}</div>
                <div class="search-result-id">{result.uid}</div>
            </div>
        {/each}
    </div> 
    {/if}




</div>


<style>
    .search-panel {
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        z-index: 100000;
        display: flex;
        flex-direction: column;
        align-items: center;
        max-height: 0;
        transition: max-height .3s, box-shadow .6s;
        overflow: hidden;
        box-shadow: 0 0 0 0 var(--color-black);
    }
    .search-panel.-open {

        max-height: 100%;
        box-shadow: 0 2rem 2rem -1rem var(--color-black);
    }
    .search-input-box {
        position: relative;
        width: 100%;
        display: flex;
        justify-content: center;
        background-color: var(--color-white);
        height: var(--toolbar-height);
        overflow: hidden;
    }
    .search-input-box input {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        padding: .5rem;
        font-size: 1.5rem;
        background-color: transparent;
        outline: 0;
        border: none;
    }
    .search-input-box .hint {
        align-items: center;
        display: flex !important;
        unicode-bidi: normal;
        width: 100%;
        height: 100%;
        padding: .5rem;
        font-size: 1.5rem;
    }
    .search-input-box .hint .value {
        color: transparent;
    }
    .search-input-box .hint .value-rest {
        color: var(--color-gray-500);
    }
    .search-input-box .hint .command {
        color: var(--color-interactivity);
        font-weight: 700;
    }

    .search-input-box input.secondary {
        position: absolute;
        left: 100%;
        top: 0;
    }
    .search-results-empty {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 25vh;
        background-color: var(--color-gray-300);
        font-size: 2rem;
    }
    .search-results {
        display: flex;
        flex-direction: column;
        gap: .5rem;
        width: 100%;
        background-color: var(--color-gray-300);
    }

    .search-result {
        display: flex;
        justify-content: space-between;
        padding: 1rem;
        background-color: var(--color-gray-200);
        cursor: pointer;
    }
    .search-result.-selected {
        background-color: var(--color-interactivity);
        color: var(--color-interactivity-text);
    }
</style>