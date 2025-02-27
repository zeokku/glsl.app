/// <reference types="dotenv" />

import "dotenv/config";

import type { CodegenConfig } from "@graphql-codegen/cli";

// @todo https://the-guild.dev/blog/optimize-bundle-size-with-swc-and-graphql-codegen
const config: CodegenConfig = {
  overwrite: true,
  // schema: process.env.APP_GQL_ENDPOINT,
  schema: "../server/src/main/resources/schema/schema.graphql",
  documents: "src/**/*.vue",
  generates: {
    "src/gql/": {
      preset: "client",
      plugins: [],
      config: {
        useTypeImports: true,
      },
    },
  },
};

export default config;
