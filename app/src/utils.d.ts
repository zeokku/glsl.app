export type ExtractUnion<T> = T extends ReadonlyArray<infer U> ? U : never;
