import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT = 120;
const RATE_WINDOW_S = 60;

/**
 * Global sliding-window limiter backed by Upstash Redis when configured
 * (works across all serverless isolates); otherwise falls back to an
 * in-memory per-isolate window that only damps bursts.
 *
 * ponytail: if abuse comes from many rotating IPs, add Vercel Firewall rules
 * in front of this as well.
 */
const redisLimiter =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        }),
        limiter: Ratelimit.slidingWindow(RATE_LIMIT, `${RATE_WINDOW_S} s`),
        prefix: "kairos:rpc",
      })
    : null;

/* ── in-memory fallback ── */
const hits = new Map<string, number[]>();

function memoryLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_S * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear(); // bound memory; worst case limits reset early
  return recent.length > RATE_LIMIT;
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Returns true when the request should be rejected with 429. */
export async function isRateLimited(req: Request): Promise<boolean> {
  const ip = clientIp(req);
  if (redisLimiter) {
    try {
      const result = await redisLimiter.limit(ip);
      return !result.success;
    } catch (err) {
      // Fail open on Redis errors rather than taking the API down; log loudly.
      console.error("[rate-limit] Redis error, failing open:", err);
      return false;
    }
  }
  return memoryLimited(ip);
}
