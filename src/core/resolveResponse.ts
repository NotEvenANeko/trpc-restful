import {
  TRPCError,
  type AnyTRPCRouter,
  type TRPCProcedureType,
  type inferRouterContext,
} from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
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
  req: Request;
  getHandler: () => ProcedureFindResult | undefined;
  url: URL;
  path: string;
  type: "query" | "mutation" | "subscription";
}

const tRPCErrorToResponse = (err: TRPCError) => {
  return new Response(err.message, {
    status: getHTTPStatusCodeFromError(err),
  });
};

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

const captureErrorToResponse = <TRouter extends AnyTRPCRouter>(
  cause: unknown,
  opts: {
    opts: Pick<
      ResolveRESTfulRequestOptions<TRouter>,
      "onError" | "req" | "router"
    >;
    ctx: inferRouterContext<TRouter> | undefined;
    type: TRPCProcedureType | "unknown";
    path: string | undefined;
    input: unknown;
  }
) => {
  const error =
    cause instanceof TRPCError
      ? cause
      : new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            cause instanceof Error ? cause.message : "Internal server error",
          cause,
        });

  opts.opts.onError?.({
    error,
    ctx: opts.ctx,
    input: opts.input,
    path: opts.path,
    req: opts.opts.req,
    type: opts.type,
  });

  return tRPCErrorToResponse(error);
};

export const resolveResponse = async <TRouter extends AnyTRPCRouter>(
  opts: ResolveRESTfulRequestOptions<TRouter>
): Promise<Response> => {
  const { req, url, getHandler } = opts;

  try {
    const handler = getHandler();

    if (!handler) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "endpoint not found",
      });
    }

    const params = handler.params;
    const query = Object.fromEntries(url.searchParams.entries());
    const input = await getRequestBody({ req, params, query }, [
      ...(opts.contentTypeParser ?? []),
      ...defaultContentTypeParsers,
    ]);

    const getRawInput = async () => input;

    const ctx = await opts.createContext?.({ req });

    try {
      const result = await handler.handler({
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
      return captureErrorToResponse(err, {
        ctx,
        input,
        opts,
        type: opts.type,
        path: opts.path,
      });
    }
  } catch (err) {
    return captureErrorToResponse(err, {
      ctx: undefined,
      input: undefined,
      opts,
      path: opts.path,
      type: opts.type,
    });
  }
};
