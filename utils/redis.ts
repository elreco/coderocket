import Redis from "ioredis";

const getRedisUrl = (): string => {
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL or KV_URL environment variable is not set");
  }
  return redisUrl;
};

let publisherInstance: Redis | null = null;
let subscriberInstance: Redis | null = null;

export const getPublisher = (): Redis => {
  if (!publisherInstance) {
    publisherInstance = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }
  return publisherInstance;
};

export const getSubscriber = (): Redis => {
  if (!subscriberInstance) {
    subscriberInstance = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }
  return subscriberInstance;
};

export const isRedisConfigured = (): boolean => {
  return !!(process.env.REDIS_URL || process.env.KV_URL);
};
