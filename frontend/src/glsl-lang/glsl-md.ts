// @note minimal glsl tokenizer to use specifically for hovers and autocompletion info

import { languages } from "monaco-editor";
import { glslDictionary } from "./dictionary";

languages.register({ id: "glsl-md" });

languages.setLanguageConfiguration("glsl-md", {
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
});

languages.setMonarchTokensProvider("glsl-md", {
  defaultToken: "invalid",

  ...glslDictionary,
  symbols: /:;/,

  tokenizer: {
    root: [
      // @note special struct rule

      // @note bruh idk why this doesn't work correctly
      //   [
      //     // @note
      //     // /(struct)(?:(\s+)(\w+))?(\s*)/
      //     // apparently produces undefined instead of empty string failing in monarch, while using * instead does work properly
      //     /(struct)(\s*)(\w*)(\s*)/,
      //     ["keyword", "whitespace", "type.struct", "whitespace"],
      //     "@struct",
      //   ],

      // bruh whatever, the last option is much cleaner anyway
      //   [
      //     /(struct)(\s*)(\w*)(\s*)/,
      //     {
      //       group: ["keyword", "whitespace", "type.struct", "whitespace"],
      //       next: "@struct",
      //     },
      //   ],

      [/struct/, "keyword", "@struct"],

      [
        /(\w+)(\s+)(\w+)(\s*)(\()/,
        [
          {
            cases: {
              "@typeKeywords": "type",
              "@pseudoTypeKeywords": "type",
              "@default": "type.struct",
            },
          },
          "whitespace",
          {
            cases: {
              // @note @rematch causes weird behavior
              "@builtinFunctions": "function.builtin",
              "@default": "function",
            },
          },
          "whitespace",
          // @note so it seems in case of grouped match, next should be present on the last action
          {
            token: "@brackets",
            next: "@function",
          },
        ],
      ],

      [
        // @note this one confirms the rules are executed by line
        /(\w+)(\s+)(\w+)$/,
        [
          {
            cases: {
              "@keywords": "keyword",
              "@typeKeywords": "type",
              "@pseudoTypeKeywords": "type",
              "@default": "type.struct",
            },
          },

          "whitespace",

          {
            cases: {
              "@uniforms": "identifier.uniform",
              "@default": "identifier",
            },
          },
        ],
      ],

      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            "@keywords": "keyword",
            "@typeKeywords": "type",
            "@pseudoTypeKeywords": "type",
            "@builtinVars": "identifier.builtin",
            "@uniforms": "identifier.uniform",
            "@default": "identifier",
          },
        },
      ],

      [/[;,.]/, "delimiter"],

      [/[{}()\[\]]/, "@brackets"],
    ],

    // @note omfg by default first key in tokenizer is executed????
    // and not "root"???
    // since i placed struct before root, it was executing first causing a bug bruh
    // but by js spec order of key was undefined (before?)???? how do they @todo rely on this
    struct: [
      ["}", "@brackets", "@pop"],

      ["{", "@brackets"],

      // @note so it's easy to match field name, because ; always comes after, thus any other word is a type or keyword, which allows simple rules in cases with qualifiers
      [/(\w+)([;,])/, ["identifier", "delimiter"]],

      [
        /\w+/,
        {
          cases: {
            "@keywords": "keyword",
            "@typeKeywords": "type",
            "@pseudoTypeKeywords": "type",
            "@default": "type.struct",
          },
        },
      ],
    ],

    function: [
      [/\)/, "@brackets", "@pop"],

      [/(\w+)(,|\))/, ["identifier", "@rematch"]],

      [
        /\w+/,
        {
          cases: {
            "@keywords": "keyword",
            "@typeKeywords": "type",
            "@pseudoTypeKeywords": "type",
            "@default": "type.struct",
          },
        },
      ],

      [",", "delimiter"],
    ],
  },
});
