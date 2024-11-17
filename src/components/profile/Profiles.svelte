<script lang="ts">
    import { type Profile } from '$lib/med/types.d';
    import { getAge } from '$lib/med/datetime';
    import { goto } from '$app/navigation';
    import { profiles, removeLinkedProfile } from '$lib/med/profiles/';
    import user from '$lib/user';
    import { addDocument } from '$lib/med/documents';
    import { DocumentType } from '$lib/med/documents/types.d';
    import { t } from '$lib/i18n';
    const ROOT_PATH = '/med/p/';

    function openProfile(profile: Profile) {
        
        if(profile.status == 'approved') goto(ROOT_PATH + profile.id);
    }

    async function deleteUser(id: string) {
        try {
            await removeLinkedProfile(id);
            //await profiles.update();
        } catch (e) {
            console.error(e);
        }
    }

    let tempData = {
        "title": "Health Profile",
        "tags": [
            "health",
            "profile"
        ],
    "birthDate":  "1975-12-31",
    "biologicalSex":  "male",
    "bloodType": "AB-",
    "weight": {
        "date": "2024-11-11T10:51:28.042Z",
        "weight": "84",
        "history": [
            {
                "date": "2020-10-11T10:51:28.042Z",
                "weight": "89"
            }
        ]
    },
    "height": {
        "date": "2024-11-11T10:51:28.042Z",
        "height": 183,
        "history": [
            {
                "date": "2020-10-11T10:51:28.042Z",
                "height": 183
            }
        ]
    },
    "bloodPressure": {
        "date": "2024-11-11T10:51:28.042Z",
        "systolic": 120,
        "diastolic": 80,
        "history": [
            {
                "date": "2020-10-11T10:51:28.042Z",
                "systolic": 120,
                "diastolic": 80
            }
        ]
    },
}

/*{
       "title": "Profile",
    "tags": [
        "profile",
        "contact"
    ],
    "insurance": {
        "provider": "111",
        "number": "7512310201"
    },
    "vcard": {
        "n": {
            "honorificPrefixes": "",
            "givenName": "Ondřej",
            "familyName": "Mašek",
            "honorificSufixes": ""
        },
        "org": "",
        "title": "",
        "email": [
            {
                "type": "work",
                "value": ""
            }
        ],
        "tel": [
            {
                "type": "work",
                "value": "+420773594110"
            }
        ],
        "adr": [
            {
                "type": "work",
                "street": "Na strzi 1195/57",
                "city": "",
                "state": "",
                "postalCode": "140 00"
            }
        ],
        "note": ""
    }
}*/;
    function addProfileData() {
        if (tempData) {
            //console.log(tempData);
            addDocument({
                type: DocumentType.health,
                content: tempData//,
                //user_id: 'e799dca2-13e6-4568-b990-aed7ac2875db'
            });
        }
    }

    function requestAccess(id: string) {
        console.log('requesting access', id);
        alert('Request access sent');
    }

</script>

<h2 class="h2">{ $t('app.headings.profiles') }</h2>

<table class="table-list">
    <thead>
    <tr>
        <th>{ $t('app.profile.name') }</th>
        <th>{ $t('app.profile.age') }</th>
        <th>{ $t('app.profile.date-of-birth') }</th>
        <th>{ $t('app.profile.phone') }</th>
        <th></th>
    </tr>
</thead>
<tbody>
{#each $profiles as profile}
    <tr class="table-row -click -{profile.status}" on:click={() => openProfile(profile)}>
        <td data-label="Name" class="title">{profile.fullName}</td>
        <td data-label="Age" class="age">{#if profile.birthDate}{getAge(profile.birthDate)}{/if}</td>
        <td data-label="Birth date" class="dob">{#if profile.birthDate}{profile.birthDate}{/if}</td>
        <td data-label="Phone" class="tel">
            {#if profile.vcard?.tel?.[0]?.value}
            <a href="tel:{profile.vcard?.tel?.[0]?.value}" on:click|stopPropagation>{profile.vcard?.tel?.[0]?.value}</a>
            {/if}
        </td>
        <td class="actions">
            <div class="table-actions">
                {#if profile.status == 'approved'}
                <a href={ROOT_PATH + profile.id} class="button">{ $t('app.profiles.open') }</a>
                {:else}
                <button class="button -request" on:click|stopPropagation={() => requestAccess(profile.id)}>{ $t('app.profiles.request-access') }</button>
                {/if}
                {#if profile.id != $user.id}
                <button on:click|stopPropagation={() => deleteUser(profile.id)} class="button -danger">{ $t('app.profiles.delete') }</button>
                {/if}
            </div>
        </td>
    </tr>
{/each}
</tbody>
</table>



<!--button on:click={addProfileData}>Add Profile</button-->

<style> 

    .table-list {
        width: 100%;
        border-collapse: collapse;
        --color-border: var(--color-gray-500);  
    }
    .table-list tr.-click > * {
        cursor: pointer;
    }

    .table-list th,
    .table-list td {
        text-align: left;
        padding: 1rem;
        border-bottom: .1rem solid var(--color-border);
    }

    .table-list th {
        background-color: var(--color-highlight);
        color: var(--color-highlight-text);
        white-space: nowrap;
        font-weight: 800;
    }
    .table-list tr:nth-child(even),
    .table-list tr:nth-child(even) td {
        background-color: var(--color-gray-400);
    }
    .table-list tr:hover {
        position: relative;
        box-shadow: 0 .1rem .2rem var(--color-border);
        z-index: 10;
    }
    .table-list tr:hover td {
        background-color: var(--color-white);
    }

    .table-list .title {
        font-weight: 800;
        width: 50%;
    }
    .table-list .dob {
        white-space: nowrap;
    }
    .-request td {
        background-color: var(--color-gray-500) !important;
        cursor: not-allowed !important;
    }
    .-denied {
        color: var(--color-negative);
    }

    .table-list tr .table-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }

    @media (max-width: 768px) {
        .table-list {
            display: block;
        }

        .table-list thead {
            display: none;
        }
        .table-list tr {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: stretch;
            border-bottom: 1px solid var(--color-border);
        }
        .table-list tr td::before {
            content: attr(data-label);
            float: left;
            font-size: .7rem;
            width: 20%;
            text-transform: uppercase;
            margin-right: 1rem;
        }

        .table-list tr td {
            display: block;
            padding: 1rem;
            border: none;
            padding: .5rem .5rem;
            width: 100%;
        }
        .table-list .age {
         display: none;
        }
        .table-list .title {
            width: 100%;
            font-weight: 800;
        }
        .table-list .actions {
            width: 100%;
        }
    }
</style>