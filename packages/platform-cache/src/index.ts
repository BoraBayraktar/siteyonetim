import { Redis } from "@upstash/redis";

export type CacheClient = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPrefix(prefix: string): Promise<void>;
};

class NoopCache implements CacheClient {
  async get<T>(): Promise<T | null> {
    return null;
  }
  async set(): Promise<void> {}
  async del(): Promise<void> {}
  async delByPrefix(): Promise<void> {}
}

class UpstashCache implements CacheClient {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    return this.redis.get<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, { ex: ttlSeconds });
      return;
    }
    await this.redis.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    const keys = await this.redis.keys(`${prefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

let cacheSingleton: CacheClient | undefined;

export function getCacheClient(): CacheClient {
  if (cacheSingleton) {
    return cacheSingleton;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    cacheSingleton = new UpstashCache(new Redis({ url, token }));
  } else {
    cacheSingleton = new NoopCache();
  }

  return cacheSingleton;
}

export async function invalidateCacheKeys(keys: string[]): Promise<void> {
  const cache = getCacheClient();
  await Promise.all(keys.map((key) => cache.del(key)));
}

export async function invalidateCachePrefix(prefix: string): Promise<void> {
  await getCacheClient().delByPrefix(prefix);
}

export {
  REPORT_ANNUAL_TTL_SECONDS,
  annualReportCacheKey,
  annualReportCachePrefix,
  collectionRateCacheKey,
  collectionRateCachePrefix,
  invalidatePropertyYearReports,
} from "./report-cache";
export type { ReportCacheScope } from "./report-cache";
