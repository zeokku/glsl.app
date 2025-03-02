<template lang="pug">
.editor-container(ref="editorContainer")
</template>

<script lang="ts">
let model: editor.ITextModel;
export const getModel = () => model;

let editorInstance: editor.IStandaloneCodeEditor;
export const getEditor = () => editorInstance;
</script>

<script setup lang="ts">
import { getCurrentScope, onMounted, watch } from "vue";

// @todo select only needed
import "monaco-editor/esm/vs/editor/editor.all";
// import 'monaco-editor/esm/vs/editor/editor.api';
// @todo bruh i don't understand why importing it like this makes command palette be bundled
// while importing editor.api does not
import "monaco-editor";
import {
  languages,
  editor,
  MarkerSeverity,
  Range,
  KeyMod,
  KeyCode,
  Position,
  IMarkdownString,
  IPosition,
} from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

import throttle from "lodash.throttle";

import type {
  FunctionNode,
  FunctionPrototypeNode,
  IdentifierNode,
  KeywordNode,
  ParameterDeclarationNode,
  ParameterDeclaratorNode,
  Program,
  StructNode,
  TypeSpecifierNode,
  LocationInfo,
  Scope,
  AstNode,
} from "@shaderfrog/glsl-parser/ast";
import { type parse, generate } from "@shaderfrog/glsl-parser";

import workerParse from "@/workerParse?worker";

///

// import defaultShader from '../defaultShader';
import defaultShader from "@/default.frag?raw";

import {
  type IIncludesData,
  checkForDependency,
  resolvePath,
  processIncludes,
} from "@/processIncludes";

import {
  staticSuggestions,
  CustomCompletionItemKind,
  AutocompletionOrder,
} from "@/glsl-lang/staticSuggestions";
import parsedOpenGLDocs from "@/glsl-lang/parsedOpenGLDocs";
import { glslMdWrap } from "@/utils/glslMdWrap";
import { editorBuiltins } from "@/glsl-lang/dictionary";

import "@/glsl-lang/glsl";
import "@/glsl-lang/glsl-md";
import type { ParsedBuiltinDefinition } from "@/glsl-lang/types";

import { defaultShaderName, findNonConflictingName, getLastOpenShader, getShader } from "@/storage";
import { createdTimestamp, shaderName } from "@/App.vue";
import { getSetting } from "@/settings";

import { getDocsLinkFor } from "@/utils/getOpenGLDocsUrl";
import { renameBindings } from "@shaderfrog/glsl-parser/utils";
import { Pane } from "tweakpane";
import { ExtractUnion } from "@/utils";

import parsedLygia from "@/glsl-lang/parsedLygia.json";
import { useQuery } from "@urql/vue";
import { graphql } from "@/gql";
import debounce from "lodash.debounce";
import { formatCode } from "@/format";
import { useScreen } from "@/composition/useScreen";

// @note 'monaco-editor/esm/vs/editor/contrib/message/browser/messageController.js'
type MessageController = {
  showMessage(message: string, position: IPosition): void;
  closeMessage(): void;
  dispose(): void;
};

const emit = defineEmits<{
  (event: "change", code: string): void;
}>();

const props = defineProps<{ infoLog: String }>();

const scope = getCurrentScope()!;

let editorContainer = $shallowRef<HTMLDivElement>();

watch(useScreen(), ({ w }) => {
  const editorInstance = getEditor();

  if (!editorInstance) return;

  editorInstance.updateOptions({
    minimap: {
      enabled: w > 500 && getSetting("editorMinimap"),
    },
  });
});

let parser = new workerParse();
// let isParsing = false;

const parseAsync = (code: string) => {
  // @note typically parsing shouldn't take longer than debounced input
  // but in case it does there's an interesting concept of terminating the thread so
  // main thread won't wait for the completion of previous parsing request

  // previous parsing request hasn't completed,
  // so terminate the worker and reinstate it
  // if(isParsing){
  //     parser.terminate();

  //     console.log('parsing worker terminated')
  //     performance.mark('parsing-worker-terminated')

  //     parser = new workerParse();
  // }

  // isParsing = true;

  return new Promise<ReturnType<typeof parse>>((resolve, reject) => {
    parser.onmessage = ({ data }) => {
      // isParsing = false;

      if (data) resolve(data);
      else reject();
    };

    parser.postMessage(code);
  });
};

onMounted(async () => {
  self.MonacoEnvironment = {
    getWorker: (_, label: string) => new editorWorker(),
  };

  //#region create model with code from last open shader OR from URL OR default initial shader
  {
    let code: string;

    /**
     * string without #
     */
    const hash = decodeURI(location.hash.slice(1));

    if (hash) {
      // location.hash = "";

      try {
        // online
        if (hash[0] === "~") {
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
              id: hash.slice(1),
            },
            // pause: true
          });

          if (error.value) {
            throw error.value.message;
          }

          let { shader } = data.value!;

          if (shader) {
            code = shader.body;
            shaderName.value = await findNonConflictingName();
          } else {
            throw "Shader with this ID is not found";
          }
        } else {
          const [{ decode85 }, { decompressSync }] = await Promise.all([
            import("@/utils/base85"),
            import("fflate"),
          ]);

          let d85 = decode85(hash);

          code = new TextDecoder().decode(decompressSync(d85.slice(d85[0])));

          // @todo encode name of the shader?
          // and do alert when you already have a shader under that name
          shaderName.value = await findNonConflictingName();

          // @note updating ref value without triggering reactivity
          // shaderName._value = newName
          // shaderName._rawValue = newName
        }
      } catch (e) {
        alert("Failed to open shader. Check console for errors\n" + e);

        // throw e;

        console.log(e);

        // @todo better handling
        code = defaultShader;

        shaderName.value = await findNonConflictingName();
      }
    } else {
      code = defaultShader;

      let lastOpenShaderName = getLastOpenShader();

      if (lastOpenShaderName) {
        let shader = await getShader(lastOpenShaderName);

        if (shader) {
          shaderName.value = lastOpenShaderName;
          createdTimestamp.value = shader.created;
          ({ code } = shader);
        } else {
          shaderName.value = await findNonConflictingName();
        }
      } else {
        shaderName.value = defaultShaderName;
      }
    }

    model = editor.createModel(code, "glsl");
  }
  //#endregion

  editorInstance = editor.create(
    editorContainer!,
    {
      theme: "glsl-theme",

      wordBasedSuggestions: false,

      cursorBlinking: "smooth",
      // cursorSmoothCaretAnimation: 'on',

      colorDecorators: true,

      // fontFamily: 'SpaceMono',

      tabSize: getSetting("tabSize"),

      minimap: {
        enabled: innerWidth > 500 && getSetting("editorMinimap"),
        side: "left",
        maxColumn: 80,
      },

      suggest: {
        showInlineDetails: true,
        // @note thanks https://stackoverflow.com/questions/62325624/how-to-allow-completion-suggestions-to-appear-while-inside-a-snippet-in-monaco-e
        snippetsPreventQuickSuggestions: false,
      },

      "semanticHighlighting.enabled": true,
    },
    // @note this is needed to enable suggestion docs
    // https://github.com/microsoft/monaco-editor/issues/2241#issuecomment-764694521
    {
      storageService: {
        get() {},
        remove() {},
        getBoolean(key: string) {
          // @todo suggestion docs width
          if (key === "expandSuggestionDocs") return true;
        },
        getNumber(key: string) {
          // return 0;
        },
        store() {},
        onWillSaveState() {},
        onDidChangeStorage() {},
        onDidChangeValue() {},
      },
    }
  );

  // @note add key bindings to font scale
  // editor.addKeybindingRules([
  //     {
  //         keybinding: KeyMod.CtrlCmd | KeyCode.Equal,// Ctrl - "+"
  //         command: 'editor.action.fontZoomIn'
  //     },
  //     {
  //         keybinding: KeyMod.CtrlCmd | KeyCode.Minus, // Ctrl - "-"
  //         command: 'editor.action.fontZoomOut'
  //     },

  // ])

  // console.log(editorInstance.getAction('editor.action.fontZoomIn'))

  editorInstance.setModel(model);

  window.onresize = () => editorInstance.layout();
  editorInstance.render();

  let editorAst: ReturnType<typeof parse>;

  let currentIncludesData: Array<IIncludesData> = [];

  let messageController = editorInstance.getContribution(
    "editor.contrib.messageController"
  ) as MessageController;

  //#region line error decorations
  {
    /**
     * used for decorating line numbers with red rectangles when there are errors
     */
    const decorationsCollection = editorInstance.createDecorationsCollection();
    scope.run(() => {
      watch(
        () => props.infoLog,
        infoLog => {
          /*
                ERROR: 0:8: 'vec43' : Expected invariant or precise
                ERROR: 0:173: 'out_color' : undeclared identifier
                ERROR: 0:173: 'assign' : l-value required (can't modify a const)
                ERROR: 0:173: '=' : dimension mismatch
                ERROR: 0:173: 'assign' : cannot convert from 'highp 4-component     vector of float' to 'const highp float'
                */

          /*
                WARNING: 0:259: 'region' : unrecognized pragma
                WARNING: 0:268: 'endregion' : unrecognized pragma
                ERROR: unsupported shader version
                */

          let markers: editor.IMarkerData[] = [];

          for (let [
            includeLineNumber,
            includeLinesCount /* id */ /* code */,
            ,
            ,
            failed,
          ] of currentIncludesData) {
            // #include failed to load
            if (failed) {
              let startColumn = model.getLineFirstNonWhitespaceColumn(includeLineNumber);
              let endColumn = model.getLineLastNonWhitespaceColumn(includeLineNumber);

              markers.push({
                message: failed,

                startLineNumber: includeLineNumber,
                startColumn,
                endLineNumber: includeLineNumber,
                endColumn,

                severity: MarkerSeverity.Error,
              });
            }
          }

          // @note remove old decorations
          // @note omfg folding decorations are also a part of this xd, so provide a separate collection for them
          // @note use collection.set instead
          // let decorations = editorInstance.getDecorationsInRange(new Range(1, 1, model.getLineCount(), 1))
          // if (decorations) {
          //     console.log(decorations)
          //     editorInstance.removeDecorations(decorations.map(d => d.id))
          // }

          // @note don't exit here, because there might be problems with includes!
          // and the user may not used anything yet from that, so there will be no compilation error

          // if (infoLog === '') {
          //     decorationsCollection.set([]);
          //     editor.setModelMarkers(model, 'owner', markers)
          //     return;
          // }

          infoLog
            .split("\n")
            .filter(s => /\w/.test(s))
            .forEach(line => {
              let logChunks = line.split(":", 5);

              // e.g. ERROR: unsupported shader version
              if (logChunks.length !== 5) {
                let [type, ...rest] = logChunks;

                markers.push({
                  message: rest.join(":").trim(),

                  startLineNumber: 1,
                  startColumn: 1,
                  endLineNumber: 1,
                  endColumn: model.getLineLastNonWhitespaceColumn(1),

                  severity: type === "ERROR" ? MarkerSeverity.Error : MarkerSeverity.Warning,
                } as editor.IMarkerData);

                return;
              }

              let [type, _, lineNumberStr, fragment, message] = logChunks;

              let codeFragment = fragment.split("'")[1];

              let lineNumber = parseInt(lineNumberStr);

              // correct line numbers with #include(s)
              for (let [includeLineNumber, includeLinesCount] of currentIncludesData) {
                if (lineNumber < includeLineNumber) {
                  break;
                } else {
                  // since we replace #include ... by N lines, we get N - 1 difference
                  lineNumber -= includeLinesCount - 1;

                  // error is inside included code
                  if (lineNumber < includeLineNumber) {
                    lineNumber = includeLineNumber;
                    break;
                  }
                }
              }

              let modelLine = model.getLineContent(lineNumber);
              // @note columns are 1 based
              // error logs are too castrated
              // the "code" fragment may not be actually a fragment of code x_x

              let startColumn: number;
              let endColumn: number;

              let indexOfFragment = modelLine.indexOf(codeFragment);

              // if fragment not code OR there are more than one match
              if (
                indexOfFragment === -1 ||
                modelLine.indexOf(codeFragment, indexOfFragment + 1) !== -1
              ) {
                // highlight entire line, since we can't guess exact location
                startColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
                endColumn = model.getLineLastNonWhitespaceColumn(lineNumber);
              }
              // there's only one match so we can highlight exact location
              else {
                startColumn = 1 + indexOfFragment;
                endColumn = startColumn + codeFragment.length;
              }

              message = message.trim();
              message =
                fragment.trim() + " | " + message.slice(0, 1).toUpperCase() + message.slice(1);

              markers.push({
                message,

                // @note @todo when providing code, columns are optional?
                // nop, it will just match first word
                // code: fragment.split("'")[1],

                ...new Range(lineNumber, startColumn, lineNumber, endColumn),

                severity: type === "ERROR" ? MarkerSeverity.Error : MarkerSeverity.Warning,
              } as editor.IMarkerData);
            });

          let lineDecorations = markers.map(
            m =>
              ({
                range: new Range(m.startLineNumber, 1, m.endLineNumber, 1),
                options: {
                  // hoverMessage: { value: m.message },
                  // isWholeLine: true,
                  // linesDecorationsClassName
                  marginClassName:
                    m.severity === MarkerSeverity.Error ? "decorator-error" : "decorator-warn",
                },
              }) as editor.IModelDeltaDecoration
          );

          // @note just create a collection once and then update decorations
          // set removed old ones
          decorationsCollection.set(lineDecorations);

          editor.setModelMarkers(model, "owner", markers);
        }
      );
    });
  }
  //#endregion

  //#region autocompletion

  interface BaseDefinition {
    documentation: {
      value: string;
    };

    range: Range;

    sortText?: string | undefined;
  }

  interface VarConstDefinition extends BaseDefinition {
    name: string;

    kind:
      | languages.CompletionItemKind.Variable
      | languages.CompletionItemKind.Constant
      | CustomCompletionItemKind.Misc;

    qualifiers?: string[];
    type: string;

    scope: Program["scopes"][number];
  }

  interface FunctionDefinition extends BaseDefinition {
    kind: languages.CompletionItemKind.Function;

    overloads: Array<{
      returnType: string;
      /**
       * name => [type, qualifiers]
       */
      params: Map<string, [qualifiers: string[], type: string]>;
    }>;

    /**
     * used for semantic tokens
     */
    // move all refs to a separate object tbh
    // refs: LocationInfo,
  }

  interface StructDefinition extends BaseDefinition {
    name: string;

    kind: languages.CompletionItemKind.Struct;

    scope: Program["scopes"][number];

    // refs: LocationInfo,

    // @todo struct contents
  }

  type DynamicAutocompletionDefinition = FunctionDefinition | VarConstDefinition | StructDefinition;

  ///
  // @note since functions are global, we may use a map
  let dynamicFunctionDefinitionsData = new Map<string, FunctionDefinition>();

  // while variables and structs can ghost higher level scopes variables and structs, so to determine correct definitions we need to test position in range, so using array is easier
  let dynamicDefinitionsData: Array<VarConstDefinition | StructDefinition> = [];

  ///

  type CompletionItem = Omit<languages.CompletionItem, "range"> & {
    kind: CustomCompletionItemKind | languages.CompletionItemKind;
  };

  languages.registerCompletionItemProvider("glsl", {
    provideCompletionItems(curModel, position) {
      if (curModel !== model) return;

      let word = model.getWordUntilPosition(position);
      let nextCharAfterWord = model.getValueInRange(
        new Range(position.lineNumber, word.endColumn, position.lineNumber, word.endColumn + 1)
      );
      let lineBeforeWord = model
        .getValueInRange(new Range(position.lineNumber, 1, position.lineNumber, word.startColumn))
        .trim();

      // @note handle this in prop completion
      if (lineBeforeWord.at(-1) === ".") return;

      // @note handle includes separately
      if (/[ \t]*#[ \t]*include/.test(lineBeforeWord)) return;

      // @note since variables and structs can be ghosted, we use map
      // so later definitions overwrite higher scope defs
      // fortunately the definitions have ranges ordered
      let dynamicSuggestions = new Map<string, CompletionItem>();

      // bindings and types
      for (let def of dynamicDefinitionsData) {
        if (!def.range.containsPosition(position)) continue;

        let {
          name,
          documentation,
          kind,
          // @note force it on top comparing to builtins
          sortText,
        } = def;

        dynamicSuggestions.set(name, {
          label: name,
          insertText: name,
          documentation,
          // @ts-expect-error
          kind,
          sortText,
        });
      }

      for (let [name, def] of dynamicFunctionDefinitionsData) {
        if (!def.range.containsPosition(position)) continue;

        let { documentation, kind, sortText } = def;

        // @ts-expect-error
        dynamicSuggestions.set(name, {
          label: name,
          insertText: name,
          documentation,
          kind,
          sortText,
        });
      }

      // @ts-expect-error on lack of range property
      let suggestions: languages.CompletionItem[] = [
        ...staticSuggestions,
        ...dynamicSuggestions.values(),
      ];

      // @note don't insert () if there is already ( after the word
      // + set insert rule as snippet
      suggestions.forEach(s => {
        if (
          s.kind === languages.CompletionItemKind.Function ||
          // @ts-ignore
          s.kind === CustomCompletionItemKind.Square
        ) {
          if (nextCharAfterWord === "(") {
            s.insertText = s.label as string;
          } else {
            s.insertText = s.label + "($0)";
            s.insertTextRules = languages.CompletionItemInsertTextRule.InsertAsSnippet;
            // @ts-ignore
            s.command = {
              // @note found it in parameterHints.js
              // trigger func signature hints, when applying autocompletion which is a function
              id: "editor.action.triggerParameterHints",
            };
          }
        }
      });

      // @note THIS! autocompletion worked only on first word (only leading whitespaces) because it actually checks against the specified range!!!
      // so the problem was, if leaving range undefined it checked against entire line
      // so this fixes the issue
      let matchRange = new Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      );
      suggestions.forEach(s => ((s as languages.CompletionItem).range = matchRange));

      // console.log(suggestions)

      return { suggestions };
    },
  });

  //#endregion

  //#region property autocompletion
  {
    const resolvePart = (part: string) => {};

    const vecFields = [
      ["x", "y", "z", "w"],
      ["s", "t", "p", "q"],
      ["r", "g", "b", "a"],
    ];

    languages.registerCompletionItemProvider("glsl", {
      triggerCharacters: ["."],
      // @ts-ignore
      provideCompletionItems(model, position, context, token) {
        let line = model
          .getValueInRange(new Range(position.lineNumber, 1, position.lineNumber, position.column))
          .trim();
        let raw = line.match(/[\w. ]*$/)![0];

        // @todo well technically dot can be around whitespace, but we won't provide autocompletion for such scenario
        let parts = raw.split(/ *\. */);

        console.log("prop completion", parts);

        if (parts.length === 1) return;

        // @todo keep only last two items in chain (struct.field.fieldsField.vecField.xyy and etc)
        // parts = parts.slice(-2)

        let suggestions: string[] = [];

        let word = parts[0];
        let symbol = dynamicDefinitionsData.findLast(
          d => d.range.containsPosition(position) && d.name === word
        );

        console.log("symbol", symbol);

        if (!symbol || !("type" in symbol)) return;

        let chainItemType = symbol.type;

        if (/^[iub]?vec[234]$/.test(chainItemType)) {
          let vecSize = parseInt(chainItemType.slice(-1));

          // next in chain
          let props = parts[1];

          // vec4 is max
          if (props.length >= 4) return;

          if (props) {
            let set = vecFields.find(s => s.includes(props[0]));

            if (!set) return;

            set = set.slice(0, vecSize);

            suggestions.push(...set);
          } else {
            suggestions.push(...vecFields.map(v => v.slice(0, vecSize)).flat());
          }
        }

        console.log("suggestions", suggestions);

        return {
          suggestions: suggestions.map((s, i) => ({
            // @note a little hack to always show full list of props
            // so monaco doesn't sort them out (e.g. pressing 'x' will only show x instead of x,y for vec2)
            label: "\u200B" + s,
            kind: languages.CompletionItemKind.Field,
            insertText: s,
            range: Range.fromPositions(position, position),
            sortText: i.toString().padStart(2, "0"),

            command: {
              id: "editor.action.triggerSuggest",
            },

            // commitCharacters: [s]
          })),

          // what does it even do bruh
          // incomplete: true
        };
      },
    });
  }
  //#endregion

  //#region lygia autocompletion

  {
    const lygiaIncludeRegex = /lygia\/(?:\w+\/)*$/;
    const packageInclude = /^[ \t]*#[ \t]*include[ \t]+<\w*$/;

    languages.registerCompletionItemProvider("glsl", {
      // triggerCharacters: ['/'],
      // @ts-ignore
      provideCompletionItems(model, position, context, token) {
        let lineUntilCursor = model.getValueInRange(
          Range.fromPositions(new Position(position.lineNumber, 1), position)
        );

        let wordUnderCursor = model.getWordAtPosition(position);

        let collapsedRange = Range.fromPositions(position, position);

        let wordRange = wordUnderCursor
          ? new Range(
              position.lineNumber,
              wordUnderCursor.startColumn,
              position.lineNumber,
              wordUnderCursor.endColumn
            )
          : collapsedRange;

        let match = lineUntilCursor.match(lygiaIncludeRegex);

        if (!match) {
          console.log("lygia", lineUntilCursor, wordUnderCursor, position);

          if (!packageInclude.test(lineUntilCursor)) return { suggestions: [] };

          return {
            suggestions: [
              {
                label: "lygia",
                insertText: "lygia/",
                documentation: "LYGIA Shader Library",
                kind: CustomCompletionItemKind.Star,
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                // @note using insert/replace range
                // insert is used for suggestion filtering, so we just specify collapsed range, so it provides full list of suggestions
                // while replace is used to "replace" the part of text when accepting suggestion
                // @note no, it doesn't actually work like that....
                range: collapsedRange,

                // @note remove word
                additionalTextEdits: wordUnderCursor
                  ? [
                      {
                        range: wordRange,
                      },
                    ]
                  : undefined,

                command: {
                  id: "editor.action.triggerSuggest",
                },
              },
            ],
          };
        }

        // editorInstance.getSelection()
        let path = match[0].split("/").filter(f => f);
        console.log(path);

        let suggestions: languages.CompletionItem[] = [];

        // @todo dynamically load and parse lygia defs
        let obj = parsedLygia;

        path.forEach(p => {
          obj = obj[p] as object | null;
        });

        if (obj) {
          let items = Object.keys(obj);

          items.forEach(i => {
            let isDir = Object.keys(obj[i]).length !== 0;

            suggestions.push({
              label: i,
              insertText: isDir ? i + "/" : i.slice(0, -5),

              // @todo
              kind: isDir ? languages.CompletionItemKind.Folder : languages.CompletionItemKind.File,
              range: Range.fromPositions(position, position),

              // @ts-expect-error
              additionalTextEdits: wordUnderCursor
                ? [
                    {
                      range: wordRange,
                    },
                  ]
                : undefined,

              // @note sort dirs first
              sortText: isDir ? "a" : "b",

              command: isDir
                ? {
                    id: "editor.action.triggerSuggest",
                  }
                : undefined,
            });
          });
        }

        return { suggestions };
      },
    });
  }

  //#endregion

  //#region semantic tokens
  // provide tokenization for structs and fields?

  let scheduleSemanticTokensUpdate: () => void;

  const tokenTypes = ["type", "function"] as const;
  const tokenModifiers = ["struct"] as const;

  type Tokens<U> = U extends ReadonlyArray<infer K> ? K : never;

  type SemanticTokenData = LocationInfo & {
    length: number;
    type: Tokens<typeof tokenTypes>;
    modifier?: Tokens<typeof tokenModifiers> | undefined;
  };

  const semanticTokensData: SemanticTokenData[] = [];
  const addSemanticTokenData = (
    loc: LocationInfo,
    length: number,
    type: SemanticTokenData["type"],
    modifier?: SemanticTokenData["modifier"]
  ) => {
    semanticTokensData.push({
      ...loc,
      length,
      type,
      modifier,
    });
  };

  {
    const addSemanticTokenData = (
      buffer: number[],
      lineOffset: number,
      colunOffset: number,
      length: number,
      token: Tokens<typeof tokenTypes>,
      modifier?: Tokens<typeof tokenModifiers>
    ) => {
      // @ts-ignore @todo undefined can't be used for indexOf????
      buffer.push(
        lineOffset,
        colunOffset,
        length,
        tokenTypes.indexOf(token),
        tokenModifiers.includes(modifier) ? 1 << tokenModifiers.indexOf(modifier) : 0
      );
    };

    //#region tree impl
    // type NodeValue = LocationInfo;

    interface TreeNode<NodeValue extends LocationInfo = LocationInfo> {
      /**
       * parent
       */
      p?: TreeNode<NodeValue>;
      /**
       * left
       */
      l?: TreeNode<NodeValue>;
      /**
       * right
       */
      r?: TreeNode<NodeValue>;

      // @note getting array type by accessing number type prop
      /**
       * value
       */
      v: NodeValue;
    }

    const insertLeft = <NodeValue extends LocationInfo = LocationInfo>(
      n: TreeNode<NodeValue>,
      v: NodeValue
    ) => {
      if (n.l) {
        insert(n.l, v);
      } else {
        n.l = { p: n, v };
      }
    };

    const insertRight = <NodeValue extends LocationInfo = LocationInfo>(
      n: TreeNode<NodeValue>,
      v: NodeValue
    ) => {
      if (n.r) {
        insert(n.r, v);
      } else {
        n.r = { p: n, v };
      }
    };

    const insert = <NodeValue extends LocationInfo = LocationInfo>(
      n: TreeNode<NodeValue>,
      v: NodeValue
    ) => {
      if (v.line < n.v.line) {
        insertLeft(n, v);
      } else if (n.v.line < v.line) {
        insertRight(n, v);
      }
      // same line, check columns
      else if (v.column < n.v.column) {
        insertLeft(n, v);
      }
      // n.v.column < v.column
      else {
        insertRight(n, v);
      }
    };

    const traverse = <NodeValue extends LocationInfo = LocationInfo>(
      n: TreeNode<NodeValue> | undefined,
      cb: (e: TreeNode<NodeValue>) => void
    ) => {
      if (!n) return;

      traverse(n.l, cb);

      cb(n);

      traverse(n.r, cb);
    };
    //#endregion

    // @note !!! inspect tokens command doesn't show semantic tokens......
    languages.registerDocumentSemanticTokensProvider("glsl", {
      onDidChange(cb) {
        scheduleSemanticTokensUpdate = cb;

        return {
          dispose() {},
        };
      },

      // @todo const tuple can't be used for string[]?
      // @ts-ignore
      getLegend() {
        return {
          tokenTypes,
          tokenModifiers,
        };
      },

      // @note bruh the fact you have to use offsets instead of just supplying ranges or smth
      // is so fricking stupid
      provideDocumentSemanticTokens(model, lastResultId, token) {
        let buffer: number[] = [];

        // @note negative offsets are not supported, so we need to sort references ascending
        // @note technically we could implement a tree and then traverse it, but the number of entries is insignificant so we may use a more expensive but easier way to sort
        // let structDefs =
        //     ([...autocompletionDynamicDefinitions.entries()]
        //         .filter(([name, def]) => def.kind === languages.CompletionItemKind.Struct) as Array<[string, StructDefinition]>)
        //         .map(([name, def]) => [name, def.references] as const)
        //         .flat()
        //         .sort((a, b) =>
        //             (a[1].line - b[1].references.line) ||
        //             (a[1].column - b[1].references.column)
        //         );

        // @note upd. bruh ok using a binary tree turns out to be easier than that abomination xd

        let refTree: TreeNode<SemanticTokenData> | null = null;

        for (let def of semanticTokensData) {
          if (!refTree) {
            refTree = {
              v: def,
            };
            continue;
          }

          insert(refTree, def);
        }

        // console.log('provideDocumentSemanticTokens', refTree)

        if (refTree) {
          let prevLine = 1;
          let prevColumn = 1;

          traverse(refTree, ({ v: { line, column, length, type, modifier } }) => {
            if (line !== prevLine) {
              prevColumn = 1;
            }

            addSemanticTokenData(
              buffer,
              line - prevLine,
              column - prevColumn,
              length,
              type,
              modifier
            );

            prevLine = line;
            prevColumn = column;
          });
        }

        // console.log('provideDocumentSemanticTokens', buffer)

        return {
          data: new Uint32Array(buffer),
        };
      },

      releaseDocumentSemanticTokens(resultId) {},
    });

    languages.registerDocumentFormattingEditProvider("glsl", {
      async provideDocumentFormattingEdits(model, options, token) {
        const code = model.getValue();
        const position = editorInstance.getPosition()!;
        const offset = model.getOffsetAt(position);

        console.log("FORMAT CALL", options, token, "offset:", offset);

        const { formatted } = await formatCode(code, offset);

        // console.log(editor.getAction("editor.action.formatDocument"));

        // const newPosition = model.getPositionAt(cursorOffset);
        // editorInstance.setPosition(newPosition, "formatting-adjustment");

        return [
          {
            text: formatted,
            range: model.getFullModelRange(),
          },
        ];
      },
    });
  }

  //#endregion

  //#region hover provider

  languages.registerHoverProvider("glsl", {
    provideHover(curModel, hoverPosition) {
      if (curModel !== model) return;

      // let { word, startColumn, endColumn } = model.getWordAtPosition(hoverPosition) ?? {};
      // @note ^ technically we could use 0 instead of {}, the destructuring will work fine

      let wordObject = model.getWordAtPosition(hoverPosition);

      // @todo does it always have a word doe?
      if (!wordObject) return;

      let { word, startColumn, endColumn } = wordObject;

      let range = new Range(
        hoverPosition.lineNumber,
        startColumn!,
        hoverPosition.lineNumber,
        endColumn!
      );

      //#region glsl builtin
      {
        // @ts-ignore duh we can't index const record type with generic string
        let glslBuiltin = parsedOpenGLDocs[word] as ParsedBuiltinDefinition;

        if (glslBuiltin) {
          return {
            range,
            // @note bruh you can't have simple strings here???
            // required to have { value } objects
            contents: [
              {
                value: glslMdWrap(glslBuiltin.decl.join("\n\n")),
              },
              {
                value: glslBuiltin.desc.replace(
                  new RegExp(String.raw`\b${word}\b`),
                  "**`" + word + "`**"
                ),
              },
              {
                value: `[Open in docs](${getDocsLinkFor(word)})`,
              },
            ],
          };
        }
      }
      //#endregion

      //#region functions
      {
        let funcDef = dynamicFunctionDefinitionsData.get(word);

        if (funcDef) {
          // @note lol bruh we don't need to check range for hovers
          // besides it prevented hovering on func declarations
          // if (funcDef.range.containsPosition(hoverPosition)) {
          return {
            range,
            contents: [funcDef.documentation],
          };
          // }
        }
      }
      //#endregion

      //#region bindings and types
      {
        let documentation;

        for (let def of dynamicDefinitionsData) {
          // @note we don't need this tbh, since later ranges won't overwrite the definition
          // because we exit the loop by then
          // no we actually do need this, because in fact
          // ranges are not continuously ordered (first go types, then bindings)
          if (!def.range.containsPosition(hoverPosition)) continue;

          // since we have structs here too, the behavior will be incorrect
          // if (hoverPosition.isBefore(def.range.getStartPosition()))
          // break;

          // overwrite documentation (following ghosting)
          if (def.name === word) ({ documentation } = def);
        }

        if (documentation) {
          return {
            range,
            contents: [documentation],
          };
        }
      }
      //#endregion
    },
  });

  //#endregion

  //#region @todo reference provider
  // languages.registerReferenceProvider('glsl', {
  //     provideReferences(curModel, position, context, token) {
  //         if (curModel !== model) return;

  //         return [
  //             // {
  //             //     range: new Range(),
  //             //     uri: model.uri
  //             // }
  //         ];
  //     }
  // })
  //#endregion

  //#region @todo? inline completions
  // don't really know how we could use it here, doe

  // https://github.com/microsoft/vscode-extension-samples/tree/main/inline-completions
  // languages.registerInlineCompletionsProvider('glsl', {
  //     provideInlineCompletions(model, position, context, token) {
  //         return {
  //             items: []
  //         }
  //     },

  //     freeInlineCompletions(completions) {

  //     },
  // })

  //#endregion

  //#region link provider
  languages.registerLinkProvider("glsl", {
    provideLinks(model, token) {
      // console.log('provide links')

      // @note ok bruh since we don't have force update for this provider
      // we can't reliably use includes data since it's populated asynchronously
      // so just parse model lines instead
      // for (let [lineNumber, count, path] of currentIncludesData) {
      //     console.log(path)
      // }

      let links: Array<languages.ILink> = [];

      let lines = model.getLinesContent();

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        let line = lines[lineIndex];

        let dep = checkForDependency(line);

        if (!dep || dep.type !== "module") continue;

        let link = dep.path;

        let lineNumber = lineIndex + 1;
        let columnNumber = line.indexOf(link) + 1;

        links.push({
          // @note use only package name
          url: new URL(link.split("/", 2)[0], "https://npmjs.com/package/").toString(),

          range: new Range(lineNumber, columnNumber, lineNumber, columnNumber + link.length),

          tooltip: "Open package on NPM registry",
        });
      }

      return { links };
    },
  });
  //#endregion

  //#region signature help provider
  {
    const colorize = (chunk: string) => {
      return editor.colorize(chunk, "glsl-md", {}).then(html =>
        // @note no idea why they add a new line at the end bruh
        html.replace("<br/>", "")
      );
    };

    type BuiltinSignatureInformation = languages.SignatureInformation & {
      builtin: boolean;
      // raw: string
      def: {
        header: string;
        params: string[];
      };
    };

    type UserSignatureInformation = languages.SignatureInformation & {
      name: string;
      def: FunctionDefinition["overloads"][number];
    };

    type SignatureInformation = BuiltinSignatureInformation | UserSignatureInformation;

    const createHybridFunctionHighlight = async (
      name: string,
      def: FunctionDefinition["overloads"][number],
      paramIndex: number
    ) => {
      let header = await colorize(`${def.returnType} ${name}(`);

      let params: string[] = [];

      let paramEntries = [...def.params];

      for (let i = 0; i < paramEntries.length; i += 1) {
        let [paramName, [paramQualifiers, paramType]] = paramEntries[i];

        let paramStr =
          (paramQualifiers.length ? paramQualifiers.join(" ") + " " : "") +
          paramType +
          " " +
          paramName;

        let paramHtml: string;

        if (i === paramIndex) {
          paramHtml = "<b><i>" + (await colorize(paramStr)) + "</i></b>";
        } else {
          paramHtml = '<span style="color:#808080;">' + paramStr + "</span>";
        }

        params.push(paramHtml);
      }

      let ending = await colorize(");");

      return header + params.join(", ") + ending;
    };

    const createBuiltinHighlight = async (
      def: BuiltinSignatureInformation["def"],
      paramIndex: number
    ) => {
      // make a copy so we don't mutate definition
      let params = [...def.params];

      for (let i = 0; i < params.length; i += 1) {
        // @note for better style, color only active parameter and gray out others
        // it looks extra nice
        if (paramIndex === i) {
          params[i] = "<b><i>" + (await colorize(params[i])) + "</i></b>";
        } else {
          // @note bruh style is very strict not to get sanitized (no space, hex color only and ; at the end)
          params[i] = '<span style="color:#808080;">' + params[i] + "</span>";
        }
      }

      return (await colorize(def.header)) + params.join(", ") + ")";
    };

    const updateArgumentNumber = async (
      signatures: SignatureInformation[],
      paramNumber: number
    ) => {
      for (let s of signatures) {
        if ("builtin" in s) {
          // @note bruh it won't update if using same object???
          // nop still doesn't work
          // omg i forgot to await updateArgumentNumber
          // @ts-ignore ts hell
          s.documentation.value = await createBuiltinHighlight(s.def, paramNumber);
        } else {
          // @ts-ignore
          s.documentation.value = await createHybridFunctionHighlight(s.name, s.def, paramNumber);
        }
      }
    };

    languages.registerSignatureHelpProvider("glsl", {
      signatureHelpTriggerCharacters: ["("],
      // @note retrigger character will be included in context.character during active help
      // so it's easy to handle multiple arguments checking for comma
      signatureHelpRetriggerCharacters: [","],
      async provideSignatureHelp(model, position, token, context) {
        let nextCharacter = model.getValueInRange(
          Range.fromPositions(position, position.delta(0, 1))
        );
        let prevCharacter = model.getValueInRange(
          Range.fromPositions(position.delta(0, -1), position)
        );
        if (nextCharacter === "(" || prevCharacter === ")") return;

        console.log("prev sig", context.activeSignatureHelp);

        let lineContentBeforePosition = model
          .getValueInRange(
            new Range(
              position.lineNumber,
              1,
              position.lineNumber,
              position.column
              // model.getLineLastNonWhitespaceColumn(position.lineNumber)
            )
          )
          .trim();

        if (context.activeSignatureHelp) {
          const { activeSignatureHelp } = context;

          // next argument
          if (context.triggerCharacter === ",") {
            console.log(", trigger");

            activeSignatureHelp.activeParameter += 1;
          } else {
            console.log("cursor move / type");

            // @note since we use *, the match will never be null
            let argsBefore = lineContentBeforePosition.match(/[^(]*$/)![0];

            let argNumber = argsBefore.split(",").length - 1;

            console.log("argsBefore: ", argsBefore);

            activeSignatureHelp.activeParameter = argNumber;
          }

          // @ts-ignore
          await updateArgumentNumber(
            activeSignatureHelp.signatures,
            activeSignatureHelp.activeParameter
          );

          //#region change selected signature to correspond the amount of arguments

          let activeSignature = activeSignatureHelp.signatures[
            activeSignatureHelp.activeSignature
          ] as SignatureInformation;
          let paramsNum;

          if ("builtin" in activeSignature) {
            paramsNum = activeSignature.def.params.length;
          } else {
            paramsNum = activeSignature.def.params.size;
          }

          if (activeSignatureHelp.activeParameter >= paramsNum) {
            // find signature with provided number of arguments
            let sigIndex = (activeSignatureHelp.signatures as SignatureInformation[]).findIndex(
              s => {
                if ("builtin" in s) {
                  if (s.def.params.length > activeSignatureHelp.activeParameter) return true;
                } else {
                  if (s.def.params.size > activeSignatureHelp.activeParameter) return true;
                }
              }
            );

            if (sigIndex !== -1) {
              activeSignatureHelp.activeSignature = sigIndex;
            }
          }

          //#endregion

          return {
            value: activeSignatureHelp,
            dispose() {},
          };
        }
        // no active help, create one
        else {
          // @note remove opening ( and extract word
          let wordMatch = lineContentBeforePosition.slice(0, -1).match(/\w+$/);

          if (!wordMatch) return;

          console.log("wordMatch", wordMatch);

          let [word] = wordMatch;

          if (word in parsedOpenGLDocs) {
            // @ts-ignore  as keyof typeof parsedOpenGLDocs
            let builtin = parsedOpenGLDocs[word] as ParsedBuiltinDefinition;

            // first line is description
            let overloads = builtin.decl;

            let signatures: BuiltinSignatureInformation[] = [];
            for (let o of overloads) {
              // @note include opening ( for proper highlighting
              let [match, header, paramsStr] = o.match(/(.+\()(.*)\)/)!;
              let params = paramsStr.split(",").map(p => p.trim());

              let def = { header, params };

              let parameters = [] as SignatureInformation["parameters"];

              for (let fullParam of params) {
                let paramName = fullParam.split(" ").pop()!;

                parameters.push({
                  label: fullParam,
                  documentation: {
                    value: `<code>${await colorize(fullParam)}</code> - ${
                      builtin.params![paramName]
                    }`,
                    supportHtml: true,
                  },
                });
              }

              signatures.push({
                label: `(function) ${builtin.desc}`,
                documentation: {
                  value: await createBuiltinHighlight(def, 0),
                  supportHtml: true,
                },
                parameters,

                builtin: true,
                // raw: o
                def,
              });
            }

            return {
              value: {
                signatures,
                activeSignature: 0,
                activeParameter: 0,
              },
              dispose() {},
            };
          }

          if (dynamicFunctionDefinitionsData.has(word)) {
            let funcDef = dynamicFunctionDefinitionsData.get(word)!;

            let signatures: UserSignatureInformation[] = [];
            for (let o of funcDef.overloads) {
              signatures.push({
                label: `(function) ${word}`,
                documentation: {
                  value: await createHybridFunctionHighlight(word, o, 0),
                  supportHtml: true,
                },
                parameters: [],
                def: o,
                name: word,
              });
            }

            return {
              value: {
                signatures,
                activeSignature: 0,
                activeParameter: 0,
              },
              dispose() {},
            };
          }
        }

        return;
      },
    });
  }
  //#endregion

  //#region color selector

  // colors are only processed for vec3/vec4 when all values are in 0-1 range and declaration spans within one line (no line breaks)
  {
    const numberRegex = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;
    // @note don't use \s so it doesn't match new lines
    const vecRegex = new RegExp(
      String.raw`\bvec[34] *\( *(${numberRegex} *, *${numberRegex} *, *${numberRegex}(?: *, *${numberRegex})?) *\)`,
      "g"
    );

    languages.registerColorProvider("glsl", {
      provideColorPresentations(curModel, { color, range }) {
        if (curModel !== model) return;

        // -1 for index + 3 ("vec")
        let dim = parseFloat(
          model.getLineContent(range.startLineNumber)[range.startColumn - 1 + 3]
        );

        let label = `vec${dim}(${color.red.toFixed(3)}, ${color.green.toFixed(
          3
        )}, ${color.blue.toFixed(3)}${dim === 4 ? `, ${color.alpha.toFixed(3)}` : ""})`;

        return [{ label }];
      },
      provideDocumentColors(curModel) {
        if (curModel !== model) return;

        let colors: languages.IColorInformation[] = [];

        model.getLinesContent().forEach((line, lineIndex) => {
          for (let result of line.matchAll(vecRegex)) {
            let [match, numbers] = result;

            let vec = numbers.split(",").map(s => parseFloat(s));

            // @note test that every component is within 0-1 range
            if (vec.some(v => v < 0 || 1 < v)) {
              return;
            }

            let lineNumber = 1 + lineIndex;
            let startColumn = 1 + result.index!;
            let endColumn = startColumn + match.length;

            colors.push({
              // @note we can add custom properties to access them in provideColorRepresentation
              // so we can preserve vec4 with alpha 1 e.g.
              // BUT it didn't work because when you change color, the editor creates a new color instance without dim
              // so instead pull vec dimension from code with range
              // dim: vec.length,
              color: { red: vec[0], green: vec[1], blue: vec[2], alpha: vec[3] ?? 1 },
              range: {
                startLineNumber: lineNumber,
                startColumn,
                endLineNumber: lineNumber,
                endColumn,
              },
            });
          }
        });

        return colors;
      },
    });
  }
  //#endregion

  //#region code lens

  // @note this is not documented, so I just guessed that it triggers force update for code lenses
  // https://github.com/microsoft/monaco-editor/issues/588
  // looking in codelensController.js confirmed the guess
  let scheduleCodeLensUpdate: () => void;
  // prettier-ignore
  // Parameters<
  //     Exclude<
  //         Parameters<
  //             typeof languages.registerCodeLensProvider
  //         >[1]['onDidChange'],
  //         undefined
  //     >
  // >[0];

  interface IZone {
        view: editor.IViewZone,
        /**
         * id is _undefined_ if zone is not rendered (**collapsed**)
         * and it's a _string_ if the zone is **expanded**
         */
        id?: string | undefined,

        lens: languages.CodeLens
    }

  let currentZones = new Map<string, IZone>();

  // @note flag to prevent updating code lenses during basic editing, as it will sync line numbers automatically
  // otherwise it will rewrite lenses with outdated line number from includes data which is not actual line,
  // resulting in the code lens remaining on the wrong line
  // so we redefine lenses only after shader compile
  // let codeLensUpdateBlock = true;
  // instead just parse code every lens update to sync line

  // regex to string has slashes, so we slice them out
  // let includeDirectiveRegex = new RegExp(String.raw`^#include\s*${includeValueRegex.toString().slice(1, -1)}`);

  // wow actually proper documentation, unlike microsoft
  // https://benoitf.github.io/sample-typedocs/interfaces/__theia_plugin_.codelensprovider.html

  languages.registerCodeLensProvider("glsl", {
    onDidChange(cb) {
      // @note types are incorrect, the function doesn't actually take any arguments
      scheduleCodeLensUpdate = cb as any;

      return {
        dispose() {},
      };
    },
    provideCodeLenses(curModel, token) {
      if (curModel !== model) return;

      // @note ok i have no idea how to prevent lens update and keep modified line number when you hit enter, so just match includes here separately to sync line number
      // and then update this fully on compile

      let lenses: languages.CodeLens[] = [];

      // @note show loading code lens when includes are not loaded
      curModel.getLinesContent().forEach((line, lineIndex) => {
        let dependency = checkForDependency(line);
        if (!dependency) return;

        let includePath = resolvePath(dependency);

        let zone = currentZones.get(includePath);

        let lineNumber = 1 + lineIndex;

        if (zone) {
          // update existing zone
          Object.assign(zone.lens.range, {
            startLineNumber: lineNumber,
            endLineNumber: lineNumber,
          });

          Object.assign(zone.lens.command!, {
            title: zone.id ? "🞨 Collapse Code" : "🡦 Expand Code",
            // @note https://stackoverflow.com/questions/50188534/get-monaco-editor-codelens-info-on-click
            arguments: [zone],
          });

          lenses.push(zone.lens);
        }
        // include is found, but not loaded yet
        else {
          lenses.push({
            id: includePath,

            range: {
              startLineNumber: lineNumber,
              startColumn: 1,
              endLineNumber: lineNumber,
              endColumn: 1,
            },

            command: {
              id: "",
              title: "Loading...",
            },
          });
        }
      });

      return {
        lenses,
        dispose() {},
      };
    },

    // https://stackoverflow.com/questions/40938129/how-to-properly-implement-codelens-in-visual-studio-code
    resolveCodeLens(model, lens) {
      return lens;
    },
  });

  //#endregion

  //#region editor keyboard shortcuts

  // @note add ctrl-shift-p shortcut for command palette instead of default F1
  editor.addKeybindingRule({
    keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP,
    command: "editor.action.quickCommand",
  });

  editorInstance.addAction({
    id: "app.increase-font",
    label: "Increase Font Size",
    keybindings: [
      KeyMod.CtrlCmd | KeyCode.Equal, // Ctrl - "+"
    ],
    run() {
      let fontSize = editorInstance.getOption(editor.EditorOption.fontSize);

      editorInstance.updateOptions({
        fontSize: fontSize + 2,
      });

      // @note update font info for zones
      for (let [
        id,
        {
          view: { domNode },
        },
      ] of currentZones) {
        editorInstance.applyFontInfo(domNode);
      }
    },
  });

  editorInstance.addAction({
    id: "app.decrease-font",
    label: "Decrease Font Size",
    keybindings: [
      KeyMod.CtrlCmd | KeyCode.Minus, // Ctrl - "-"
    ],
    run() {
      let fontSize = editorInstance.getOption(editor.EditorOption.fontSize);

      editorInstance.updateOptions({
        fontSize: Math.max(fontSize - 2, 10),
      });

      for (let [
        id,
        {
          view: { domNode },
        },
      ] of currentZones) {
        editorInstance.applyFontInfo(domNode);
      }
    },
  });

  // @todo lazy load functionality, prioritize critical things first
  // editorInstance.addAction({
  //   id: "app.format-code",
  //   label: "Format Code",
  //   keybindings: [KeyMod.Shift | KeyMod.Alt | KeyCode.KeyF],
  //   async run(editor) {
  //     const model = editor.getModel()!;
  //     const code = model.getValue();
  //     const position = editor.getPosition()!;
  //     const offset = model.getOffsetAt(position);

  //     const { formatted, cursorOffset } = await formatCode(code, offset);

  //     console.log(editor.getAction("editor.action.formatDocument"));

  //     model.setValue(formatted);

  //     const newPosition = model.getPositionAt(cursorOffset);
  //     editor.setPosition(newPosition, "formatting-adjustment");
  //   },
  // });

  {
    // @todo move to :root
    const createWidgetElement = () => {
      let el = document.createElement("div");
      let { style } = el;
      style.setProperty("--tp-base-background-color", "var(--bg)");
      style.setProperty("--tp-button-background-color", "transparent");
      style.setProperty("--tp-button-background-color-hover", "rgba(var(--accent-rgb), 0.3)");
      style.setProperty("--tp-button-background-color-active", "rgba(var(--accent-rgb), 0.7)");
      style.setProperty("--tp-button-background-color-focus", "transparent");
      style.setProperty("--tp-button-foreground-color", "white");
      style.setProperty("--tp-font-family", "Aileron");

      return el;
    };

    const widgetId = "app.widget.tweak";

    const addCloseButton = (pane: Pane) => {
      return pane
        .addButton({
          title: "Close",
        })
        .on("click", () =>
          // @todo types, apparently for removal only id is needed?
          // @ts-ignore
          editorInstance.removeContentWidget({
            getId: () => widgetId,
          })
        );
    };

    editorInstance.addAction({
      id: "app.tweak-value",
      label: "Tweak Value",
      contextMenuGroupId: "1_modification",
      keybindings: [
        // @note bruh why doesn't it prevent default browser shortcut
        // KeyMod.CtrlCmd | KeyCode.KeyT
        KeyMod.Alt | KeyCode.KeyT,
      ],
      run() {
        let position = editorInstance.getPosition()!;
        let wordObj = model.getWordAtPosition(position);

        if (!wordObj) {
          messageController.showMessage("Select a value to tweak", position);
          return;
        }

        // @todo support u/i/vec too?
        if (/^[ui]?vec[2-4]$/.test(wordObj.word)) {
          // vec
          let line = model.getLineContent(position.lineNumber);
          // @note ^ will not work for consequent matches (when setting lastIndex)
          let r = /([ui]?)vec([2-4]) *\(([^)]+)\)/g;
          r.lastIndex = wordObj.startColumn - 1;

          let result = r.exec(line);

          if (!result) return;

          let [_, type, size, value] = result;

          let constrains: {
            step?: number;
            min?: number;
          } = {};

          if (type) {
            constrains.step = 1;

            if (type === "u") {
              constrains.min = 0;
            }
          }

          let components = value
            .trim()
            .split(/ *, */)
            .map(c => parseFloat(c));

          // non numeric vecs
          if (components.some(c => isNaN(c))) {
            messageController.showMessage("You can only tweak numeric vectors", position);
            return;
          }

          const fields = ["x", "y", "z", "w"] as const;
          let vec: { [key in ExtractUnion<typeof fields>]?: number } | number;

          // vec(value)
          // @note expand the vec into n values, otherwise if user wants to preserve vec(value),
          // then they should edit the value directly
          if (components.length === 1) {
            vec = Object.fromEntries(fields.slice(0, parseInt(size)).map(f => [f, components[0]]));
          }
          // vec(x,y,z,w)
          else {
            vec = Object.fromEntries(components.map((c, i) => [fields[i], c]));
          }

          console.log(vec, constrains, type, size);

          let valueStartPos = new Position(position.lineNumber, line.indexOf(value) + 1);

          let widget: editor.IContentWidget = {
            getId: () => widgetId,
            getDomNode() {
              let container = createWidgetElement();

              import("tweakpane").then(({ Pane }) => {
                let pane = new Pane({ container });
                addCloseButton(pane);

                let initialValue = value;
                let prevValue = value;

                let input = pane
                  .addInput({ vec }, "vec", {
                    picker: "inline",
                    expanded: true,
                    // x: { step, min },
                    x: constrains,
                    y: { ...constrains, inverted: true },
                    z: constrains,
                    w: constrains,
                  })
                  .on("change", ({ last, value }) => {
                    // let text = value.x.toFixed(3) + ', ' + value.y.toFixed(3);
                    // parseFloat(toFixed) to remove trailing zeroes
                    let text = Object.values(value)
                      .map(v => (type ? v : parseFloat(v.toFixed(3))))
                      .join(", ");
                    let range = Range.fromPositions(
                      valueStartPos,
                      valueStartPos.delta(0, prevValue.length)
                    );

                    if (last) {
                      model.applyEdits([
                        {
                          range,
                          text: initialValue,
                        },
                      ]);

                      model.pushEditOperations(
                        null,
                        [
                          {
                            range: Range.fromPositions(
                              valueStartPos,
                              valueStartPos.delta(0, initialValue.length)
                            ),
                            text,
                          },
                        ],
                        // @ts-ignore @todo
                        null
                      );

                      initialValue = text;
                    } else {
                      model.applyEdits([
                        {
                          range,
                          text,
                        },
                      ]);
                    }

                    prevValue = text;
                  });

                input.controller_.view.labelElement.style.display = "none";
              });

              return container;
            },

            getPosition: () => ({
              position: new Position(position.lineNumber, wordObj!.startColumn),
              preference: [editor.ContentWidgetPositionPreference.BELOW],
            }),
          };

          // @ts-ignore
          editorInstance.removeContentWidget({
            getId: () => widgetId,
          });
          editorInstance.addContentWidget(widget);
        } else {
          let valueStartPos = new Position(position.lineNumber, wordObj.startColumn);

          let number: number;
          let step: number | undefined;

          if (
            /^-?(?:(?:\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?|\d+[eE][+-]?\d+)[fF]?$/.test(wordObj.word)
          ) {
            // float
            number = parseFloat(wordObj.word);
          } else if (/^-?0[xX][0-9a-fA-F]+[uU]?$/.test(wordObj.word)) {
            // hex
            number = parseInt(wordObj.word, 16);
            step = 1;
          } else if (/^-?0[0-7]+[uU]?$/.test(wordObj.word)) {
            // octal
            number = parseInt(wordObj.word, 8);
            step = 1;
          } else if (/^-?\d+$/.test(wordObj.word)) {
            // integer, set step to 1
            number = parseInt(wordObj.word);
            step = 1;
          } else {
            messageController.showMessage(
              "You can only tweak numerical values or constant vectors",
              position
            );

            return;
          }

          let widget: editor.IContentWidget = {
            getId: () => widgetId,

            getDomNode() {
              /*
    border: 2px solid var(--border);
        background: transparent;
        color: white;
        text-transform: uppercase;
        font-family: 'aileron';
        font-weight: normal;
                            */
              let container = createWidgetElement();

              // @note split chunk
              import("tweakpane").then(({ Pane }) => {
                let pane = new Pane({ container });
                addCloseButton(pane);

                let initialValue = wordObj!.word;
                let prevValue = wordObj!.word;

                // @note push to undo stack current value
                let input = pane
                  .addInput({ number }, "number", { step })
                  .on("change", ({ last, value }) => {
                    // don't add a dot to integers
                    let text = step ? value.toString() : value.toFixed(3);
                    let range = Range.fromPositions(
                      valueStartPos,
                      valueStartPos.delta(0, prevValue.length)
                    );

                    if (last) {
                      // @note revert to the initial reference value first
                      model.applyEdits([
                        {
                          range,
                          text: initialValue,
                        },
                      ]);

                      console.log(text, "<-", initialValue, "<-", prevValue);

                      // @note push single edit operation relative to the starting value
                      model.pushEditOperations(
                        null,
                        [
                          {
                            range: Range.fromPositions(
                              valueStartPos,
                              valueStartPos.delta(0, initialValue.length)
                            ),
                            text,
                          },
                        ],
                        // @ts-ignore @todo
                        null
                      );

                      // @note update reference value for consequent edits
                      initialValue = text;
                    } else {
                      model.applyEdits([
                        {
                          range,
                          text,
                        },
                      ]);
                    }

                    prevValue = text;
                  });

                input.controller_.view.labelElement.style.display = "none";
              });

              return container;
            },

            getPosition: () => ({
              position: new Position(position.lineNumber, wordObj!.startColumn),
              preference: [editor.ContentWidgetPositionPreference.BELOW],
            }),
          };

          // @ts-ignore
          editorInstance.removeContentWidget({
            getId: () => widgetId,
          });
          editorInstance.addContentWidget(widget);
        }
      },
    });
  }

  //#endregion

  //#region rename provider
  languages.registerRenameProvider("glsl", {
    // @ts-ignore
    resolveRenameLocation(model, position, token) {
      let wordObj = model.getWordAtPosition(position);

      console.log("resolveRenameLocation", position, wordObj);

      if (!wordObj)
        return {
          rejectReason: "You need to select a symbol",
        };

      let def =
        dynamicDefinitionsData.findLast(d => {
          return d.range.containsPosition(position) && d.name === wordObj!.word;
        }) ?? dynamicFunctionDefinitionsData.get(wordObj!.word);

      if (!def)
        return {
          rejectReason: "This symbol cannot be renamed",
        };

      console.log("found def:", def, editorAst);

      if ("type" in def && def.qualifiers) {
        if (def.qualifiers.includes("uniform")) {
          return {
            rejectReason: "You cannot rename uniforms directly. But it is possible during export",
          };
        } else if (def.qualifiers.includes("in")) {
          return {
            rejectReason:
              "You cannot rename input bindings directly. But it is possible during export",
          };
        }
      }

      // @note it's required for provide edits to be called...
      return {
        text: wordObj.word,
        range: new Range(
          position.lineNumber,
          wordObj.startColumn,
          position.lineNumber,
          wordObj.endColumn
        ),
      };
    },

    // @ts-ignore
    provideRenameEdits(model, position, newName, token) {
      if (!/^[a-zA-Z_]\w*$/.test(newName)) {
        const rejectReason = "Invalid symbol name";

        // @note for some reason here message is not shown, so we do it ourselves
        messageController.showMessage(rejectReason, position);
        return {
          rejectReason,
        };
      }

      let wordObj = model.getWordAtPosition(position)!;
      let curName = wordObj.word;

      // @note findLast - for proper handling of nested scopes
      let def = (dynamicDefinitionsData.findLast(d => {
        return d.range.containsPosition(position) && d.name === curName;
      }) ?? dynamicFunctionDefinitionsData.get(curName))!;

      let edits: languages.IWorkspaceTextEdit[] = [];

      const addEditFromNode = (node: AstNode & { whitespace?: string | undefined }) => {
        let {
          location: { start, end },
        } = node;

        edits.push({
          resource: model.uri,
          textEdit: {
            // @note include whitespace into edit instead of changing range
            text: newName + (node.whitespace ?? ""),
            range: new Range(start.line, start.column, end.line, end.column),
          },
          // @todo another stupid typing?
          versionId: undefined,
        });
      };

      // @todo editor scope type for easier determination
      if ("type" in def) {
        // use rename* code to generate edits
        for (let node of def.scope.bindings.get(curName)!.references) {
          if (node.type === "declaration") {
            addEditFromNode(node.identifier);
          } else if (node.type === "identifier") {
            addEditFromNode(node);
          } else if (node.type === "parameter_declaration" && "identifier" in node.declaration) {
            addEditFromNode(node.declaration.identifier);
          }
        }

        // @note the problem with this approach that it can't be undone!
        // ctrl-z won't work
        // model.setValue(generate(editorAst));

        return { edits };
      } else if ("overloads" in def) {
        for (let node of editorAst.scopes[0].functions.get(curName)!.references) {
          if (node.type === "function") {
            addEditFromNode(node["prototype"].header.name);
          } else if (
            node.type === "function_call" &&
            // @ts-ignore @todo
            node.identifier.type === "postfix"
          ) {
            // @ts-ignore @todo
            addEditFromNode(node.identifier.expression.identifier.specifier);
          } else if (node.type === "function_call" && "specifier" in node.identifier) {
            // @ts-ignore @todo
            addEditFromNode(node.identifier.specifier);
          }
        }

        return { edits };
      } else {
        for (let node of def.scope.types.get(curName)!.references) {
          if (node.type === "struct") {
            addEditFromNode(node.typeName);
          } else if (node.type === "identifier") {
            addEditFromNode(node);
          } else if (node.type === "function_call" && "specifier" in node.identifier) {
            // @ts-ignore @todo
            addEditFromNode(node.identifier.specifier);
          }
        }

        return { edits };
      }
    },
  });

  //#endregion

  //#region on model content change, ast processing + update zones

  {
    const createIncludeCodeNode = (code: string) => {
      let domNode = document.createElement("code");

      editorInstance.applyFontInfo(domNode);

      Object.assign(domNode.style, {
        paddingLeft: "10px",
        // @todo vue css var bind
        borderLeft: "1px solid #c27ba0",
        // transition: 'height 300ms',

        // @fix @note user selection in zones
        // @todo cssstyledecl doesn't have native user-select key????
        // @ts-ignore
        "user-select": "text",
        "-webkit-user-select": "text",
        "z-index": 100,
      } satisfies Partial<CSSStyleDeclaration>);

      // @fix @note mouse move event was resetting the focus bruh
      domNode.onmousemove = e => e.stopPropagation();

      editor.colorize(code, "glsl", {}).then(html => (domNode.innerHTML = html));

      return domNode;
    };

    let toggleIncludeViewCommand = editorInstance.addCommand(0, (ctx, zone: IZone) => {
      editorInstance.changeViewZones(zonesAccessor => {
        if (zone.id) {
          // remove
          zonesAccessor.removeZone(zone.id);
          zone.id = undefined;
        } else {
          // add
          zone.id = zonesAccessor.addZone(zone.view);
        }

        scheduleCodeLensUpdate();
      });
    })!;

    let includesAstCache = new Map<string, Program>();

    // @todo move to ast utils?
    const serializeStructNode = (node: StructNode) => {
      let parts = generate(node)
        .trim()
        .replace(/\s{2,}/g, " ")
        .replace(/\s,/, ",") // float a, b;
        .split(/{|}/);

      return (
        parts[0].trim() +
        " {\n" +
        parts[1]
          .split(/\s*;\s*/g)
          .map(d => "\t" + d.trim() + ";")
          .slice(0, -1) // remove empty line
          .join("\n") +
        "\n}"
      );
    };

    const extractTypeString = (specifier: KeywordNode | IdentifierNode | StructNode) =>
      (specifier as KeywordNode).token ??
      (specifier as IdentifierNode).identifier ??
      (specifier as StructNode).typeName?.identifier ??
      // @note by spec structs definitions are not allowed ib func params
      // so it only applies to anonymous struct vars
      // 'struct';
      serializeStructNode(specifier as StructNode);

    type FunctionDefinitionParamsType = FunctionDefinition["overloads"][number]["params"];

    const buildFunctionDefinitionFromPrototypeNode = ({
      header,
      parameters,
    }: FunctionPrototypeNode) => {
      let returnType = extractTypeString(header.returnType.specifier.specifier);

      let params = new Map() as FunctionDefinitionParamsType;

      // params can be undefined
      parameters?.forEach((p: ParameterDeclarationNode, i) => {
        let qualifiers = p.qualifier.map(q => q.token);

        let type = extractTypeString(
          p.declaration.type === "parameter_declarator"
            ? (p.declaration.specifier as TypeSpecifierNode).specifier
            : p.declaration.specifier
        );

        // @note hoisted func prototypes may not have names for params, only types
        // so use a placeholder and we'll replace entire def later with function
        let identifier =
          (p.declaration as ParameterDeclaratorNode)?.identifier?.identifier ?? "arg_" + i;

        params.set(identifier, [qualifiers, type]);
      });

      // add semicolon at the end for consistency with glsl builtins
      let documentation = `${returnType} ${header.name.identifier}(${[...params.entries()]
        .map(
          ([name, [qualifiers, type]]) =>
            `${qualifiers.length ? qualifiers.join(" ") + " " : ""}${type} ${name}`
        )
        .join(", ")});`;

      return [
        {
          returnType,
          params,
        },
        documentation,
      ] as const;
    };

    /**
     *
     * @param a
     * @param b
     * @returns `true` - identical, `false` - different
     */
    const compareFunctionOverloads = (
      a: FunctionDefinitionParamsType,
      b: FunctionDefinitionParamsType
    ) => {
      if (a.size !== b.size) return false;

      let aArgs = [...a.values()].map(([q, t]) => t);
      let bArgs = [...b.values()].map(([q, t]) => t);

      return aArgs.every((v, i) => v === bArgs[i]);
    };

    const onChangeModelContent = async () => {
      let linesContent = model.getLinesContent();

      performance.mark("process-includes-start");

      let processedCode = await processIncludes(linesContent, currentIncludesData);

      console.log(performance.measure("processed-code", "process-includes-start"));

      emit("change", processedCode);

      try {
        // @todo why does it fail here
        // repro: type "a" before void main

        // let purgedCache = new Map();

        let globalScopeList = [] as (Scope & { startLineNumber?: number })[];

        // @note leave in cache only currently used includes (so others will be gc'ed)
        // @todo use weakset instead
        // includesAstCache = purgedCache;
        // autocompletionDynamicDefinitions.clear();

        let fullModelRange = model.getFullModelRange();
        let fullModelEndPosition = fullModelRange.getEndPosition();

        performance.mark("parse-includes-start");

        // @note labels O_O
        parse_includes: for (let [line, height, path, code, error] of currentIncludesData) {
          if (error) continue parse_includes;

          let ast = includesAstCache.get(path);

          if (!ast) {
            console.log("parse include", path);
            ast = await parseAsync(code!);
            includesAstCache.set(path, ast);
          }

          let globalScope = ast.scopes[0] as Scope & {
            startLineNumber: number;
          };

          // @note set this custom prop, so we override bindings/types starting range position
          // @todo i hate this solution tbh, needs more generalization for defs creation
          globalScope.startLineNumber = line + 1;

          globalScopeList.push(globalScope);

          // if (ast) {
          //     purgedCache.set(path, ast)
          // }
          // else {
          //     purgedCache.set(path, parse(code!))
          // }

          // @note empty the map, so we don't process these later twice
          // @note DO NOT MUTATE anything, since it's cached and will fail on next run
          // besides it's not even needed, since we don't touch includes scopes functions anymore
          // globalScope.functions.clear();

          //#endregion
        }

        console.log(performance.measure("parsed-includes", "parse-includes-start"));

        performance.mark("parse-model-start");

        // @note use worker
        editorAst = await parseAsync(model.getValue());
        // editorAst = parse(model.getValue(), { includeLocation: true });
        // console.log(ast.scopes)

        console.log(performance.measure("parsed-model", "parse-model-start"));

        // @note clear everything ONLY AFTER everything was parsed successfully
        // so we don't lose stuff while typing
        dynamicFunctionDefinitionsData.clear();
        dynamicDefinitionsData.length = 0;
        semanticTokensData.length = 0;

        //#region process functions from includes
        // @note do it separately because we don't need location data for semantic tokens inside includes, so we keep only name and definition
        for (let scope of globalScopeList)
          for (let [name, { references }] of scope.functions) {
            // @note dang using type guard in find is cool
            // https://github.com/microsoft/TypeScript/issues/38945#issuecomment-639353221

            // since we don't care about highlighting in includes code, we can work with function nodes straight away
            // unlike for editor scope functions that will need semantic highlighting
            let nodes = references.filter((r): r is FunctionNode => r.type === "function")!;
            let defs: Array<[string, FunctionDefinition["overloads"][number]]> = [];

            for (let node of nodes) {
              let [overloadDef, documentation] = buildFunctionDefinitionFromPrototypeNode(
                node.prototype
              );

              defs.push([documentation, overloadDef]);

              // the function is overloaded
              if (!dynamicFunctionDefinitionsData.has(name)) {
                dynamicFunctionDefinitionsData.set(name, {
                  kind: languages.CompletionItemKind.Function,

                  documentation: {
                    value: "",
                  },

                  range: Range.fromPositions(
                    { lineNumber: scope.startLineNumber!, column: 1 },
                    fullModelEndPosition
                  ),

                  overloads: [],

                  sortText: AutocompletionOrder.Function.toString(),
                });
              }
            }

            let funcDef = dynamicFunctionDefinitionsData.get(name);

            if (!funcDef) {
              console.warn(name, "func definition not found");
              continue;
            }

            // sort by number of arguments
            defs = defs.sort((a, b) => a[1].params.size - b[1].params.size);

            // wrap docs in markdown
            funcDef.documentation.value = glslMdWrap(defs.map(d => d[0]).join("\n\n"));
            funcDef.overloads = defs.map(d => d[1]);
          }

        let globalScopeEditor = editorAst.scopes[0];

        // @note process includes scopes as well, because they may contain structs (types) and other stuff in the future?
        globalScopeList.push(globalScopeEditor);

        // @note bruh actually just process functions separately
        for (let [name, { references }] of globalScopeEditor.functions) {
          if (name === "main") continue;

          // let docs: string[] = [];
          let defs: Array<[string, FunctionDefinition["overloads"][number]]> = [];

          references_label: for (let r of references) {
            /* @note
                        there are three cases:

                        1. "function" - function is both declared and defined
                        2. "function_prototype" - function declaration (no body)
                        3. "function_call" - when function is invoked

                        by order either "function" or "function_prototype" always comes first
                        before any calls

                        BUT if there's proto, then func may come AFTER calls

                        (technically having only proto without body is possible and won't error
                        but it can't be called resulting in error)

                        we need to collect locations of these calls for semantic tokens,
                        but for that we have to have entry in map already

                        so it would be easy to just record whatever comes first func or func_proto
                        BUT the functions can also be overloaded with a different set of parameters/return types
                        which means we'll have to check both func and proto if they're actually different
                        since one overload may be declared and then defined and the other defined straight away

                        overloads only differ by argument types (without qualifiers), so there can't be overloads with same parameters but different return type


                        */
            if (r.type === "function_prototype" || r.type === "function") {
              let prototype = r.type === "function_prototype" ? r : r.prototype;

              // @note name, length exist in ts types x_x, so sometimes it's not trivial to find the problem
              // that you used some global var instead of the thing you actually need
              addSemanticTokenData(prototype.header.name.location.start, name.length, "function");

              let [overloadDef, documentation] =
                buildFunctionDefinitionFromPrototypeNode(prototype);

              // overload declaration or proto goes after function body
              if (dynamicFunctionDefinitionsData.has(name)) {
                // @note technically we could just do existingDef.documentation.value.includes(documentation)
                // but i don't really like this solution, not stable enough
                // so check arguments types instead
                for (let oi = 0; oi < defs.length; oi += 1) {
                  let o = defs[oi][1];

                  // if we already have this definition, then go to the next reference
                  if (compareFunctionOverloads(o.params, overloadDef.params)) {
                    // @note replace def by data from function node (if it was generated by func_prototype with unnamed params)
                    if (r.type === "function") {
                      o.params = overloadDef.params;
                      // docs order is synced with overloads order, update it if we have proto stored
                      defs[oi][0] = documentation;
                    }

                    continue references_label;
                  }
                }

                // the definition is a new overload
                defs.push([documentation, overloadDef]);
              }
              // new definition
              else {
                defs.push([documentation, overloadDef]);

                dynamicFunctionDefinitionsData.set(name, {
                  kind: languages.CompletionItemKind.Function,

                  documentation: {
                    value: "",
                  },

                  range: Range.fromPositions(
                    {
                      // @note use end location, because recursions are not supported in glsl
                      lineNumber: r.location.end.line,
                      column: r.location.end.column,
                    },
                    fullModelEndPosition
                  ),

                  overloads: [],

                  sortText: AutocompletionOrder.Function.toString(),
                });
              }
            }
            // function reference, when it's called, we should already have a definition in our map
            else {
              // @todo technically we can find the particular overload by checking
              // reference.args and infer types from literal values or identifiers, which types we know
              // in this case it makes sense to do all function processing after we process bindings
              // but let's limit it to unified definition for now

              // let def = autocompletionDynamicDefinitions.get(name) as FunctionDefinition;

              // def.refs.push(r.identifier.specifier.location.start);

              // now we just do it simple

              let loc = r.identifier.specifier.location.start;

              addSemanticTokenData(loc, name.length, "function");
            }
          }

          let funcDef = dynamicFunctionDefinitionsData.get(name);

          if (!funcDef) {
            console.warn(name, "func definition not found");
            continue;
          }

          defs = defs.sort((a, b) => a[1].params.size - b[1].params.size);

          // @todo should be sorted
          if (defs.length) {
            let docs = funcDef.documentation;

            if (docs.value) {
              docs.value = glslMdWrap(
                // remove ``` md
                docs.value.replace(/^.+\r?\n|\r?\n.+$/g, "") +
                  "\n\n" +
                  defs.map(d => d[0]).join("\n\n")
              );
            } else {
              docs.value = glslMdWrap(defs.map(d => d[0]).join("\n\n"));
            }
          }
          // @note concat so we
          // 1) don't overwrite existing defs from includes
          // 2) expand if user defines new overloads for included functions
          funcDef.overloads = funcDef.overloads.concat(defs.map(d => d[1]));
        }

        // console.log('dynamicFunctionDefinitionsData', dynamicFunctionDefinitionsData)

        ///// @todo test icons, delete

        // for (let i = 0; i < 27; i += 1) {
        //     autocompletionDynamicDefinitions.set('a' + i.toString().padStart(3, '0'), {
        //         kind: i as languages.CompletionItemKind,
        //         insertText: ''
        //     })
        // }
        // for (let i = 100; i < 114; i += 1) {
        //     autocompletionDynamicDefinitions.set('a' + i.toString().padStart(3, '0'), {
        //         kind: i as languages.CompletionItemKind,
        //         insertText: ''
        //     })
        // }

        /////

        //#region process global things
        for (let scope of globalScopeList) {
          let { bindings, types, startLineNumber } = scope;
          for (let [name, binding] of bindings) {
            let { initializer } = binding;

            if (initializer.type === "declaration") {
              let qualifiers =
                initializer.specified_type.qualifiers?.map((q: KeywordNode) => q.token) ?? [];

              let type = extractTypeString(initializer.specified_type.specifier.specifier);

              let docs = "";
              // @todo ts proposal to narrow type in const records
              // https://www.typescriptlang.org/play?#code/MYewdgzgLgBAtgQwA4wLwwN4Cga5gawFMBPAQQC4YByUqgGhzyOICFKqWqsBfLLAG0KwIIOIQDKUAE4BLMAHNK0WQrTUqAbj4yAZgAoRYySvkw58ZAEpseGKEghBAOn4h5exEgDahidLnyALqWPEA
              if (name in editorBuiltins) {
                docs = "\n\n" + editorBuiltins[name as keyof typeof editorBuiltins];
              } else if (qualifiers.find(q => q === "out")) {
                docs = "\n\n" + editorBuiltins["\0out"];
              }

              // @todo use loc of name identifier
              let locationStart = binding.initializer.location.start;

              // @todo are qualifiers actually always present???
              let def = {
                name,

                kind:
                  // @todo incorrect type inference
                  // @fix by using `as const`
                  qualifiers.find(q => q === "uniform")
                    ? (CustomCompletionItemKind.Misc as const)
                    : qualifiers.find(q => q === "in")
                      ? (languages.CompletionItemKind.Constant as const)
                      : (languages.CompletionItemKind.Variable as const),

                documentation: {
                  value:
                    glslMdWrap(
                      qualifiers.length
                        ? `${qualifiers.join(" ")} ${type} ${name}`
                        : `${type} ${name}`
                    ) + docs,
                },

                type,
                qualifiers,

                range: Range.fromPositions(
                  startLineNumber
                    ? // definition from includes
                      {
                        lineNumber: startLineNumber,
                        column: 1,
                      }
                    : // definition from editor
                      {
                        lineNumber: locationStart.line,
                        column: locationStart.column,
                      },
                  fullModelEndPosition
                ),
                scope,

                sortText: (qualifiers.some(q => ["uniform", "in", "out"].includes(q))
                  ? AutocompletionOrder.UniformsInOut
                  : AutocompletionOrder.VarConst
                ).toString(),
              } satisfies VarConstDefinition;

              dynamicDefinitionsData.push(def);
            }
          }

          for (let [name, { references }] of types) {
            let structNode = references.find((r): r is StructNode => r.type === "struct");

            // @note struct node may not be present in the editor's global scope
            // if we use a struct from include in our code
            // meaning the definition should already be stored
            if (structNode) {
              // @note again use start loc so we can hover on definition itself
              let {
                location: { start },
              } = structNode;

              dynamicDefinitionsData.push({
                name,

                kind: languages.CompletionItemKind.Struct,

                documentation: {
                  value: glslMdWrap(serializeStructNode(structNode)),
                },

                range: Range.fromPositions(
                  startLineNumber
                    ? {
                        lineNumber: startLineNumber,
                        column: 1,
                      }
                    : {
                        lineNumber: start.line,
                        column: start.column,
                      },
                  fullModelEndPosition
                ),

                scope,
                // @note place it lower than vars and functions
                sortText: AutocompletionOrder.Struct.toString(),
              });
            }

            references
              // @note don't actually filter, process all of them
              //.filter(r => r.type === 'identifier')
              .forEach(r => {
                // @note get identifier node from struct

                addSemanticTokenData(
                  r.type === "struct" ? r.typeName.location.start : r.location.start,
                  name.length,
                  "type",
                  "struct"
                );
              });
          }
        }
        //#endregion

        //#region process scoped vars/consts
        for (let scope of editorAst.scopes.slice(1)) {
          let { name: scopeName, bindings, types, location } = scope;

          for (let [name, binding] of bindings) {
            let { initializer } = binding;

            if (
              initializer.type === "declaration" ||
              initializer.type === "parameter_declaration"
            ) {
              let type: string;
              let qualifiers: string[] | undefined;
              let docs = "";

              if (initializer.type === "declaration") {
                type = extractTypeString(initializer.specified_type.specifier.specifier);

                // @note it can be null
                qualifiers =
                  initializer.specified_type.qualifiers?.map((q: KeywordNode) => q.token) ?? [];
              } else if (initializer.type === "parameter_declaration") {
                type = extractTypeString(initializer.declaration.specifier.specifier);

                // @note it can be empty array
                // @todo make it null instead
                qualifiers = initializer.qualifier.map((q: KeywordNode) => q.token);

                docs = "\n\n" + `\`${scopeName}\` parameter`;
              } else {
                console.warn("Unhandled initializer type!", initializer);

                continue;
              }

              let def = {
                name,

                kind: languages.CompletionItemKind.Variable as const,

                type,
                qualifiers,

                documentation: {
                  value:
                    glslMdWrap(
                      qualifiers.length
                        ? `${qualifiers.join(" ")} ${type} ${name}`
                        : `${type} ${name}`
                    ) + docs,
                },

                range: new Range(
                  initializer.location.start.line,
                  // @note use start, so hover works on the declaration as well
                  initializer.location.start.column,
                  location.end.line,
                  location.end.column
                ),

                scope,

                sortText: AutocompletionOrder.VarConst.toString(),
              } satisfies VarConstDefinition;

              dynamicDefinitionsData.push(def);
            }
          }

          for (let [name, { references }] of types) {
            let structNode = references.find((r): r is StructNode => r.type === "struct")!;

            let {
              location: { start: structLocation },
            } = structNode;

            dynamicDefinitionsData.push({
              name,

              kind: languages.CompletionItemKind.Struct,

              documentation: {
                value: glslMdWrap(serializeStructNode(structNode)),
              },

              range: new Range(
                structLocation.line,
                structLocation.column,
                location.end.line,
                location.end.column
              ),

              scope,

              sortText: AutocompletionOrder.Struct.toString(),
            });

            references.forEach(r => {
              addSemanticTokenData(
                r.type === "struct" ? r.typeName.location.start : r.location.start,
                name.length,
                "type",
                "struct"
              );
            });
          }
        }

        //#endregion

        scheduleSemanticTokensUpdate();
      } catch (e) {
        console.log(e);
      }

      // console.log('dynamicDefinitionsData', dynamicDefinitionsData)

      editorInstance.changeViewZones(zonesAccessor => {
        let newZones: typeof currentZones = new Map();

        currentIncludesData.forEach(([lineNumber, linesCount, includePath, code, error]) => {
          if (error) return;

          if (currentZones.has(includePath)) {
            let zone = currentZones.get(includePath)!;
            zone.view.afterLineNumber = lineNumber;

            // if zone active, update layout
            if (zone.id) {
              zonesAccessor.layoutZone(zone.id);
            }

            newZones.set(includePath, zone);

            // delete copied zone, so only removed includes are left
            currentZones.delete(includePath);
          } else {
            let newZone: IZone = {
              view: {
                afterLineNumber: lineNumber,
                heightInLines: linesCount,
                domNode: createIncludeCodeNode(code!),
                //     onComputedHeight() {
                //     let includeCodeEditorInstance = editor.create(domNode, {
                //         theme: "glsl-theme",
                //         language: 'glsl',
                //         readOnly: true,

                //         value: '#version 300es\ntest code',

                //         minimap: { enabled: false },

                //         lineNumbers: 'off'
                //     })
                // }
              },

              lens: {
                id: includePath,

                range: {
                  startLineNumber: lineNumber,
                  startColumn: 1,
                  endLineNumber: lineNumber,
                  endColumn: 1,
                },

                command: {
                  id: toggleIncludeViewCommand,
                  title: "",
                },
              },
            };

            newZones.set(includePath, newZone);
          }
        });

        // delete zones for removed includes
        for (let [key, { id }] of currentZones) {
          if (id) {
            zonesAccessor.removeZone(id);
          }
        }

        currentZones = newZones;

        // @todo if there are no code lens this is undefined at first?
        scheduleCodeLensUpdate?.();
      });
    };

    editorInstance.onDidChangeModelContent(
      debounce(onChangeModelContent, 500, {
        leading: false,
        trailing: true,
      })
    );

    // @note initial render
    onChangeModelContent();
  }

  //#endregion
});
</script>

<style module lang="less">
.editor-container {
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
