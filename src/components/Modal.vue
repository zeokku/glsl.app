<template lang="pug">
teleport(to="body")
    //- does specifying type make it faster
    transition(name="fade-blur" :duration="1000" type="transition")
        .wrap(v-if="visible" @click="close" role="dialog" aria-modal="true")
            .window(ref="modal" @click.stop)
                button.close(@click="close")
                    //- &#x2715;
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg>
                //- @todo align-self: center for content kinda looks cool actually when content's width is limited
                slot
    </template>
    
<script lang="ts">
import type { InjectionKey } from 'vue'
export const CLOSE_MODAL: InjectionKey<() => {}> = Symbol();
</script>

<script lang="ts" setup>
import { useMouse } from "@/composition/useMouse";
import { updateElGlow } from "@/stylingUtils/updateGlow";
import { defineComponent, onUnmounted, provide, watch } from "vue";

const props = defineProps<{
    visible: boolean
}>();

const emit = defineEmits<{
    (e: 'close'): void
}>();


const close = () => emit('close')
provide(CLOSE_MODAL, close)


const onPressEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        if (props.visible)
            close();
    }
}

window.addEventListener('keydown', onPressEsc)

onUnmounted(() => {
    window.removeEventListener('keydown', onPressEsc)
})

const modal = $shallowRef<HTMLDivElement>();

watch(useMouse(), mouse => {
    if (!modal) return;

    updateElGlow(modal, mouse);
})
</script>
    
<style module lang="less">
@import "@/styles/utils.less";

.wrap {
    /* display: flex;
    flex-flow: column; */

    display: grid;
    justify-items: center;
    align-items: center;

    justify-content: center;
    // @note so this is the solution to take min height for content
    align-content: center;

    position: fixed;
    top: 0;

    width: 100%;
    height: 100%;


    padding: 3rem;

    @media screen and (max-width: 500px) {
        padding-inline: 1.5rem;
    }

    box-sizing: border-box;

    background-color: rgba(6, 6, 6, 0.3);

}

// @todo glowing border
.window {
    display: flex;
    flex-flow: column;

    // @note because of flex-grow it always expanded width to full available space
    // @todo idk
    /* flex-grow: 1; */

    cursor: revert;

    overflow: hidden;

    // @note define base dimensions for flex
    height: 100%;
    /* width: 100%; */
    width: max-content;

    max-width: 70rem;
    max-height: min(100%, 70rem);

    padding: 1.5rem;

    box-sizing: border-box;

    // size of the circle
    @sz: 30rem;
    // full size
    @fsz: (2 * @sz);

    @init: -@fsz;
    --mx: @init;
    --my: @init;

    background-color: rgba(var(--bg-rgb), 0.5);
    background-image: radial-gradient(circle, rgba(var(--glow-rgb), 0.05), transparent @sz);

    background-size: @fsz @fsz;
    background-repeat: no-repeat;
    background-position: calc(var(--mx) - @sz) calc(var(--my) - @sz);

    @filter: blur(10px) opacity(1);
    -webkit-backdrop-filter: @filter;
    backdrop-filter: @filter;

    border: var(--border) solid 2px;
    border-radius: 2rem;

    font-size: 1rem;

    a {
        // -webkit-link
        color: rgb(158, 158, 255);
    }
}


.close {
    align-self: flex-end;

    margin-bottom: 1em;

    font-weight: bold;

    cursor: pointer;

    // reset button
    appearance: none;
    padding: 0;
    border: 0;
    background: none;
    color: unset;

    color: rgba(var(--glow-rgb), 0.33);

    &:hover {
        color: rgba(var(--glow-rgb), 0.67);
    }

    &:active {
        color: rgba(var(--glow-rgb), 1);
    }

    svg {
        width: 1.5rem;
        height: 1.5rem;

        transition: color 150ms ease-out;

        fill: currentColor;
    }


}

.content {

    padding: 0 4rem 4rem;

    overflow-y: auto;

    @mask: linear-gradient(to bottom, transparent, black 4rem calc(100% - 4rem), transparent);

    -webkit-mask-image: @mask;
    mask-image: @mask;


}
</style>
    
    
    
<style lang="less">
@t2: ~"fade-blur";

.@{t2}-enter-active,
.@{t2}-leave-active {
    transition: background-color 400ms ease-out;

    &>div {
        @total-dur: 1000ms;
        @opacity-dur: 800ms;
        @blur-dur: (@total-dur - @opacity-dur);
        transition-property: //
            opacity,
            -webkit-backdrop-filter,
            backdrop-filter,
            transform,
            border-color;
        transition-duration:
            @opacity-dur,
            @blur-dur,
            @blur-dur,
            @total-dur,
            @total-dur;
        transition-delay:
            0,
            @opacity-dur,
            @opacity-dur,
            0,
            0;

        transition-timing-function: ease;
    }
}

@filter-in: blur(10px) opacity(1);
@filter-out: blur(10px) opacity(0);

.@{t2}-enter-from,
.@{t2}-leave-to {
    background-color: transparent;

    &>div {
        opacity: 0;
        -webkit-backdrop-filter: @filter-out;
        backdrop-filter: @filter-out;

        transform: translateY(3rem) scale(0.95);

        border-color: transparent;
    }
}

.@{t2}-leave-from,
.@{t2}-enter-to {
    background-color: rgba(6, 6, 6, 0.3);

    &>div {
        opacity: 1;
        -webkit-backdrop-filter: @filter-in;
        backdrop-filter: @filter-in;

        transform: translateY(0) scale(1);

    }
}
</style>
    