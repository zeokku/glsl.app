<template lang="pug">
#editor-container
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { getSetting } from "@/settings";
import { useScreen } from "@/composition/useScreen";
import { init, getEditor, getModel, processIncludes, compileShader } from "@/editor";
import { currentShader } from "@/App.vue";
import { getLastOpenShaderId, getShader, updateShader } from "@/storage2";
import { useQuery } from "@urql/vue";
import { graphql } from "@/gql";

import defaultShader from "@/default.frag?raw";
import { isManualRecompilation } from "./InfoBar/InfoBar.vue";

/**
 * Fetch shader from url or from storage (last saved)
 */
const fetchShader = async () => {
  /**
   * string without #
   */
  const hashBody = decodeURIComponent(location.hash.slice(1));

  if (hashBody) {
    location.hash = "";

    try {
      // online
      if (hashBody[0] === "~") {
        // @note omfg why does mutation require setup level, while query can be called anywhere
        // it's so stupid
        const { data, error } = await useQuery({
          query: graphql(/* GraphQL */ `
            query Shader($id: ID!) {
              shader(id: $id) {
                body
              }
            }
          `),
          variables: {
            id: hashBody.slice(1),
          },
          // pause: true
        });

        if (error.value) {
          throw error.value.message;
        }

        let { shader } = data.value!;

        if (shader) {
          currentShader.value = await updateShader({
            name: `Shader (${hashBody.slice(1)})`,
            code: shader.body,
          });

          return;
        } else {
          throw "Shader with this ID is not found";
        }
      }
      // offline
      else {
        // @note eh just switch to b64
        // const [{ decode85 }, { decompressSync }] = await Promise.all([
        //   import("@/utils/base85"),
        //   import("fflate"),
        // ]);

        // let d85 = decode85(hash);

        // code = new TextDecoder().decode(decompressSync(d85.slice(d85[0])));

        const [{ base64urlnopad }, { decompressSync }] = await Promise.all([
          import("@scure/base"),
          import("fflate"),
        ]);
        const b64 = base64urlnopad.decode(hashBody);
        const code = new TextDecoder().decode(decompressSync(b64));

        currentShader.value = await updateShader({
          name: `Shader (${hashBody.slice(7)})`,
          code,
        });

        return;
      }
    } catch (e) {
      alert("Failed to open shader. Check console for errors.\n\n" + e);

      console.error(e);
    }
  }

  // @note read last shader if no hash provide, failed to load/parse from url fragment and etc
  let lastOpenShaderId = getLastOpenShaderId();

  if (lastOpenShaderId !== null) {
    let shader = await getShader(lastOpenShaderId);

    if (shader) {
      currentShader.value = shader;

      return;
    }
  }

  // @note no last shader saved
  currentShader.value = await updateShader({
    name: "New Shader",
    code: defaultShader,
  });
};

onMounted(async () => {
  await fetchShader();

  init(window[$cssModule.editorContainer]);

  // @note compile initially
  if (isManualRecompilation.value) {
    const model = getModel();

    const processedCode = await processIncludes(model.getLinesContent());

    compileShader(processedCode);
  }
});

watch(useScreen(), ({ w }) => {
  const editorInstance = getEditor();

  editorInstance?.updateOptions({
    minimap: {
      enabled: w > 500 && getSetting("editorMinimap"),
    },
  });
});
</script>

<style module lang="less">
#editor-container {
  height: 100%;
  width: 100%;
}
</style>

<!-- global -->
<style lang="less">
// .decorator {
//     width: 5px !important;
//     margin-left: 3px;
// }

.decorator-error {
  color: black;
  background: rgba(255, 0, 0, 0.5);
}

.decorator-warn {
  background: rgba(255, 255, 0, 0.5);
}

// @note add colors to custom codicons
.codicon-primitive-square {
  color: orange;
}

.codicon-extensions {
  color: rgb(255, 119, 146);
}

.codicon-file-code {
  color: lightgreen;
}

.codicon-circuit-board {
  color: rgb(132, 218, 255);
}

.codicon-symbol-misc {
  color: rgb(255, 131, 255);
}

.codicon-filter {
  // @note directive token colors
  color: #c27ba0;
}

.codicon-symbol-folder {
  color: #ffb400 !important;
}

.codicon-symbol-file {
  color: white !important;
}
</style>
