import {
  TRPCError,
  callTRPCProcedure,
  type AnyTRPCProcedure,
  type AnyTRPCRouter,
} from "@trpc/server";
import type {
  ContentTypeParser,
  ProcedureFindResult,
  RESTfulHandlerOptions,
} from "./restfulHandler";
import { defaultContentTypeParsers } from "./contentType";
import { isResponseFactory } from "./responseFactory";

export type RESTfulRequest = {
  req: Request;
  params: Record<string, string | undefined>;
  query: Record<string, string>;
};

export interface ResolveRESTfulRequestOptions<TRouter extends AnyTRPCRouter>
  extends RESTfulHandlerOptions<TRouter> {
  req: RESTfulRequest;
  handler: AnyTRPCProcedure;
  path: string;
  type: "query" | "mutation" | "subscription";
}

const getRequestBody = async (
  request: RESTfulRequest,
  contentParser: ContentTypeParser[]
) => {
  const { req, params, query } = request;

  if (req.method === "GET" || req.method === "DELETE") {
    return {
      ...query,
      ...params,
    };
  }

  const parsedBody = await contentParser
    .find((v) => v.isMatch(req))
    ?.parse(req);

  if (Object.entries(params).length === 0) {
    return parsedBody;
  }

  if (!parsedBody) {
    return params;
  }

  if (typeof parsedBody !== "object") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Non-object body is not allowed when path params are present",
    });
  }

  return {
    ...parsedBody,
    ...params,
  };
};

export const resolveResponse = async <TRouter extends AnyTRPCRouter>(
  opts: ResolveRESTfulRequestOptions<TRouter>
): Promise<Response> => {
  const { req, handler } = opts;

  try {
    const input = await getRequestBody(req, [
      ...(opts.contentTypeParser ?? []),
      ...defaultContentTypeParsers,
    ]);

    const getRawInput = async () => input;

    const ctx = await opts.createContext?.({ req: req.req });

    const result = await handler({
      ctx: ctx ?? {},
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
  } catch (err) {
    console.log(err);
    return new Response("Internal Server Error", { status: 500 });
  }
};
