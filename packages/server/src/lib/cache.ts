import type {z} from "zod";
import {logger} from "../common/logger";
import {redis} from "./redis";

type CacheOptions = {
  ttlSeconds?: number;
};

const keyFor = (prefix: string, id: string) => `${prefix}:${id}`;

export class StringCache {
  constructor(
    private readonly prefix: string,
    private readonly defaultTtlSeconds = 300,
  ) {}

  async get(id: string) {
    return redis.get(keyFor(this.prefix, id));
  }

  async set(id: string, value: string, options: CacheOptions = {}) {
    await redis.set(keyFor(this.prefix, id), value, {
      EX: options.ttlSeconds ?? this.defaultTtlSeconds,
    });
  }

  async del(id: string) {
    await redis.del(keyFor(this.prefix, id));
  }
}

export class JsonCache<T> {
  constructor(
    private readonly prefix: string,
    private readonly schema: z.ZodType<T>,
    private readonly defaultTtlSeconds = 300,
  ) {}

  async get(id: string): Promise<T | null> {
    const key = keyFor(this.prefix, id);
    const raw = await redis.get(key);

    if (!raw) {
      return null;
    }

    try {
      return this.schema.parse(JSON.parse(raw));
    } catch (error) {
      logger.warn({error, key}, "Invalid cached JSON. Deleting key.");
      await redis.del(key);
      return null;
    }
  }

  async set(id: string, value: T, options: CacheOptions = {}) {
    const validValue = this.schema.parse(value);

    await redis.set(keyFor(this.prefix, id), JSON.stringify(validValue), {
      EX: options.ttlSeconds ?? this.defaultTtlSeconds,
    });
  }

  async del(id: string) {
    await redis.del(keyFor(this.prefix, id));
  }

  async consume(id: string) {
    const value = await this.get(id);

    if (value) {
      await this.del(id);
    }

    return value;
  }
}
