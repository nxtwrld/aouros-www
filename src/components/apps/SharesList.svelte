<script lang="ts">
	import type { ShareRecord } from "$lib/share/types.d";
    import store from '$lib/share/store';
    import { date } from '$lib/datetime';
    import { confirm} from '$lib/ui';
    import contacts from '$lib/contact/store';
	import ListSwipe from "$components/ui/ListSwipe.svelte";

    interface Props {
        shares?: ShareRecord[];
    }

    let { shares = [] }: Props = $props();

    async function removeShare(share: ShareRecord) {
        let contact = contacts.get(share.contact);
        if (await confirm(`This will remove the shared item and ${contact.fn} will no longer be able to access it.`)) 
            store.remove(share.uid);
    }
</script>


<ul class="list-items">
    {#each shares as share}
        <li>
            <ListSwipe>
            <a href={share.href} class="a">
                {share.title}
                (on {date(share.created)})
                Items linked: {share.links.length}
            </a>
            <div class="tools">
                <button class="tool -negative" onclick={() => removeShare(share)}>
                    <svg>
                        <use href="/sprite.svg#remove" />
                    </svg>
                </button>
            </div>
            </ListSwipe>
        </li>
    {/each}
</ul>