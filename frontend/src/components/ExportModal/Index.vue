<template lang="pug">
.export-content.CModal__content(ref="exportContentRef" @scroll="onScroll")
    section
        h1.App__font-shade Settings 
        .settings
            label
                input(type="checkbox" v-model="expandIncludes" @change="generateShader")
                | {{ t('expand') }}
                | 
                code #include
                | 
                | {{t('directives')}}
            label
                //- @todo
                input(type="checkbox" v-model="noAngleIncludes" @change="generateShader")
                | {{ t('replace') }} 
                | 
                code &lt;...&gt;
                | 
                | {{ t('by') }}
                | 
                code "..."
    section
        h1.App__font-shade {{ t('rename-symbols') }}
        section 
            h2.App__font-shade {{ t('inputs') }}
            .rename-grid
                label(v-for="i in inputList")
                    .label {{ i }}
                    .App__input-wrap.App__glow-element-wrap 
                        input.App__glow-element(@input="e => renameSymbol(i, e)" :value="renameMap.get(i)")
        section
            h2.App__font-shade {{ t('uniforms') }}
            .rename-grid
                label(v-for="i in uniformList")
                    .label {{ i }}
                    .App__input-wrap.App__glow-element-wrap 
                        input.App__glow-element(@input="e => renameSymbol(i, e)" :value="renameMap.get(i)")
    section
        h1.App__font-shade {{ t('result') }}
        p 
            | {{ t('click') }}
            | 
            a(download="fragment.glsl" :href="fileDownloadLink") {{ t('download') }}
        .App__input-wrap.App__glow-element-wrap
            textarea.code(readonly :value="exportContent" @click="onTextareaClick")
</template>

<script lang="ts">

// @note module scope, so settings are saved during session

let expandIncludes = $shallowRef<boolean>(false)
let noAngleIncludes = $shallowRef<boolean>(false)

const renameMap = new Map();

</script>

<script setup lang="ts">
import { dependencyRegex, processIncludes } from '@/processIncludes';

// import { parse, generate } from '@shaderfrog/glsl-parser'
// import { renameBindings } from '@shaderfrog/glsl-parser/utils'

import { useToast } from '@/composition/useToast';
import { Uri } from 'monaco-editor';

import { useI18n } from 'petite-vue-i18n';


import { getCurrentScope, onMounted, watch } from 'vue';
import { useMouse } from '@/composition/useMouse';
import { updateElGlow } from '@/stylingUtils/updateGlow';

const { t, locale } = useI18n();


let exportContentRef = $shallowRef<HTMLDivElement>();

let fileDownloadLink = $shallowRef<string>();
let exportContent = $shallowRef<string>('')

let getModel: () => import('monaco-editor').editor.ITextModel;
import('@/components/Editor.vue').then((module) => ({getModel} = module));

type GlslParserModule = typeof import('@shaderfrog/glsl-parser');
let parse: GlslParserModule['parse'];
let generate: GlslParserModule['generate'];
let renameBindings: typeof import('@shaderfrog/glsl-parser/utils').renameBindings

import('@shaderfrog/glsl-parser').then(module => ({parse, generate} = module))
import('@shaderfrog/glsl-parser/utils').then(module => ({renameBindings} = module))

const generateShader = async () => {
    if(!getModel || !parse) return;

    let codeLines = getModel().getLinesContent();

    if (!expandIncludes && noAngleIncludes) {
        // @note instance it without global flag, because it won't work properly for test()
        let rg = new RegExp(dependencyRegex, '');
        codeLines.forEach((line, index, arr) => {
            if (rg.test(line)) {
                console.log(line)
                arr[index] = line.replace(/<|>/g, '"');
            }
        })
    }

    let code = expandIncludes ? await processIncludes(codeLines, null) : codeLines.join('\n')

    if (renameMap.size) {

        let ast = parse(code, { includeLocation: true })

        console.log(ast)

        renameBindings(ast.scopes[0], (name, node) => {
            let newName = renameMap.get(name)

            if (newName) return newName;

            return name;
        })

        code = generate(ast);
    }

    exportContent = code
    fileDownloadLink = URL.createObjectURL(new Blob([code]));
}

generateShader()

// @note offer only inputs rename, since user can rename outputs by themselves
let inputList = ['uv']
// @todo report, sometimes non reactive vars break for some reason during hot reload (only vite restart helps)
// and it happens after template editing (same goes for components)
let uniformList = ['u_resolution', 'u_time', 'u_mouse', 'u_textures']


const renameSymbol = (symbol: string, e: InputEvent) => {
    // @todo
    let val = (e.target as HTMLInputElement).value.trim();

    if (val) {
        renameMap.set(symbol, val);
    }
    else {
        renameMap.delete(symbol)
    }

    generateShader();
}


const onTextareaClick = (e: PointerEvent<HTMLTextAreaElement>) => {
    e.target.select()
    navigator.clipboard.writeText(e.target.value).then(() => useToast(t('shader-copied')))
}


let glowItems: NodeListOf<HTMLDivElement>;

onMounted(() => {
    glowItems = exportContentRef!.querySelectorAll<HTMLDivElement>('.' + $cssModule['App__glow-element-wrap']);
})


watch(useMouse(), (mouse) => {
    if (!glowItems) return;
    // @note !!! don't use scrollTop because it causes reflow, so it's very laggy...
    glowItems.forEach(g => updateElGlow(g, mouse))
})

const onScroll = () => {
    glowItems.forEach(g => updateElGlow(g, useMouse(), true))
}

</script>

<style module lang="less">
// @todo move to modal by default
.export-content {
    max-width: 50rem;
    // @note add nice spacing on sides
    // margin-inline: 3rem;


    // display: flex;
    // flex-flow: column;
    // gap: 1.75rem;

    font-size: 1.25rem;

    &>section {
        margin-block: 3rem;
    }

    padding-block: 0;

}

.settings {

    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));

}

.rename-grid {
    // display: grid;

    // width: min-content;

    display: flex;
    flex-wrap: wrap;

    gap: 1rem 2rem;
}

.label {
    margin-bottom: 0.25rem;
}

.code {
    resize: none;

    box-sizing: border-box;
    width: 100%;

    min-height: 20rem;

    font-family: monospace;
    font-size: 1rem;

    cursor: pointer;

    border-radius: calc(var(--br) - var(--bw));
    background: var(--bg);

    transition: outline 300ms ease-out;
    outline: 1px transparent solid;

    &:focus-visible {
        outline: 1px var(--glow) solid;
    }
}
</style>