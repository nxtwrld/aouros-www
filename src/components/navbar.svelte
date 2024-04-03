<script lang="ts">
    import { page, navigating } from '$app/stores';

    let menuOpen: boolean = false;
  
    function toggleMenu() {
      menuOpen = !menuOpen;
    }

    // hide menu on body mousedown
    function hideMenu () {
      if (menuOpen) {
        toggleMenu();
      }
    };

    // hide menu on navigation
    navigating.subscribe((navigating) => {
      if (navigating && menuOpen) {
        toggleMenu();
      }
    });

  </script>
  
  <svelte:window on:mousedown={hideMenu} />
  <div class="navbar">
    <nav on:mousedown|stopPropagation>
      <ul class="nav-links {menuOpen ? 'active' : ''}">
        <li><a href="/www" class:active={$page.route.id == '/'}>Home</a></li>
        <li><a href="/www/benefits" class:active={$page.route.id == '/benefits'}>Patients</a></li>
        <li><a href="/www/mds" class:active={$page.route.id == '/mds'}>MDs</a></li>
        <li><a href="/www/partners" class:active={$page.route.id == '/partners'}>Partners</a></li>
        <li><a href="/www/howweoperate" class:active={$page.route.id == '/howweoperate'}>How we operate</a></li>
        <!--li><a href="/team" class:active={$page.route.id == '/team'}>Team</a></li-->
        <li><a href="/www/contact" class:active={$page.route.id == '/contact'}>Contact</a></li>

      </ul>
    </nav>
    <button class="burger" on:click={toggleMenu}>
        <svg
          class="burger-icon"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="24" height="3" rx="1.5" fill="currentColor"></rect>
          <rect y="10" width="24" height="3" rx="1.5" fill="currentColor"></rect>
          <rect y="20" width="24" height="3" rx="1.5" fill="currentColor"></rect>
        </svg>
    </button>
</div>


    <style>
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #16d3dd;
          padding: 1rem;
        }
      
        ul {
          list-style-type: none;
          margin: 0;
          padding: 0;
        }
      
        .nav-links {
          display: flex;
          gap: 1rem;
        }
      
        li {
          display: inline;
        }
      
        a {
          text-decoration: none;
          color: inherit;
          padding: 0.5rem;
          border-radius: 4px;
          transition: background-color 0.3s;
        }
      
        a:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      
        .burger {
            display: none;
            cursor: pointer;
            background-color: transparent;
            color: #FFF;
            border: 0;
            padding: 0;
            margin: 0;
        }
      
        @media (max-width: 900px) {
          .nav-links {
            display: none;
          }
      
          .burger {
            display: block;
          }
      
          .nav-links.active {
            display: block;
            position: absolute;
            top: 4rem;
            right: 0rem;
            background-color: #16d3dd;
            padding: 1rem;
            border-radius: 5px;
          }
      
          li {
            display: block;
            margin: .5rem 0;
          }
        }
      </style>