import { editor, languages } from "monaco-editor";
import { glslDictionary } from "./dictionary";

// @note updating tokens on fly doesn't work, because it's all compiled
// so try to make a small subset for highlighting hovers and defs
// export const structTypeTokens: string[] = ["ITest"];

editor.defineTheme("glsl-theme", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "569CD6" },

    { token: "identifier", foreground: "d4d4d4" },
    { token: "identifier.field", foreground: "c8c8c8", fontStyle: "italic" },
    { token: "identifier.builtin", foreground: "81C784", fontStyle: "underline" },
    { token: "identifier.uniform", fontStyle: "bold" },
    { token: "identifier.out", fontStyle: "underline" },

    // 12ccff -> 51daff -> 94cddc
    { token: "function", foreground: "94cddc", fontStyle: "italic" },
    { token: "function.builtin", foreground: "ff9f12", fontStyle: "italic" },
    { token: "function.main", fontStyle: "bold underline" },

    { token: "type", foreground: "4EC9B0" },
    { token: "type.struct", fontStyle: "bold italic" },

    // { token: "number", foreground: "" },
    // { token: "number.float", foreground: "" },
    // { token: "number.hex", foreground: "" },

    // { token: "string", foreground: "" },
    // { token: "string.quote", foreground: "" },

    { token: "directive", foreground: "c27ba0", fontStyle: "bold" },
    { token: "directive.defined", fontStyle: "italic" },
    { token: "directive.macro", foreground: "729F9D" },

    { token: "comment", foreground: "6A9955", fontStyle: "italic" },
    { token: "comment.todo", foreground: "FF6E40", fontStyle: "bold italic" },
    { token: "comment.note", foreground: "EC407A", fontStyle: "bold italic" },
  ],
  colors: {
    "editor.background": "#0a0118",
    // "editor.foreground": "#000000",
    // "editorBracketHighlight.foreground1": "#FFA64D", //B48EAD
    // "editorBracketHighlight.foreground2": "#64B5F6", //A3BE8C
    // "editorBracketHighlight.foreground3": "#81C784", //EBCB8B
    // "editorBracketHighlight.foreground4": "#FF69B4", //D08770
    // "editorBracketHighlight.foreground5": "#BF616A",
    // "editorBracketHighlight.foreground6": "#abb2c0",
    "editorBracketHighlight.unexpectedBracket.foreground": "#F44747", //db6165
  },
});

languages.register({ id: "glsl" });
// https://github.com/microsoft/monaco-editor/blob/main/src/basic-languages/cpp/cpp.ts
languages.setLanguageConfiguration("glsl", {
  // @note this affects autocompletion, and because # was not a part of the word by default #region snippets didn't work
  // + add proper float number def so model.wordAtPosition return full number
  wordPattern:
    /(-?(?:(?:\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?|\d+[eE][+-]?\d+)[fF]?)|([^\`\~\!\@\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  // wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  comments: {
    // this is used for comment shortcuts
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  // @note "brackets" are used by default
  // autoClosingPairs: [
  //   { open: "[", close: "]" },
  //   { open: "{", close: "}" },
  //   { open: "(", close: ")" },
  //   // { open: "<", close: ">" },
  // ],
  // @note "autoclosing" is used by default, so we may specify only "brackets"
  // surroundingPairs: [
  //   { open: "{", close: "}" },
  //   { open: "[", close: "]" },
  //   { open: "(", close: ")" },
  //   // { open: "<", close: ">" },
  // ],
  folding: {
    markers: {
      start: /^ *# *pragma +region\b/,
      end: /^ *# *pragma +endregion\b/,
    },
  },
});

languages.setMonarchTokensProvider("glsl", {
  // defaultToken: "invalid",

  // this breaks comments for some reason
  // includeLF: true,
  ...glslDictionary,

  // structTypeTokens,

  operators: [
    "=",
    ">",
    "<",
    "!",
    "~",
    "?",
    ":",
    "==",
    "<=",
    ">=",
    "!=",
    "&&",
    "||",
    "++",
    "--",
    "+",
    "-",
    "*",
    "/",
    "&",
    "|",
    "^",
    "%",
    "<<",
    ">>",
    ">>>",
    "+=",
    "-=",
    "*=",
    "/=",
    "&=",
    "|=",
    "^=",
    "%=",
    "<<=",
    ">>=",
    ">>>=",
  ],

  // @note monarchCompile.js
  tokenizer: {
    root: [
      // @note remove this rule completely and use semantic tokens to style functions
      // @todo downside is that it won't be highlighted when browsing includes code, which is also true for structs there
      // [
      //   /([a-zA-Z_]\w*)(\s*\()/,
      //   [
      //     {
      //       cases: {
      //         // @note keyword rule here, so if() won't get treated as function
      //         "@keywords": "keyword",
      //         "@typeKeywords": "type",
      //         // "@pseudoTypeKeywords": "type",
      //         "@builtinFunctions": "function.builtin",
      //         "@default": "function",
      //       },
      //     },
      //     "@rematch",
      //   ],
      // ],

      [/\bmain\b/, "function.main"],

      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            "@keywords": "keyword",
            "@typeKeywords": "type",
            "@builtinFunctions": "function.builtin",
            "@builtinVars": "identifier.builtin",
            // @todo make uniforms also semantic
            "@uniforms": "identifier.uniform",
            "@default": "identifier",
          },
        },
      ],

      // \xa0 - &nbsp;
      // @note bruh idk why but leading spaces don't match when using ^
      // @note the problem was i forgot whitespace rule went before this one, effectively consuming leading whitespace
      [/^ *# */, "directive", "@directive"],

      { include: "@whitespace" },

      { include: "@numbers" },

      // [/(\.)([xyzwstpqrgba]+)/, ["operator", "identifier.field"]],
      [/(\.)([a-zA-Z_]\w*)/, ["operator", "identifier.field"]],

      // this is used for tokenization (without it brackets will be red)
      [/[{}()\[\]]/, "@brackets"],

      { include: "@symbols" },

      // delimiter: after number because of .\d floats
      [/[;,.]/, "delimiter"],
    ],

    numbers: [
      // numbers
      // @note 4.1.4 Floats
      /*
1.
.1
1.1
1.e2
1.e+2
1.e-2
1e2
1e-2
1e+2f
      */
      [/(?:(?:\d+\.\d*|\.\d+)(?:[eE][+-]?\d+)?|\d+[eE][+-]?\d+)[fF]?/, "number.float"],
      [/0[xX][0-9a-fA-F]+[uU]?/, "number.hex"],
      [/0[0-7]+[uU]?/, "number.octal"],
      [/\d+[uU]?/, "number"],
    ],

    symbols: [
      [
        /[=><!~?:&|+\-*\/\^%]+/,
        {
          cases: {
            "@operators": "operator",
            "@default": "",
          },
        },
      ],
    ],

    // @note comment decorators are only highlighted at the start of a comment
    commentDecorators: [
      [/ *\u0040todo/i, "comment.todo"],
      [/ *\u0040note/i, "comment.note"],
    ],

    blockComment: [
      { include: "@commentDecorators" },

      [/[^\/*]+/, "comment"],
      [/\/\*/, "comment", "@push"], // nested comment
      [/\*\//, "comment", "@pop"],
      [/[\/*]/, "comment"],
    ],

    lineComment: [
      // @note okay i get it now, when we have '//' matched and push this state, next line starts processing, so we can't match eol
      // so to pop back immediately (instead of matching next line as comment) this rule should be the first
      [/^/, "@rematch", "@pop"],

      //
      { include: "@commentDecorators" },

      // @note so monarch does processing by lines?
      [/.*/, "comment"],
    ],

    whitespace: [
      [/\s+/, "white"],
      //   [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@blockComment"],
      [/\/\//, "comment", "@lineComment"],
    ],

    defineDirective: [
      [/^/, "@rematch", "@popall"],

      ["defined", "directive.defined"],

      // @note match before symbols
      { include: "@whitespace" },

      { include: "@symbols" },

      { include: "@numbers" },

      [/\w+/, "directive.macro"],
    ],

    directive: [
      // exit from directive on new line
      [/^/, "@rematch", "@pop"],

      // @note using the following pattern
      // /define|undef|if|ifdef|ifndef|elif/
      // led to only "if" part of "ifdef" being highlighted, because it went first creating a match
      [/define|undef|if(?:n?def)?|elif/, "directive", "@defineDirective"],

      [/\b((?:end)?region)( +)(.+)/, ["directive", "whitespace", "string"]],

      // highlight es in #version
      [/\b(?:es)\b/, "string"],

      { include: "@numbers" },
      { include: "@whitespace" },

      [/\w+/, "directive"],

      // [/(define|if|ifdef|ifndef|elif)( +)([a-zA-Z]\w*)/, ["directive", "white", "macro"]],

      // @fix use *, so when we type a single # it doesn't hang infinitely in this state
      // [/#\w*/, "directive"],

      // strings (for #include)
      [/"|</, { token: "string.quote", bracket: "@open", next: "@string" }],
    ],

    string: [
      [/[^">]+/, "string"],
      // [/@escapes/, 'string.escape'],
      // [/\\./,      'string.escape.invalid'],
      [/"|>/, { token: "string.quote", bracket: "@close", next: "@pop" }],
    ],
  },
});
