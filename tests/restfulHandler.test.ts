import { initTRPC } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { RESTfulMeta } from "../src/core/types";
import { restfulHandlerBuilder } from "../src/core/restfulHandler";
import { ResponseFactory } from "../src/core/responseFactory";

describe("restfulHandler", () => {
  it("test", async () => {
    const trpc = initTRPC.meta<RESTfulMeta<{}>>().create();

    const router = trpc.router({
      test: trpc.procedure
        .meta({ method: "GET", path: "/echo/:name" })
        .input(z.object({ name: z.string() }))
        .query(({ input }) => {
          console.log("I'm called!");
          return input.name;
        }),

      hello: trpc.procedure
        .meta({ method: "POST", path: "/hello" })
        .input(z.object({ content: z.string() }))
        .mutation(({ input }) => {
          return ResponseFactory.status(201).json({ hello: input.content });
        }),

      add: trpc.procedure
        .meta({ method: "GET", path: "/add" })
        .input(z.object({ a: z.coerce.number(), b: z.coerce.number() }))
        .query(({ input }) =>
          ResponseFactory.status(200).json({ result: input.a + input.b })
        ),

      redirect: trpc.procedure
        .meta({ method: "GET", path: "/redirect/:id" })
        .input(z.object({ id: z.string() }))
        .query(({ input }) => {
          return ResponseFactory.status(200).redirectTo(
            `https://github.com/${input.id}`,
            302
          );
        }),
    });

    const restfulHandler = restfulHandlerBuilder({ router });

    const response = await restfulHandler(
      new Request("https://example.com/echo/neko")
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("neko");

    const response2 = await restfulHandler(
      new Request("https://example.com/hello", {
        method: "POST",
        body: JSON.stringify({ content: "Hello TRPC!" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response2.status).toBe(201);
    expect(await response2.json()).toEqual({ hello: "Hello TRPC!" });

    const response3 = await restfulHandler(
      new Request("https://example.com/add?a=1&b=2")
    );

    expect(response3.status).toBe(200);
    expect(await response3.json()).toEqual({ result: 3 });

    const response4 = await restfulHandler(
      new Request("https://example.com/redirect/NotEvenANeko")
    );

    expect(response4.status).toBe(302);
    expect(response4.headers.get("location")).toMatch(
      /^https:\/\/github.com\/notevenaneko$/i
    );

    const response5 = await restfulHandler(
      new Request("https://example.com/echo/neko", { method: "POST" })
    );

    expect(response5.status).toBe(404);

    expect.assertions(9);
  });
});
