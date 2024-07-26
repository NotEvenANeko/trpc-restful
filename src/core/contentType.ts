import type { ContentTypeParser } from "./restfulHandler";

export const jsonContentTypeParser: ContentTypeParser = {
  isMatch: (req) =>
    !!req.headers.get("content-type")?.startsWith("application/json"),

  parse: async (req) => {
    const obj = await req.json();

    return obj;
  },
};

export const textPlainContentTypeParser: ContentTypeParser = {
  isMatch: (req) => !!req.headers.get("content-type")?.startsWith("text/plain"),

  parse: async (req) => req.text(),
};

export const defaultContentTypeParsers: ContentTypeParser[] = [
  jsonContentTypeParser,
  textPlainContentTypeParser,
];
