import type { RESTfulMeta } from "./types";

// This function does nothing since we can't modify the `meta` of `Procedure["_def"]`
export function assertRESTfulMeta(
  meta: unknown
): asserts meta is RESTfulMeta<{}> {}
