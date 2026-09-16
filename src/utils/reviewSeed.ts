import { ExchangeStatus } from '@/constants/exchange';
import { isValidRating } from '@/utils/credit';

import type { Exchange } from '@/models/exchange';
import type { Item } from '@/models/item';
import type { ExchangeReview } from '@/models/review';
import type { User } from '@/models/user';

/** 演示评价候选：与固定 seedExchanges/seedItems 中的关系一一对应 */
export interface SeedReviewSpec {
  exchange_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  content: string;
  ageMs: number;
}

export interface PlannedSeedReview {
  spec: SeedReviewSpec;
  created_at: string;
}

export interface ReviewSeedPlan {
  /** 关系齐全、本次可以补齐的演示评价 */
  toInsert: PlannedSeedReview[];
  /** 关系缺失/重复/非法而跳过的候选及原因（不阻断其余候选） */
  skipped: Array<{ spec: SeedReviewSpec; reason: string }>;
  /**
   * 本次受影响被评价人的新信用分：
   * 按“已有评价 + 本次补齐评价”的全部已生效评分平均分计算。
   * 不在此 map 中的用户信用分保持不变。
   */
  scoreUpdates: Record<string, number>;
  hasChanges: boolean;
}

/**
 * 纯函数：规划演示评价初始化，不触碰任何存储，方便对每个边界场景单测。
 *
 * 只有当演示评价对应的“已完成交换 + 双方参与者账户 + 双方物品归属关系”
 * 都齐全时才纳入待插入；候选之间互不影响，只剩部分演示交换时只补齐仍匹配的部分。
 * 已存在 (exchange_id, reviewer_id) 评价的候选按幂等跳过，重试不会重复补评价。
 */
export const planReviewSeeds = (
  input: {
    exchanges: Exchange[];
    users: User[];
    items: Item[];
    reviews: ExchangeReview[];
    specs: SeedReviewSpec[];
  },
  now: number,
): ReviewSeedPlan => {
  const { exchanges, users, items, reviews, specs } = input;
  const toInsert: PlannedSeedReview[] = [];
  const skipped: ReviewSeedPlan['skipped'] = [];

  const userIds = new Set(users.map((user) => user.id));
  const exchangeMap = new Map(exchanges.map((exchange) => [exchange.id, exchange]));
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const skip = (spec: SeedReviewSpec, reason: string) => skipped.push({ spec, reason });

  specs.forEach((spec) => {
    const exchange = exchangeMap.get(spec.exchange_id);
    if (!exchange || exchange.status !== ExchangeStatus.COMPLETED) {
      skip(spec, 'exchange-not-completed');
      return;
    }

    // 评价双方必须正好是本次交换的两个参与者，且账户都还存在
    const participants = [exchange.from_user_id, exchange.to_user_id];
    const pair = [spec.reviewer_id, spec.reviewee_id].sort();
    const expected = [...participants].sort();
    if (pair.length !== expected.length || pair.some((id, index) => id !== expected[index])) {
      skip(spec, 'reviewer-not-participant');
      return;
    }
    if (![spec.reviewer_id, spec.reviewee_id].every((id) => userIds.has(id))) {
      skip(spec, 'participant-account-missing');
      return;
    }

    // 交换涉及的两个物品都必须存在，且各自归属交换中的对应一方
    const fromItem = itemMap.get(exchange.from_item_id);
    const toItem = itemMap.get(exchange.to_item_id);
    if (!fromItem || fromItem.user_id !== exchange.from_user_id) {
      skip(spec, 'from-item-relation-broken');
      return;
    }
    if (!toItem || toItem.user_id !== exchange.to_user_id) {
      skip(spec, 'to-item-relation-broken');
      return;
    }

    // 幂等闸门：自然键已存在评价（上次初始化补过或用户手动评过）一律不重复补
    const duplicated = reviews.some(
      (review) => review.exchange_id === spec.exchange_id && review.reviewer_id === spec.reviewer_id,
    );
    if (duplicated) {
      skip(spec, 'already-exists');
      return;
    }

    if (!isValidRating(spec.rating)) {
      skip(spec, 'invalid-rating');
      return;
    }

    toInsert.push({ spec, created_at: new Date(now - spec.ageMs).toISOString() });
  });

  // 只重算“本次确实补了评价”的被评价人，且评分口径是其全部已生效评分
  const scoreUpdates: Record<string, number> = {};
  const insertedByReviewee = new Map<string, number[]>();
  toInsert.forEach(({ spec }) => {
    const ratings = insertedByReviewee.get(spec.reviewee_id) ?? [];
    ratings.push(spec.rating);
    insertedByReviewee.set(spec.reviewee_id, ratings);
  });
  insertedByReviewee.forEach((insertedRatings, revieweeId) => {
    const existingRatings = reviews
      .filter((review) => review.reviewee_id === revieweeId)
      .map((review) => review.rating);
    const next = [...existingRatings, ...insertedRatings].reduce((sum, rating) => sum + rating, 0)
      / (existingRatings.length + insertedRatings.length);
    scoreUpdates[revieweeId] = Math.round(next * 20);
  });

  return {
    toInsert,
    skipped,
    scoreUpdates,
    hasChanges: toInsert.length > 0,
  };
};
