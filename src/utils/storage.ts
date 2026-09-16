import { del, get, set } from 'idb-keyval';

import type { PersistedEnvelope } from '@/types';

const STORAGE_VERSION = 1;
const DEFAULT_TTL = 1000 * 60 * 60 * 24 * 365;

const prefixed = (key: string) => `reswap:${key}`;

export const STORAGE_KEYS = {
  currentUserId: prefixed('current-user-id'),
  users: prefixed('users'),
  items: prefixed('items'),
  exchanges: prefixed('exchanges'),
  reviews: prefixed('reviews'),
  theme: prefixed('theme'),
  lastClean: prefixed('last-clean'),
};

const now = () => Date.now();

const envelope = <T>(payload: T, ttl = DEFAULT_TTL): PersistedEnvelope<T> => ({
  version: STORAGE_VERSION,
  expiresAt: now() + ttl,
  payload,
});

const toPlain = <T>(payload: T): T => JSON.parse(JSON.stringify(payload)) as T;

const isExpired = <T>(data: PersistedEnvelope<T> | null) => {
  if (!data) return false;
  return Boolean(data.expiresAt && data.expiresAt < now());
};

const parseLocal = <T>(key: string): PersistedEnvelope<T> | null => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedEnvelope<T>;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const writeLocal = <T>(key: string, payload: T, ttl?: number) => {
  localStorage.setItem(key, JSON.stringify(envelope(payload, ttl)));
};

/**
 * 评价提交需要跨 reviews / users 两个 key 原子落库。
 * localStorage 与 IndexedDB 都没有多键事务，这里用进程内互斥队列串行化
 * 所有事务写，配合“先快照、失败整体回滚”，保证评价记录与信用分
 * 要么同时生效、要么都不留下；并发/重复提交排队后靠唯一约束只生效一次。
 */
let transactionChain: Promise<unknown> = Promise.resolve();

export const runInTransaction = async <T>(
  task: (reader: {
    get: <V>(key: string, fallback: V) => Promise<V>;
    set: <V>(key: string, payload: V, ttl?: number) => void;
  }) => Promise<T>,
): Promise<T> => {
  const run = async () => {
    const pending = new Map<string, { payload: unknown; ttl?: number }>();
    const reader = {
      get: async <V>(key: string, fallback: V): Promise<V> => {
        if (pending.has(key)) return pending.get(key)?.payload as V;
        return storage.get<V>(key, fallback);
      },
      set: <V>(key: string, payload: V, ttl?: number) => {
        // 预先序列化：复制失败直接中止，不会写出半截数据
        pending.set(key, { payload: toPlain(payload), ttl });
      },
    };

    const result = await task(reader);

    const snapshots = await Promise.all(
      [...pending.keys()].map(async (key) => ({ key, snapshot: await get<PersistedEnvelope<unknown>>(key) })),
    );
    try {
      for (const [key, { payload, ttl }] of pending) {
        // eslint-disable-next-line no-await-in-loop
        await storage.set(key, payload, ttl);
      }
    } catch (error) {
      // 任一键写入失败：已写入的键全部还原，没写入的删除，回到事务前状态
      await Promise.all(
        snapshots.map(async ({ key, snapshot }) => {
          if (snapshot) await set(key, snapshot);
          else await del(key);
          localStorage.removeItem(key);
          if (snapshot) localStorage.setItem(key, JSON.stringify(snapshot));
        }),
      );
      throw error;
    }
    return result;
  };

  // 无论上一个事务成功还是失败都继续执行本事务；.then 会 adopt run 返回的
  // Promise，因此 result 会等到本事务真正提交/回滚后才落定，调用方读到的即最终状态
  const result = transactionChain.then(run, run);
  transactionChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const localEnvelope = parseLocal<T>(key);
    if (isExpired(localEnvelope)) {
      await this.remove(key);
      return fallback;
    }
    if (localEnvelope?.version === STORAGE_VERSION) {
      return localEnvelope.payload;
    }

    const indexedEnvelope = await get<PersistedEnvelope<T>>(key);
    if (isExpired(indexedEnvelope ?? null)) {
      await this.remove(key);
      return fallback;
    }
    if (indexedEnvelope?.version === STORAGE_VERSION) {
      writeLocal(key, indexedEnvelope.payload);
      return indexedEnvelope.payload;
    }
    return fallback;
  },

  async set<T>(key: string, payload: T, ttl?: number): Promise<T> {
    const plainPayload = toPlain(payload);
    const packed = envelope(plainPayload, ttl);
    localStorage.setItem(key, JSON.stringify(packed));
    await set(key, packed);
    return plainPayload;
  },

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
    await del(key);
  },

  async cleanExpired(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    await Promise.all(
      keys.map(async (key) => {
        const localEnvelope = parseLocal<unknown>(key);
        if (isExpired(localEnvelope)) {
          await this.remove(key);
        }
      }),
    );
    localStorage.setItem(STORAGE_KEYS.lastClean, JSON.stringify(envelope(new Date().toISOString())));
  },

  createId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
  },
};
