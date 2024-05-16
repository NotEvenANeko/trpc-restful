import type { AnyTRPCProcedure, AnyTRPCRouter } from "@trpc/server";
import type {
  BaseHandlerOptions,
  CreateRouterOptions,
  ValueOf,
  inferRouterContext,
} from "@trpc/server/unstable-core-do-not-import";
import FindMyWay, { type FindResult } from "find-my-way";

import { assertRESTfulMeta } from "./utils";
import { resolveResponse } from "./resolveResponse";

type RESTfulCreateContextOptions = {
  req: Request;
};

type RESTfulCreateContextFn<TRouter extends AnyTRPCRouter> = (
  opts: RESTfulCreateContextOptions
  // FIXME:
) => Promise<inferRouterContext<TRouter>> | inferRouterContext<TRouter>;

export type ContentTypeParser = {
  isMatch: (req: Request) => boolean;

  parse: (req: Request) => Promise<unknown> | unknown;
};

export interface RESTfulHandlerOptions<TRouter extends AnyTRPCRouter>
  extends Omit<
    BaseHandlerOptions<TRouter, Request>,
    "batching" | "allowMethodOverride" | "allowBatching"
  > {
  router: TRouter;
  createContext?: RESTfulCreateContextFn<TRouter>;

  contentTypeParser?: ContentTypeParser[];
}

export type ProcedureFindResult = Omit<FindResult<any>, "handler"> & {
  handler: AnyTRPCProcedure;
};

// FIXME:
const isRouter = (v: ValueOf<CreateRouterOptions>): v is AnyTRPCRouter =>
  v._def && "router" in v._def;

// FIXME:
const isProcedure = (v: ValueOf<CreateRouterOptions>): v is AnyTRPCProcedure =>
  typeof v === "function";

const flattenProcedures = (
  input: CreateRouterOptions,
  path: string[] = []
): { [path: string]: AnyTRPCProcedure } =>
  Object.entries(input).reduce((acc, [path_, cur]) => {
    if (isRouter(cur)) {
      return {
        ...acc,
        ...flattenProcedures(cur._def.record, [...path, path_]),
      };
    }

    if (!isProcedure(cur)) {
      return {
        ...acc,
        ...flattenProcedures(cur, [...path, path_]),
      };
    }

    assertRESTfulMeta(cur._def.meta);

    const finalPath = cur._def.meta.path?.startsWith("/")
      ? cur._def.meta.path
      : `/${[...path, path_, cur._def.meta.path].filter(Boolean).join("/")}`;

    return {
      ...acc,
      [finalPath]: cur,
    };
  }, {});

export type RESTfulHandler = (req: Request) => Promise<Response>;

export const restfulHandlerBuilder = <TRouter extends AnyTRPCRouter>(
  opts: RESTfulHandlerOptions<TRouter>
): RESTfulHandler => {
  const router = FindMyWay({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    caseSensitive: false,
  });

  Object.entries(flattenProcedures(opts.router._def.record)).forEach(
    ([path, handler]) => {
      assertRESTfulMeta(handler._def.meta);

      const method =
        handler._def.meta.method ??
        (handler._def.type === "query"
          ? "GET"
          : handler._def.type === "mutation"
            ? "POST"
            : "GET");

      router.on(method, path, handler as any);
    }
  );

  return async (req) => {
    const method = req.method;
    const url = new URL(req.url);

    const type = method === "GET" ? "query" : "mutation";

    const handler = router.find(
      method as FindMyWay.HTTPMethod,
      url.pathname
    ) as any as ProcedureFindResult | null;

    if (!handler) {
      return new Response("Endpoint not found", { status: 404 });
    }

    return resolveResponse({
      ...opts,
      req: {
        req,
        params: handler.params,
        query: Object.fromEntries(url.searchParams.entries()),
      },
      handler: handler.handler,
      type,
      path: url.pathname,
    });
  };
};
