import Profile from '$scomponents/onboarding/Profile.svelte';
import VCard from '$scomponents/onboarding/VCard.svelte';
import Subscription from '$scomponents/onboarding/Subscription.svelte';
import Privacy from '$scomponents/onboarding/Privacy.svelte';
import Insurance from '$scomponents/onboarding/Insurance.svelte';
import Health from '$scomponents/onboarding/Health.svelte';
import AllSet from '$scomponents/onboarding/AllSet.svelte';

export type Step = {
    description: string;
    dataset: string;
    component: any;
}


const steps: Step[] = [ 
    {
        description: "Basic information",
        dataset: "bio",
        component: Profile
    }, {
        description: "Subscription",
        dataset: "subscription",
        component: Subscription

    },{
        description: "Privacy",
        dataset: "privacy",
        component: Privacy
    }/*,{
        description: "Contact information",
        dataset: "vcard",
        component: VCard

    }, {
        description: "Insurance information",
        dataset: "insurance",
        component: Insurance

    }*//*,{
        description: "Health information",
        dataset: "health",
        component: Health
    } */,{
        description: "Allset",
        dataset: "privacy",
        component: AllSet
    }
];

export default steps