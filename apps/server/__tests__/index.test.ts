import { beforeAll, describe, expect, test, vi } from "vitest";

// Must be set before importing the app — the module skips app.listen under Vercel.
process.env.VERCEL = "1";

vi.mock("@kairos/env/server", () => ({
  env: {
    DATABASE_URL: "postgres://mock",
    CLERK_SECRET_KEY: "sk_test_mock",
    CLERK_PUBLISHABLE_KEY: "pk_test_mock",
    CORS_ORIGIN: "http://localhost:3001",
    NODE_ENV: "test",
    VERCEL: "1",
  },
}));

vi.mock("@kairos/api/context", () => ({
  createContext: vi.fn(async () => ({ auth: null })),
}));

// Routers import the drizzle client at module scope; stub it so no DB is touched.
vi.mock("@kairos/db", () => ({ db: {} }));

describe("server", () => {
  let app: { handle(request: Request): Promise<Response> };

  beforeAll(async () => {
    const mod = await import("../src/index");
    app = mod.default;
  });

  test("GET / health check returns OK", async () => {
    const res = await app.handle(new Request("http://localhost/"));
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("OK");
  });

  test("unknown routes return 404", async () => {
    const res = await app.handle(new Request("http://localhost/nope"));
    expect(res.status).toBe(404);
  });

  test("/rpc with an invalid body does not crash the server", async () => {
    const res = await app.handle(
      new Request("http://localhost/rpc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
    );
    // Any well-formed response is fine; the point is it responds at all.
    expect(res).toBeInstanceOf(Response);
  });

  test("/api-reference serves the OpenAPI reference UI", async () => {
    const res = await app.handle(new Request("http://localhost/api-reference"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});
