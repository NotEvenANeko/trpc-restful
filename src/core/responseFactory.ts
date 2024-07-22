type Headers = {
  [key: string]: string | number | boolean | undefined;
};

export type ResponseOptions = {
  status: number;
  body?: string | ArrayBuffer;
  headers?: Headers;
};

type OverrideIfUndefinedRemove<
  A extends Record<string, unknown>,
  B extends Record<string, unknown>,
> =
  A extends Record<string, never>
    ? B
    : {
        [P in keyof B as B[P] extends undefined ? never : P]: B[P];
      } & {
        [P in keyof A as P extends keyof B ? never : P]: A[P];
      };

type ConvertValueToString<T extends Headers> = {
  [P in keyof T]: T[P] extends undefined ? undefined : `${T[P]}`;
};

export class ResponseFactory<
  TStatus extends number,
  TBody = undefined,
  THeaders extends Record<string, string | undefined> = Record<string, never>,
> {
  __type = "__ResponseFactory";

  opts: ResponseOptions;

  constructor(opts: ResponseOptions) {
    this.opts = opts;
  }

  private update<
    TStatus extends number,
    TBody = undefined,
    THeaders extends Record<string, string | undefined> = Record<string, never>,
  >(opts: Partial<ResponseOptions>) {
    return new ResponseFactory<TStatus, TBody, THeaders>({
      ...this.opts,
      ...opts,
    });
  }

  status<T extends number>(status: T) {
    return this.update<T>({ status });
  }

  static status<T extends number>(status: T) {
    return new ResponseFactory<T>({ status });
  }

  header<K extends string, V extends string | number | boolean | undefined>(
    key: K,
    value: V
  ): ResponseFactory<
    TStatus,
    TBody,
    OverrideIfUndefinedRemove<THeaders, { [P in K]: `${V}` }>
  >;
  header<T extends Headers>(
    headers: T
  ): ResponseFactory<
    TStatus,
    TBody,
    OverrideIfUndefinedRemove<THeaders, ConvertValueToString<T>>
  >;
  header(
    keyOrHeaders: string | Headers,
    value?: string | number | boolean | undefined
  ): ResponseFactory<TStatus, TBody, THeaders> {
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

  body<Body = any>(
    content: string | ArrayBuffer,
    type: string
  ): ResponseFactory<TStatus, Body, THeaders> {
    return this.header("Content-Type", type).update({ body: content });
  }

  json<T extends object>(obj: T): ResponseFactory<TStatus, T, THeaders> {
    return this.body(JSON.stringify(obj), "application/json");
  }

  redirectTo<Status extends number = 307>(location: string, code?: Status) {
    return this.header("Location", location).status(code ?? (307 as Status));
  }

  toResponse(): Response {
    return new Response(this.opts.body, {
      status: this.opts.status,
      headers: Object.fromEntries(
        Object.entries(this.opts.headers ?? {}).map(([k, v]) => [k, `${v}`])
      ),
    });
  }
}

export const isResponseFactory = (v: unknown): v is ResponseFactory<number> =>
  v instanceof ResponseFactory ||
  (typeof v === "object" &&
    !!v &&
    "__type" in v &&
    v.__type === "__ResponseFactory");
