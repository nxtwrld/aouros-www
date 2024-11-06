

<div class="loader"></div>

<style>

.loader {
    height: 100%;
    aspect-ratio: 1.5;
    --c:no-repeat linear-gradient(var(--color) 0 0);
    background: var(--c), var(--c), var(--c), var(--c);
    background-size: 33.4% 50%;
    animation: l6 2s infinite linear;
}
@keyframes l6 {
    0%    {background-position:0 0,50% 0,0 100%,50% 100%}
    12.5% {background-position:0 0,100% 0,0 100%,50% 100%}
    25%   {background-position:0 0,100% 0,0 100%,50% 0}
    37.5% {background-position:0 0,100% 0,50% 100%,50% 0}
    50%   {background-position:0 100%,100% 0,50% 100%,50% 0}
    62.5% {background-position:0 100%,100% 0,50% 100%,0 0}
    75%   {background-position:0 100%,100% 100%,50% 100%,0 0}
    87.5% {background-position:0 100%,100% 100%,50% 0,0 0}
    100%  {background-position:0 100%,50% 100%,50% 0,0 0}
}
</style>