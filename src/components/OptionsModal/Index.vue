<template lang="pug">
.options.CModal__content
    section(ref="sectionRef")
        h1.App__font-shade {{ t('options') }} 
        section.flex
            label.cdn-input
                .CExportModal_Index__label {{ t('npm') }}
                .App__input-wrap.App__glow-element-wrap 
                    input.App__glow-element(v-model="npmCdn")
            label
                input(type="checkbox" v-model="cachePackagesOffline")
                | {{ t('cache') }}
            Button.clear-cache-btn(@click="clearCache")
                template(#icon) 
                    Trash
                | {{t('clear-cache')}}
            
</template>

<script setup lang="ts">
// input npm cdn
// [ ] cache remote packages offline (so you can use the app offline)
// button (clear persistent cache)

import Button from '@/components/MenuBar/Button.vue';
import Trash from '@/components/icons/trash.vue'

import { getSetting, setSetting } from '@/settings';
import { watch, onMounted } from 'vue';

import { useMouse } from '@/composition/useMouse'
import { updateElGlow } from '@/stylingUtils/updateGlow';


import { useI18n } from 'petite-vue-i18n';
import { clearPersistentCache } from '@/includesOfflineCache';


const { t, locale } = useI18n();

let npmCdn = $shallowRef<string>(getSetting('npmPackageProvider'))
let cachePackagesOffline = $shallowRef<boolean>(getSetting('cachePackages'));

watch([$$(npmCdn), $$(cachePackagesOffline)], () => {
    setSetting({
        'npmPackageProvider': npmCdn,
        'cachePackages': cachePackagesOffline
    })
})

const clearCache = () => {
    clearPersistentCache()
    alert('Cache has been cleared!');
}


let sectionRef = $shallowRef<HTMLDivElement>();

// @todo isolate into module
let glowItems: NodeListOf<HTMLDivElement>;

onMounted(() => {
    glowItems = sectionRef!.querySelectorAll<HTMLDivElement>('.' + $cssModule['App__glow-element-wrap']);
})


watch(useMouse(), (mouse) => {
    if (!glowItems) return;
    glowItems.forEach(g => updateElGlow(g, mouse))
})

</script>


<style lang="less" module>
.options {
    // same as for export modal
    font-size: 1.25rem;
}

.flex {

    display: flex;
    flex-flow: column;
    align-items: flex-start;
    gap: 2rem;

}

.cdn-input {
    align-self: stretch;
}

.clear-cache-btn {
    --accent-rgb: 255, 40, 40;
}
</style>