<script lang="ts">
    import './styles.css';
	import Navbar from '$componentsLocal/navbar.svelte';
</script>
<header>
    <div class="page">
        <img src="/icon.svg" alt="aouros logo" />
        <img src="/icon.text.svg" alt="aouros" />
        <!--h1>aouros</h1-->
        <div class="spacer"></div>
        <Navbar />
    </div>
</header>

    <slot />

<footer>
    <div class="page">
        &copy; 2023 aouros
    </div>
</footer>

<style>
    header {
        background-color: var(--color-primary);
        padding: 0;
        border-bottom: 1px solid var(--color-primary-dark);
        box-shadow: 0 0 1rem rgba(0, 0, 0, .25);
        position: fixed;
        top: 0;
        z-index: 10;
        width: 100vw;
        height: 4rem;
    }
    header .page {
        display: flex;
        align-items: center;
    }
    header h1 {
        color: #FFF;
        margin: 0;
    }
    header img {
        height: 4rem;
        margin-right: 1rem;
        width: auto;
    }

    footer {
        position: relative;
        margin-top: 3rem;
        background-color: #FFF;
        border-top: 1px solid var(--color-primary-dark);
        padding-top: 1rem;
        padding-bottom: 4rem;
        z-index: 9;
    }


    .spacer {
        flex-grow: 1;
    }
    nav {
        display: flex;
        flex-direction: row;
        height: 4rem;
    }
    nav a {
        display: inline-block;
        padding: .5rem 1rem;
        height: 100%;
        line-height: 2.5rem;
        color: var(--color-white);
        text-decoration: none;
        font-size: 1.25rem;
        margin: 0 .5rem;
        border-top: .4rem solid transparent;
    }
    nav a.active {
        border-top: .4rem solid var(--color-white);
    }
</style>