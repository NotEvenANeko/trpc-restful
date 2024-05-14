import {
  callTRPCProcedure,
  type AnyTRPCProcedure,
  type AnyTRPCRouter,
} from "@trpc/server";
import type { ProcedureFindResult } from "./restfulHandler";
import { getRequestBody } from "./contentType";
import { isResponseFactory } from "./responseFactory";

export interface ResolveRESTfulRequestOptions {
  req: Request;
  handler: AnyTRPCProcedure;
  params: Record<string, string | undefined>;
  query: Record<string, string>;
  path: string;
  type: "query" | "mutation" | "subscription";
}

export const resolveResponse = async (
  opts: ResolveRESTfulRequestOptions
): Promise<Response> => {
  const { req, handler, params, query } = opts;

  const input = await getRequestBody({ req, params, query });

  const getRawInput = async () => input;

  const result = await handler({
    ctx: {},
    getRawInput,
    path: opts.path,
    type: opts.type,
  });

  if (isResponseFactory(result)) {
    return result.toResponse();
  }

  return new Response(
    typeof result === "object" ? JSON.stringify(result) : result,
    { status: 200 }
  );
};
