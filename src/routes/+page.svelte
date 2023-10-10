
<div class="theme1">
    <h3>Empower Your Health Journey with Aouros</h3>
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

    <div class="segment">
        <div class="page">
            <h3>Unified Medical Data At Your Fingertips</h3>
            <p>Tired of sifting through scattered medical reports? With Aouros, you have complete control. Consolidate, view, and manage all your health data in one secure place. X-Rays, MRIs, lab results or simple reports are seamlessly organized and mapped for quick reference.</p>
        </div>
    </div>
    <div class="segment">
        <div class="page">
            <h3>Seamless Data Sharing</h3>
            <p>Consult with specialists, get a second opinion, or change doctors with ease. Share your comprehensive medical history with a click, ensuring every healthcare professional has the full picture.</p>
        </div>
    </div>
    <div class="segment">
        <div class="page">
            <h3>Your Privacy is Our Priority</h3>
        <p>Your health data is sensitive. That's why we've built Aouros with top-tier security measures. Plus, our AI-powered insights are designed to work privately, safeguarding your information at every step.</p>
        </div>
    </div>
    <div class="segment">
        <div class="page">
            <h3>AI-Powered Insights For Better Health</h3>
            <p>Dive deep into your health data with AI-driven insights. Discover early warning signs, understand your health better, and get tailored recommendations to elevate your well-being.</p>
        </div>
    </div>
    <div class="segment">
        <div class="page">
            <h3>Healthcare Collaboration Made Easy</h3>
            <p>Open the doors to collaborative care. Connect with healthcare professionals and ensure they work together using a single, unified data source for your best health outcome.</p>
        </div>
    </div>
    <div class="segment">
        <div class="page">
            <h3>Simplify Your Health Experience</h3>
            <p>Say goodbye to cumbersome administrative tasks and lengthy waits for records. Aouros is here to streamline your healthcare journey, giving you more time to focus on what truly matters: your health.</p>
        </div>
    </div>
</div>
<div class="page">
    <h4>Join the revolution in patient-centric healthcare. Dive into Aouros and experience the future of health management!</h4>
    <button disabled>Coming soon...</button>

</div>



<style>

.theme1 {
        height: 30vh;
        background-image: url('/theme1.jpg');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        text-align: center;
        position: relative;
        margin-bottom: 3rem;
    }
    .theme1 h3 {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--color-primary);
        text-shadow: 1px 1px 0px var(--color-primary-dark);
        font-size: 2.5rem;
        margin: 0;
        font-family: 'Baloo Thambi 2', cursive;

    }


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
    .segment {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        min-height: 20vh;
        padding: 1rem;
        width: 110%;
        overflow: hidden;
    }

    .segment h3 {
        font-size: 2rem;
        font-family: 'Baloo Thambi 2', cursive;
    }
    .segment:nth-child(odd) {
        background-color: var(--color-primary-lighter);
        transform: rotate(-2deg) translateX(-5%);
    }
    .segment:nth-child(odd) .page {
        transform: rotate(2deg);
        padding: 0 3rem;
    }
    .segment:nth-child(odd) .page > * {
        margin-right: 50%;
    }

    .segment:nth-child(even) {
        text-align: right;
        transform: translateX(-5%);
    }

    .segment:nth-child(even) .page > * {
        margin-left: 50%;
        padding: 0 3rem;
    }
</style>