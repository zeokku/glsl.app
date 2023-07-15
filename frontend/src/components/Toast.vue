<template lang="pug">
.toast-wrap 
    .toast
        //- CheckCircle
        CheckCircleFill
        //- .App__font-shade
        span {{ message }}
</template>


<script setup lang="ts">
import CheckCircle from './icons/check-circle.vue';
import CheckCircleFill from './icons/check-circle-fill.vue';

defineProps<{
    message: string
}>()

</script>

<style module lang="less">
.toast-wrap {
    position: fixed;
    bottom: 0;

    width: 100%;

    padding-bottom: 2rem;
    box-sizing: border-box;

    display: flex;
    justify-content: center;

    transition: transform 300ms ease-out;
}

@keyframes toast {
    0% {
        transform: translateY(2em) scale(0.95);

        @bf: blur(3px) opacity(0);
        -webkit-backdrop-filter: @bf;
        backdrop-filter: @bf;

        opacity: 0;
    }

    25%,
    75% {
        transform: translateY(0) scale(1);

        @bf: blur(3px) opacity(1);
        -webkit-backdrop-filter: @bf;
        backdrop-filter: @bf;

        opacity: 1;
    }

    100% {

        @bf: blur(3px) opacity(1);
        -webkit-backdrop-filter: @bf;
        backdrop-filter: @bf;

        opacity: 0;
    }
}

.toast {
    display: flex;
    align-items: center;
    gap: 0.5em;

    cursor: default;

    font-size: 1.2rem;
    // font-weight: bold;
    text-transform: uppercase;

    border-radius: 1.2rem;
    padding: 1.5rem 1rem;

    // @note we don't use var(--glow) because it's transparent and it blends with border color which looks weird
    // @note return glow since bg is solid now
    border: solid 2px var(--glow);

    color: white;

    background: rgba(40, 167, 69, 0.8);
    // background: linear-gradient(to bottom, transparent, green);

    svg {
        height: 1.25em;
        width: 1.25em;
    }

    animation: toast 1s ease-out;

    will-change: transform;
}
</style>