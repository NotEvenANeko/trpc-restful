import type { AnyTRPCRouter } from "@trpc/server";
import {
  restfulHandlerBuilder,
  type RESTfulHandlerOptions,
} from "../core/restfulHandler";

export type Handler = (req: Request) => Promise<Response>;

export type AppRouterHandler = Record<
  (typeof supportedHTTPMethods)[number],
  Handler
>;

const supportedHTTPMethods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export const createAppRouterHandler = <TRouter extends AnyTRPCRouter>(
  opts: RESTfulHandlerOptions<TRouter>
): AppRouterHandler => {
  const handler = restfulHandlerBuilder(opts);

  return Object.fromEntries(
    supportedHTTPMethods.map((method) => [method, handler] as const)
  ) as AppRouterHandler;
};
