<template lang="pug">
.info(ref="info")
    .input-wrap.App__input-wrap.App__glow-element-wrap
        input.name-input.App__glow-element(v-model="shaderName")
    .fps-indicator()
        | FPS: 
        div(ref="fpsPaneContainer")
        //- | {{ 'FPS: ' + canvasFps.toFixed(2) }}
        //- @todo canvas resolution
</template>

<script setup lang="ts">
/*
shader name
saved status
compile status
fps
*/
import { onMounted, watch } from 'vue';

import { shaderName } from '@/App.vue';
import { canvasFps } from '@/components/Canvas.vue'

import { useMouse } from '@/composition/useMouse';
import { updateElGlow } from '@/stylingUtils/updateGlow';

const info = $shallowRef<HTMLDivElement>()
const fpsPaneContainer = $shallowRef<HTMLDivElement>()

watch(useMouse(), mouse => {
    if (!info) return;

    updateElGlow(info.firstElementChild! as HTMLElement, mouse);
})

onMounted(() => {
    import('tweakpane').then(({ Pane }) => {
        let fpsPane = new Pane({
            container: fpsPaneContainer!
        });

        let monitor = fpsPane.addMonitor(canvasFps, 'value', { view: 'graph', min: 20, max: 70 })

        monitor.controller_.view.labelElement.style.display = 'none';

        let containerStyle = fpsPaneContainer!.style;

        // til: var() can have a fallback value O_O

        // @note customizing tweakpane
        // @todo for some reason Object.assign doesn't work? or it only works if the property was defined in stylesheet?
        containerStyle.setProperty('--tp-container-horizontal-padding', '0')
        containerStyle.setProperty('--tp-container-vertical-padding', '0')
        // @note label's color uses bg color... so intead of transparent use bg color, so text is visible
        containerStyle.setProperty('--tp-base-background-color', 'var(--bg)')
        containerStyle.setProperty('--tp-monitor-background-color', 'transparent')
        containerStyle.setProperty('--tp-blade-unit-size', '0.5rem')
    })

})


</script>

<style module lang="less">
.info {
    display: flex;
    align-items: center;

    gap: 1rem;

    input {
        text-transform: uppercase;
    }
}

.fps-indicator {
    font-style: italic;

    display: flex;
    align-items: center;
    gap: 1rem;
}

.input-wrap {
    width: 18em;
}
</style>