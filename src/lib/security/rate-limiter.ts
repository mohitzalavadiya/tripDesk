import { createHash, randomUUID } from "crypto";
import "server-only";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  isServiceUnavailable?: boolean;
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
  failClosed?: boolean;
}

/**
 * Atomic sliding-window Lua script.
 * KEYS[1]: Rate limit key (sorted set)
 * ARGV[1]: Current timestamp in ms
 * ARGV[2]: Window size in ms
 * ARGV[3]: Max allowed requests in window
 * ARGV[4]: Unique request identifier (UUID)
 *
 * Atomically purges expired entries, counts current requests in window,
 * and conditionally inserts the new request with a self-contained TTL.
 * Avoids any secondary sequence keys or unbounded Redis key leaks.
 */
const ATOMIC_SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local reqId = tostring(ARGV[4] or "")
local clearBefore = now - window

-- 1. Purge expired entries outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

-- 2. Count requests currently within the sliding window
local currentRequests = redis.call('ZCARD', key)

if currentRequests < limit then
  -- 3. Atomic insertion of current request with unique score/member
  redis.call('ZADD', key, now, now .. ':' .. reqId)
  redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
  return {1, limit - currentRequests - 1, math.ceil(window / 1000)}
else
  -- 4. Calculate accurate Retry-After from oldest entry in window
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldestScore = tonumber(oldest[2]) or (now - window)
  local retryAfter = math.ceil((oldestScore + window - now) / 1000)
  if retryAfter < 1 then retryAfter = 1 end
  redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
  return {0, 0, retryAfter}
end
`;

/**
 * In-memory sliding-window log strictly for non-production local development & unit testing.
 * Never used in production multi-instance / serverless execution.
 */
const inMemoryStore = new Map<string, number[]>();

function checkInMemorySlidingWindow(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const clearBefore = now - windowMs;
  const timestamps = (inMemoryStore.get(key) || []).filter((t) => t > clearBefore);

  if (timestamps.length < limit) {
    timestamps.push(now);
    inMemoryStore.set(key, timestamps);
    return {
      allowed: true,
      limit,
      remaining: limit - timestamps.length,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  const oldest = timestamps[0] || clearBefore;
  const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
  inMemoryStore.set(key, timestamps);

  return {
    allowed: false,
    limit,
    remaining: 0,
    retryAfterSeconds,
  };
}

/**
 * Extracts the trusted client IP according to verified edge proxy contracts.
 * Prioritizes verified platform headers (Cloudflare, Vercel/proxy x-real-ip)
 * over client-controlled forwarding headers.
 */
export function getTrustedClientIp(request: Request): string {
  // 1. Cloudflare edge connecting IP (set authoritatively when reverse-proxied via Cloudflare)
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim().length > 0) {
    return cfConnectingIp.trim();
  }

  // 2. Direct upstream proxy IP (standard on Vercel, AWS ALB, Nginx, Caddy)
  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  // 3. Fallback to nearest edge gateway hop from x-forwarded-for
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((h) => h.trim())
      .filter((h) => h.length > 0);
    if (hops.length > 0) {
      return hops[hops.length - 1]; // Right-most entry injected by edge proxy
    }
  }

  return "127.0.0.1";
}

/**
 * Creates a privacy-preserving truncated SHA-256 hash of an identifier (IP, phone, token).
 * Prevents storage of raw PII or credentials in Redis keys.
 */
export function hashRateLimitIdentifier(rawIdentifier: string): string {
  return createHash("sha256").update(rawIdentifier.trim().toLowerCase()).digest("hex").slice(0, 16);
}

/**
 * Core atomic distributed rate limiter using Upstash Redis REST pipeline with atomic Lua script.
 * Implements deliberate fail-closed (for high-risk mutations) and fail-open (for public reads/feedback) policies.
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowMs, failClosed = false } = options;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  // Development and test execution fallback (isolated in-memory sliding window)
  if (!redisUrl || !redisToken) {
    if (isProduction) {
      console.error(
        `[RATE_LIMITER] Production Upstash Redis credentials not configured. Key: ${key}`
      );
      if (failClosed) {
        return {
          allowed: false,
          limit,
          remaining: 0,
          retryAfterSeconds: 60,
          isServiceUnavailable: true,
        };
      }
      return { allowed: true, limit, remaining: limit, retryAfterSeconds: 0 };
    }

    return checkInMemorySlidingWindow(key, limit, windowMs);
  }

  // Production Distributed Rate Limiting via Upstash Redis REST
  try {
    const now = Date.now();
    const requestId = randomUUID();
    const endpoint = `${redisUrl.replace(/\/$/, "")}/pipeline`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["EVAL", ATOMIC_SLIDING_WINDOW_LUA, 1, key, String(now), String(windowMs), String(limit), requestId],
      ]),
      signal: AbortSignal.timeout(3000), // Strict 3000ms timeout
    });

    if (!response.ok) {
      throw new Error(`Upstash Redis returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = data?.[0]?.result;

    if (!Array.isArray(result) || result.length < 3) {
      throw new Error("Malformed response from Upstash Redis Lua rate limiter");
    }

    const [allowedNum, remainingNum, retryAfterNum] = result;
    const allowed = allowedNum === 1;
    const remaining = typeof remainingNum === "number" ? Math.max(0, remainingNum) : 0;
    const retryAfterSeconds =
      typeof retryAfterNum === "number" ? Math.max(1, retryAfterNum) : Math.ceil(windowMs / 1000);

    return {
      allowed,
      limit,
      remaining,
      retryAfterSeconds,
    };
  } catch (error: any) {
    console.warn(`[RATE_LIMITER] Storage error on key: ${key}:`, error?.message || error);

    if (failClosed) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterSeconds: 60,
        isServiceUnavailable: true,
      };
    }

    // Public read and feedback endpoints fail-open: allow traffic during transient Redis outages
    return {
      allowed: true,
      limit,
      remaining: limit,
      retryAfterSeconds: 0,
    };
  }
}

export const RATE_LIMIT_CONFIGS = {
  "public-feedback": {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
    failClosed: false, // Fails open to prevent blocking legitimate customer reviews during Redis outages
  },
  "public-read": {
    limit: 60,
    windowMs: 60 * 1000, // 1 minute
    failClosed: false,
  },
} as const;

export type RateLimitEndpointType = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Convenience helper to enforce rate limiting for authorized endpoints.
 * Automatically computes hashed Redis keys combining endpoint namespace and identifier.
 */
export async function limitEndpoint(
  endpointType: RateLimitEndpointType,
  identifier: string,
  request?: Request
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[endpointType];
  const ip = request ? getTrustedClientIp(request) : "127.0.0.1";
  const hashedIp = hashRateLimitIdentifier(ip);
  const hashedId = hashRateLimitIdentifier(identifier);
  const redisKey = `ratelimit:${endpointType}:${hashedIp}:${hashedId}`;

  return checkRateLimit({
    key: redisKey,
    limit: config.limit,
    windowMs: config.windowMs,
    failClosed: config.failClosed,
  });
}

/**
 * Returns standard rate-limit HTTP headers for API responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };

  if (!result.allowed && result.retryAfterSeconds > 0) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}
