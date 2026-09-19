/**
 * In-memory rate limiter for API route protection.
 * Tracks request counts per identifier (IP, userId, etc.) within sliding windows.
 */

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  maxRequests: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Creates a rate limiter with the given options.
 * Returns a check function that accepts an identifier string.
 */
export function createRateLimiter(opts: RateLimitOptions) {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every 60 seconds
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of Array.from(store.entries())) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);

  // Allow garbage collection in non-server environments
  if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref();
  }

  return function check(identifier: string): RateLimitResult {
    const now = Date.now();
    const entry = store.get(identifier);

    // If no entry or window expired, start fresh
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + opts.windowMs;
      store.set(identifier, { count: 1, resetAt });
      return {
        success: true,
        remaining: opts.maxRequests - 1,
        resetAt,
      };
    }

    // Increment and check
    entry.count += 1;

    if (entry.count > opts.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    return {
      success: true,
      remaining: opts.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  };
}

/**
 * Convenience wrapper: checks rate limit and returns the result.
 * @param identifier - Unique key (IP, userId, etc.)
 * @param opts - Rate limit configuration
 */
export function rateLimit(
  identifier: string,
  opts: RateLimitOptions = { windowMs: 60_000, maxRequests: 100 }
): RateLimitResult {
  // Use a module-level default limiter for one-off calls
  if (!_defaultLimiters.has(cacheKey(opts))) {
    _defaultLimiters.set(cacheKey(opts), createRateLimiter(opts));
  }
  return _defaultLimiters.get(cacheKey(opts))!(identifier);
}

const _defaultLimiters = new Map<string, ReturnType<typeof createRateLimiter>>();
function cacheKey(opts: RateLimitOptions): string {
  return `${opts.windowMs}:${opts.maxRequests}`;
}

// ---------------------------------------------------------------------------
// Pre-configured limiters
// ---------------------------------------------------------------------------

/** General API endpoints: 100 requests per minute (authenticated) */
export const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
});

/** Auth endpoints (login, signup, etc.): 20 requests per minute */
export const authLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
});

/** AI / LLM endpoints: 10 requests per minute (strict) */
export const aiLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
});

export type { RateLimitOptions, RateLimitResult };
