import { TRPCError } from "@trpc/server";

type RequestOptions = {
  req: Request;
  params: { [k: string]: string | undefined };
  query: { [k: string]: string };
};

type ContentTypeHandler = {
  isMatch: (req: Request) => boolean;
  parse: (opts: RequestOptions) => Promise<object> | object;
};

const nonBodyContentTypeHandler = (
  opts: Parameters<ContentTypeHandler["parse"]>["0"]
) => ({
  ...opts.query,
  ...opts.params,
});

const fallbackContentTypeHandler: ContentTypeHandler = {
  isMatch: () => true,

  parse: nonBodyContentTypeHandler,
};

const jsonContentTypeHandler: ContentTypeHandler = {
  isMatch: (req) =>
    !!req.headers.get("content-type")?.startsWith("application/json"),

  parse: async (opts) => {
    const obj = await opts.req.json();

    if (typeof obj !== "object") {
      throw new TRPCError({
        code: "BAD_REQUEST",
      });
    }

    return {
      ...nonBodyContentTypeHandler(opts),
      ...obj,
    };
  },
};

const contentTypeHandlers: ContentTypeHandler[] = [
  jsonContentTypeHandler,
  fallbackContentTypeHandler,
];

const getContentTypeHandler = (req: Request): ContentTypeHandler => {
  if (req.method === "GET" || req.method === "DELETE") {
    return fallbackContentTypeHandler;
  }

  const handler = contentTypeHandlers.find((h) => h.isMatch(req));

  if (!handler) {
    throw new TRPCError({
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  }

  return handler;
};

export const getRequestBody = async (opts: RequestOptions) => {
  const handler = getContentTypeHandler(opts.req);
  return await handler.parse(opts);
};
