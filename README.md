# trpc-restful

> After AFK for about 1 year, I decide to continue this project. Hope I can get this done. Old code has been moved to `legacy` branch. :)

inspired by [trpc-openapi](https://github.com/jlalmes/trpc-openapi), trying to make a RESTful-compatible adaptor for tRPC

## What I want to do

- [ ] Basic HTTP (different methods, path parameters, query parameters, headers, cookies, etc.)
- [ ] OpenAPI document generation with typescript (?)
- [ ] Support `subscription` through SSE or WebSocket
- [ ] A tRPC link which provides similar DX as the original tRPC client (a metadata endpoint might exist)
- [ ] Find a better way to differentiate between `params`, `query`, and `body` in the input
- [ ] Octet-stream support (ctx.getRequestBody()?)
- [ ] Support `WriteableStream` as a response
