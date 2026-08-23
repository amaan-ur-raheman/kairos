import { cors } from "@elysiajs/cors";
import { createContext } from "@kairos/api/context";
import { appRouter } from "@kairos/api/routers/index";
import { env } from "@kairos/env/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Elysia } from "elysia";

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});
const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

// ponytail: in-memory sliding window is per-serverless-isolate — it damps bursts but
// isn't a global cap; add Vercel Firewall or Upstash Redis if abuse comes from many IPs
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function isRateLimited(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear(); // bound memory; worst case limits reset early
  return recent.length > RATE_LIMIT;
}

const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .all(
    "/rpc*",
    async (context) => {
      try {
        if (isRateLimited(context.request)) {
          return Response.json({ error: "Too Many Requests" }, { status: 429 });
        }
        const ctx = await createContext({ context });
        const { response } = await rpcHandler.handle(context.request, {
          prefix: "/rpc",
          context: ctx,
        });
        return response ?? new Response("Not Found", { status: 404 });
      } catch (err) {
        console.error("RPC handler error:", err);
        return Response.json(
          // Don't leak internal error details to clients
          { error: "Internal Server Error" },
          { status: 500 },
        );
      }
    },
    {
      parse: "none",
    },
  )
  .all(
    "/api-reference*",
    async (context) => {
      try {
        const ctx = await createContext({ context });
        const { response } = await apiHandler.handle(context.request, {
          prefix: "/api-reference",
          context: ctx,
        });
        return response ?? new Response("Not Found", { status: 404 });
      } catch (err) {
        console.error("OpenAPI handler error:", err);
        return Response.json(
          // Don't leak internal error details to clients
          { error: "Internal Server Error" },
          { status: 500 },
        );
      }
    },
    {
      parse: "none",
    },
  )
  .get("/", () => "OK");

export default app;

// Elysia's default export is not auto-served by Bun or Node, so start a local
// server outside Vercel while still exporting the app for Vercel functions.
if (!process.env.VERCEL) {
  app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
}
