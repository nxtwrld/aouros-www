
<script lang="ts">
    import Segment from '$components/segment.svelte';

</script>



<div class="page centered">
    <h1>Empower Your Health Journey with Aouros</h1>
</div>

<section class="blocks page">
    <div>
        <img src="/data-collection.svg" alt="" />
        <h3>Unified Medical Data Control</h3>
        <p>Experience the power of consolidated health data with Aouros. Say goodbye to scattered records and ensure your care is always informed and optimized.</p>
    </div>
    <div>
        <img src="/personal-data.svg" alt="" />
        <h3>Privacy and Security</h3>
        <p>Your health data deserves top-tier protection. With Aouros, rest easy knowing your information is secure and your privacy always respected.</p>
    </div>
    <div>
        <img src="/microchip.svg" alt="" />
         <h3>AI-Powered Insights</h3>
        <p>Unlock the future of personalized health with AI-driven insights from Aouros. Dive into tailored recommendations and early health indicators, all crafted uniquely for you.</p>
    </div>
</section>


<div class="segments">

    <Segment>
            <h3>Unified Medical Data At Your Fingertips</h3>
            <p>Tired of sifting through scattered medical reports? With Aouros, you have complete control. Consolidate, view, and manage all your health data in one secure place. X-Rays, MRIs, lab results or simple reports are seamlessly organized and mapped for quick reference.</p>
            <img src="/app.jpg" alt="EHR" />
    </Segment>
    <Segment>
            <h3>Seamless Data Sharing</h3>
            <p>Consult with specialists, get a second opinion, or change doctors with ease. Share your comprehensive medical history with a click, ensuring every healthcare professional has the full picture.</p>
            <img src="/sharing.jpg" alt="Sharing" />
    </Segment>
    <Segment>
            <h3>Your Privacy is Our Priority</h3>
        <p>Your health data is sensitive. That's why we've built Aouros with top-tier security measures. Plus, our AI-powered insights are designed to work privately, safeguarding your information at every step.</p>
        <img src="/privacy.jpg" alt="Privacy" />
    </Segment>
    <Segment>
            <h3>AI-Powered Insights For Better Health</h3>
            <p>Dive deep into your health data with AI-driven insights. Discover early warning signs, understand your health better, and get tailored recommendations to elevate your well-being.</p>
            <img src="/insights.jpg" alt="Privacy" />
    </Segment>
    <Segment>
            <h3>Healthcare Collaboration Made Easy</h3>
            <p>Open the doors to collaborative care. Connect with healthcare professionals and ensure they work together using a single, unified data source for your best health outcome.</p>
            <img src="/research.jpg" alt="Privacy" />
    </Segment>
    <Segment>
            <h3>Simplify Your Health Experience</h3>
            <p>Say goodbye to cumbersome administrative tasks and lengthy waits for records. Aouros is here to streamline your healthcare journey, giving you more time to focus on what truly matters: your health.</p>
    </Segment>
</div>
<div class="page centered">
    <h4 class="centered">Join the revolution in patient-centric healthcare. Dive into Aouros and experience the future of health management!</h4>
    <a href="/access" class="button">Request beta access</a>

</div>



<style>


    .blocks {
        position: relative;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        z-index: 1;
    }

    .blocks > div {
        width: 30%;
        text-align: center;
        border-radius: 1rem;
        background-color: #FFF;
        padding: 1.3rem  1rem 1rem;
        box-shadow: 1px 1px 1rem rgba(0, 0, 0, .25);
    }

    @media (max-width: 800px) {
        .blocks {
            flex-direction: column;
        }
        .blocks > div {
            width: 100%;
            margin-bottom: 2rem;
        }
    }

    .blocks div img {
        width: auto;
        margin: 0 auto;
        height: 3rem;
    }
    .blocks div h3 {
        font-size: 1.4rem;
    }
    .blocks div p {
        font-size: 1rem;
        margin: 0;
    }
    .segments {
        display: flex;
        flex-direction: column;  
        margin-top: 2rem;  
    } 

</style>