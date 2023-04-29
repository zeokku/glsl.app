import { languages } from "monaco-editor";
import { glslDictionary } from "./dictionary";
import parsedOpenGLDocs from "./parsedOpenGLDocs";
import { glslMdWrap } from "@/utils/glslMdWrap";
import { getDocsLinkFor } from "@/utils/getOpenGLDocsUrl";

// @note due to circular import the enum was undefined\
// https://stackoverflow.com/a/54443914/14776286
export const enum CustomCompletionItemKind {
  Circuit = 100, // circuit-board [gl_vars]
  Extensions = 101, // extensions [include <>]
  FileCode = 102, // file-code [include ""]
  Flame = 103, // flame
  Filter = 104, // filter [macro defines]
  Heart = 105, // heart
  Pass = 106, // pass (checkmark)
  Square = 107, // primitive-square [glsl builtin funcs]
  Rocket = 108, // rocket
  Ruby = 109, // ruby
  Save = 110, // save
  Sparkle = 111, // sparkle, @todo not included?
  Star = 112, // star-empty [package includes, lygia]
  Misc = 113, // symbol-misc
}

export const enum AutocompletionOrder {
  VarConst,
  Function,
  UniformsInOut,
  BuiltinFunction,
  Struct,
}

// @note extend icons
// @todo doesn't work
// declare global {
//     namespace languages {
//         enum CompletionItemKind{}
//     }
// }

export const staticSuggestions = [
  {
    label: "#include <...>",
    // @ts-expect-error
    kind: CustomCompletionItemKind.Extensions,
    documentation: "Include code from NPM package",
    insertText: "#include <${1:pacakge}>",
    // insertText: "#include <$0>",
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: "a",
    command: {
      id: "editor.action.triggerSuggest",
    },
  },
  {
    label: '#include "..."',
    // @ts-expect-error
    kind: CustomCompletionItemKind.FileCode,
    documentation: "Include code from a direct link",
    insertText: '#include "${1:url}"',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: "b",
  },

  {
    label: "#region",
    kind: languages.CompletionItemKind.Snippet,
    documentation: "Start of a foldable region",
    insertText: "#pragma region ${1:name}",
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: "f",
  },
  {
    label: "#endregion",
    kind: languages.CompletionItemKind.Snippet,
    documentation: "End of a foldable region",
    insertText: "#pragma endregion",
    sortText: "g",
  },

  //#region pre processing

  {
    label: "#define",
    kind: CustomCompletionItemKind.Filter,
    documentation: "Define a new preprocessor definition",
    insertText: "#define ${1:NAME} ${2:VALUE}",
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: "h",
  },
  {
    label: "#undef",
    kind: CustomCompletionItemKind.Filter,
    documentation: "Remove preprocessor definition",
    insertText: "#undef ${1:NAME}",
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: "h",
  },
  {
    label: "#if",
    kind: CustomCompletionItemKind.Filter,
    documentation: "#if", // @todo
    insertText: "#if ${1:MACRO}",
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: "i",
  },
  {
    label: "#elif",
    kind: CustomCompletionItemKind.Filter,
    documentation: "#elif", // @todo
    insertText: "#elif ${1:MACRO}",
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: "j",
  },
  {
    label: "#else",
    kind: CustomCompletionItemKind.Filter,
    documentation: "#else", // @todo
    insertText: "#else",
    sortText: "j",
  },
  {
    label: "#ifdef",
    kind: CustomCompletionItemKind.Filter,
    documentation: "#ifdef", // @todo
    insertText: "#ifdef ${1:MACRO}",
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: "i",
  },
  {
    label: "#ifndef",
    kind: CustomCompletionItemKind.Filter,
    documentation: "#ifndef", // @todo
    insertText: "#ifndef ${1:MACRO}",
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    sortText: "i",
  },

  {
    label: "#endif",
    kind: CustomCompletionItemKind.Filter,
    documentation: "#endif", // @todo
    insertText: "#endif",
    sortText: "k",
  },

  //#endregion

  {
    label: "if { ... } else { ... }",
    kind: languages.CompletionItemKind.Snippet,
    insertText:
      // prettier-ignore
      [
                "if (${1:condition}) {",
                "\t$0",
                "}${2: else {",
                "\t",
                "\\}}"
            ].join("\n"),

    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "if-else statement",
  },

  //#region glsl dictionary

  ...glslDictionary.keywords.map(k => ({
    label: k,
    insertText: k,
    kind: languages.CompletionItemKind.Keyword,
  })),

  ...glslDictionary.typeKeywords.map(k => ({
    label: k,
    insertText: k,
    kind: languages.CompletionItemKind.Interface,
  })),
  //#endregion

  //#region glsl built-in functions

  ...Object.entries(parsedOpenGLDocs).map(
    ([name, info]): Omit<languages.CompletionItem, "range"> => ({
      label: name,
      documentation: {
        value: [
          glslMdWrap(info.decl.join("\n\n")),

          // @note match only full word
          info.desc.replace(new RegExp(String.raw`\b${name}\b`), "**`" + name + "`**"),

          `[Open in docs](${getDocsLinkFor(name)})`,
        ].join("\n\n"),
      },
      // @note proper insertText is updated in autocompletion
      insertText: name,
      // insertText: name.startsWith("gl_") ? name : `${name}($0)`,
      // @ts-expect-error
      kind: name.startsWith("gl_")
        ? CustomCompletionItemKind.Circuit
        : CustomCompletionItemKind.Square,
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
      // @note sort over keywords and etc BUT below variables
      sortText: AutocompletionOrder.BuiltinFunction.toString(),
    })
  ),
  //#endregion
] satisfies Omit<languages.CompletionItem, "range">[];
