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
 *
 * 回滚按“两层各自独立”处理：localStorage 与 IndexedDB 在事务前可能并不对称
 * （例如旧账户只存在于其中一层，另一层没有该键）。因此首次触碰一个 key 时
 * 同时捕获该 key 在两层的事务前原貌，失败后每层只恢复自己的原貌——
 * 有则还原、无则删除，绝不拿一层的值去顶替另一层，避免单层快照时误删原键。
 */
let transactionChain: Promise<unknown> = Promise.resolve();

interface LayerSnapshot {
  key: string;
  /** localStorage 事务前原始字符串：null 表示该层原本没有这个键 */
  localRaw: string | null;
  /** IndexedDB 事务前 envelope：undefined 表示该层原本没有这个键 */
  indexed: PersistedEnvelope<unknown> | undefined;
}

export const runInTransaction = async <T>(
  task: (reader: {
    get: <V>(key: string, fallback: V) => Promise<V>;
    set: <V>(key: string, payload: V, ttl?: number) => void;
  }) => Promise<T>,
): Promise<T> => {
  const run = async () => {
    const pending = new Map<string, { payload: unknown; ttl?: number }>();
    const snapshots = new Map<string, LayerSnapshot>();

    // 首次触碰（读或写）时记录该 key 在两层的事务前原貌。
    // 互斥队列保证同一时刻只有一个事务，读到的就是本次事务前的稳定状态。
    const capture = async (key: string): Promise<LayerSnapshot> => {
      const existing = snapshots.get(key);
      if (existing) return existing;
      const snapshot: LayerSnapshot = {
        key,
        localRaw: localStorage.getItem(key),
        indexed: await get<PersistedEnvelope<unknown>>(key),
      };
      snapshots.set(key, snapshot);
      return snapshot;
    };

    const reader = {
      get: async <V>(key: string, fallback: V): Promise<V> => {
        await capture(key);
        if (pending.has(key)) return pending.get(key)?.payload as V;
        return storage.get<V>(key, fallback);
      },
      set: <V>(key: string, payload: V, ttl?: number) => {
        // 预先序列化：复制失败直接中止，不会写出半截数据
        pending.set(key, { payload: toPlain(payload), ttl });
        void capture(key);
      },
    };

    const result = await task(reader);

    // 纯 set 未配 get 的 key 也要保证快照就绪后再进入写入阶段
    await Promise.all([...pending.keys()].map((key) => capture(key)));

    try {
      for (const [key, { payload, ttl }] of pending) {
        // eslint-disable-next-line no-await-in-loop
        await storage.set(key, payload, ttl);
      }
    } catch (error) {
      // 任一键写入失败：两层分别恢复到各自事务前原貌。
      // 一层有、另一层没有时，缺失的那层只删除本事务可能写入的值，
      // 绝不会因另一层有快照就把原键补写进去（旧账户仅单层时尤其关键）。
      await Promise.all(
        [...snapshots.values()].map(async ({ key, localRaw, indexed }) => {
          if (localRaw === null) localStorage.removeItem(key);
          else localStorage.setItem(key, localRaw);

          if (indexed === undefined) await del(key);
          else await set(key, indexed);
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
