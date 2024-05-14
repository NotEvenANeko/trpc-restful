export class ResponseFactory {
  __type = "__ResponseFactory";

  opts: {
    status: number;
    body?: string | ArrayBuffer;
    headers?: Record<string, string | number | boolean | undefined>;
  };

  constructor(status: number);
  constructor(opts: ResponseFactory["opts"]);
  constructor(statusOrOpts: number | ResponseFactory["opts"]) {
    typeof statusOrOpts === "number"
      ? (this.opts = { status: statusOrOpts })
      : (this.opts = { ...statusOrOpts });
  }

  private update(opts: Partial<ResponseFactory["opts"]>) {
    return new ResponseFactory({ ...this.opts, ...opts });
  }

  status(status: number) {
    return this.update({ status });
  }

  header(
    key: string,
    value: string | number | boolean | undefined
  ): ResponseFactory;
  header(headers: {
    [key: string]: string | number | boolean | undefined;
  }): ResponseFactory;
  header(
    keyOrHeaders:
      | string
      | { [key: string]: string | number | boolean | undefined },
    value?: string | number | boolean | undefined
  ): ResponseFactory {
    const newHeaders =
      typeof keyOrHeaders === "string"
        ? { [keyOrHeaders]: value }
        : keyOrHeaders;

    return this.update({
      headers: {
        ...this.opts.headers,
        ...newHeaders,
      },
    });
  }

  body(content: string | ArrayBuffer, type: string): ResponseFactory {
    return this.header("Content-Type", type).update({ body: content });
  }

  json(obj: object): ResponseFactory {
    return this.body(JSON.stringify(obj), "application/json");
  }

  redirectTo(location: string, code?: number) {
    return this.header("Location", location).status(code ?? 307);
  }

  toResponse() {
    return new Response(this.opts.body, {
      status: this.opts.status,
      headers: Object.fromEntries(
        Object.entries(this.opts.headers ?? {}).map(([k, v]) => [k, `${v}`])
      ),
    });
  }
}

export const createResponse = (status: number) => new ResponseFactory(status);

export const isResponseFactory = (v: unknown): v is ResponseFactory =>
  v instanceof ResponseFactory ||
  (typeof v === "object" &&
    !!v &&
    "__type" in v &&
    v.__type === "__ResponseFactory");
