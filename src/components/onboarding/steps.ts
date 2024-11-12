import Profile from '$components/onboarding/Profile.svelte';
import VCard from '$components/onboarding/VCard.svelte';
import Subscription from '$components/onboarding/Subscription.svelte';
import Privacy from '$components/onboarding/Privacy.svelte';
import Insurance from '$components/onboarding/Insurance.svelte';
import Health from '$components/onboarding/Health.svelte';
import AllSet from '$components/onboarding/AllSet.svelte';

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