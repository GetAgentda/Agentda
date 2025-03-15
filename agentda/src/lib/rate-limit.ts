// Rate limiting implementation using in-memory storage
// For production, consider using a distributed solution like Redis or Upstash

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
}

const RATE_LIMIT = 50; // requests per window
const WINDOW_SIZE = 60 * 60; // 1 hour in seconds

// In-memory storage (not suitable for production with multiple instances)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);

  // In-memory rate limiting
  const record = inMemoryStore.get(key);
  const windowStart = now - WINDOW_SIZE;

  if (!record || record.resetTime < windowStart) {
    // First request or expired window
    inMemoryStore.set(key, {
      count: 1,
      resetTime: now + WINDOW_SIZE,
    });
    return {
      success: true,
      limit: RATE_LIMIT,
      remaining: RATE_LIMIT - 1,
    };
  }

  if (record.count >= RATE_LIMIT) {
    return {
      success: false,
      limit: RATE_LIMIT,
      remaining: 0,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: RATE_LIMIT,
    remaining: RATE_LIMIT - record.count,
  };
}

// Cleanup function for in-memory store (call periodically)
export function cleanupInMemoryStore(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [key, record] of inMemoryStore.entries()) {
    if (record.resetTime < now) {
      inMemoryStore.delete(key);
    }
  }
} 