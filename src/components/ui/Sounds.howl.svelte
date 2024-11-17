<script lang="ts" context="module">

    export const sounds: {
        [soundName: string]: any;
    } = {
    
    }
</script>
<script lang="ts">
    import { state } from '$lib/user/currentUser';
    import { onMount } from 'svelte';
    import {Howl, Howler} from 'howler';

    type SoundFile = {
        file: string;
    }

    const soundFiles: {
        [soundName: string]: SoundFile;

    } = {
        xp: {
            file: "/sounds/xp.mp3"
        },
        model: {
            file: "/sounds/model.mp3"
        },
        focus: {
            file: "/sounds/focus.mp3"
        },
        accept: {
            file: "/sounds/accept.mp3"
        }
    }

    //let audio : HTMLAudioElement;
    let src: string = "/sounds/xp.mp3";
    class Sound {
        private sound: SoundFile;
        //private ctx: AudioContext;
        //private source: AudioBufferSourceNode | undefined;
        howl: Howl;
        constructor(file: SoundFile) {
            this.sound = file;
            this.howl = new Howl({
                src: [file.file],
                volume: 0.5,
                sprite: {
                    all: [0, 3000]
                    
                }
            });
        }
        play() {
            if ($state.soundEffects) {
                this.howl.play('all');
            }
        }
    }


    onMount(() => {
        Howler.volume(0.3);
        Howler.mobileAutoEnable = true;
        for (let soundName in soundFiles) {
            sounds[soundName] = new Sound(soundFiles[soundName]);
        }
    });



</script>
