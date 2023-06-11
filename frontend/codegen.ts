import type { CodegenConfig } from '@graphql-codegen/cli'
 
const config: CodegenConfig = {
    schema: 'https://glslapp.gamerzero.dev/graphql',
    documents: ['./src/gql/mutations/*.gql'],
    generates: {
        './src/gql/generated/': {
            preset: 'client',
            config: {
                useTypeImports: true
            }
        }
    }
}

export default config
