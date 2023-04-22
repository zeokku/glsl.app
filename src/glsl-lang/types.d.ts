export interface ParsedBuiltinDefinition {
  desc: string;
  decl: string[];
  params?: Record<string, string>;
}
export type ParsedBuiltinDefinitions = Record<string, ParsedBuiltinDefinition>;
