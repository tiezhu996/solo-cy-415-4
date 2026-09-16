import { itemApi } from '@/api/itemApi';
import { exchangeApi } from '@/api/exchangeApi';
import { userApi } from '@/api/userApi';
import { ExchangeStatus } from '@/constants/exchange';
import { FORM_MESSAGES } from '@/constants/messages';
import type { ExchangeReview, ReviewDraft } from '@/models/review';
import { recalcCreditScore } from '@/utils/credit';
import { planReviewSeeds, type SeedReviewSpec } from '@/utils/reviewSeed';
import { runInTransaction, STORAGE_KEYS, storage } from '@/utils/storage';

import type { Exchange } from '@/models/exchange';
import type { Item } from '@/models/item';
import type { User } from '@/models/user';

/**
 * 演示评价候选，与 exchangeApi/itemApi 中固定的两笔已完成交换及其物品归属对应：
 * - exchange_done_1：仅林小雨评价了青禾（5 星），留给当前用户“青禾”去评价
 * - exchange_done_2：双向评价，演示双方各评一次
 */
const SEED_REVIEW_SPECS: SeedReviewSpec[] = [
  {
    exchange_id: 'exchange_done_1',
    reviewer_id: 'user_lin',
    reviewee_id: 'user_me',
    rating: 5,
    content: '交换很准时，耳机成色和描述一致。',
    ageMs: 1000 * 60 * 60 * 88,
  },
  {
    exchange_id: 'exchange_done_2',
    reviewer_id: 'user_chen',
    reviewee_id: 'user_lin',
    rating: 5,
    content: '小夜灯包装得很仔细。',
    ageMs: 1000 * 60 * 60 * 118,
  },
  {
    exchange_id: 'exchange_done_2',
    reviewer_id: 'user_lin',
    reviewee_id: 'user_chen',
    rating: 4,
    content: '龟背竹状态很好，沟通也顺畅。',
    ageMs: 1000 * 60 * 60 * 116,
  },
];

/** 演示评价使用可复现的稳定 id，避免重试时因随机 id 造成重复 */
const seedReviewId = (spec: SeedReviewSpec) =>
  `review_seed_${spec.exchange_id}_${spec.reviewer_id}`;

export const reviewApi = {
  /**
   * 读取评价，并幂等补齐演示评价。
   *
   * 初始化策略（避免污染已有数据）：
   * 1. 先确保 exchanges/users/items 三类基础数据就位（已有数据则原样返回）；
   * 2. 在 runInTransaction 互斥事务内用 planReviewSeeds 逐条校验候选，
   *    只有“已完成交换 + 双方参与者账户 + 双方物品归属关系”都齐全才补齐；
   * 3. 评价写入与受影响被评价人的信用分重算同一批次提交，
   *    任一步失败则评价和分值都不变；
   * 4. 自然键 (exchange_id, reviewer_id) 已存在的候选跳过，
   *    重试 / 部分演示交换缺失时只处理仍匹配的部分，不重复补评价、不重复改分；
   * 5. 没有任何待补候选时不执行写入，原交换、物品、账户资料与已有评价保持不变。
   */
  async list(): Promise<ExchangeReview[]> {
    // 基础实体按各自既有规则“无则播种、有则原样返回”，不改变已有数据
    const [, , existing] = await Promise.all([userApi.list(), itemApi.list(), exchangeApi.list()]);

    return runInTransaction(async (tx) => {
      const exchanges = await tx.get<Exchange[]>(STORAGE_KEYS.exchanges, existing);
      const users = await tx.get<User[]>(STORAGE_KEYS.users, []);
      const items = await tx.get<Item[]>(STORAGE_KEYS.items, []);
      const reviews = await tx.get<ExchangeReview[]>(STORAGE_KEYS.reviews, []);

      const plan = planReviewSeeds(
        { exchanges, users, items, reviews, specs: SEED_REVIEW_SPECS },
        Date.now(),
      );

      if (!plan.hasChanges) return reviews;

      const inserted: ExchangeReview[] = plan.toInsert.map(({ spec, created_at }) => ({
        id: seedReviewId(spec),
        exchange_id: spec.exchange_id,
        reviewer_id: spec.reviewer_id,
        reviewee_id: spec.reviewee_id,
        rating: spec.rating,
        content: spec.content,
        created_at,
      }));

      // 与提交评价保持一致：新评价在前、同时间戳用 id 兜底排序
      const nextReviews = [...inserted, ...reviews].sort((a, b) => {
        const time = b.created_at.localeCompare(a.created_at);
        return time !== 0 ? time : a.id.localeCompare(b.id);
      });

      // 仅改本次补了评价的被评价人，其余用户资料（含信用分）保持不变
      const nextUsers = users.map((user) =>
        Object.prototype.hasOwnProperty.call(plan.scoreUpdates, user.id)
          ? { ...user, credit_score: plan.scoreUpdates[user.id] }
          : user,
      );

      // 同一批次原子落库，任一 key 写入失败由 storage 层整体回滚
      tx.set(STORAGE_KEYS.reviews, nextReviews);
      tx.set(STORAGE_KEYS.users, nextUsers);

      return nextReviews;
    });
  },

  byExchange(exchangeId: string): Promise<ExchangeReview[]> {
    return this.list().then((reviews) => reviews.filter((review) => review.exchange_id === exchangeId));
  },

  /**
   * 提交评价（评价记录 + 对方信用分重算）。
   *
   * 全程在 runInTransaction 互斥事务内执行：
   * 1. 互斥队列把重复点击 / 双方同时评价串行化；
   * 2. (exchange_id, reviewer_id) 唯一校验在同一事务内复查，
   *    排队到达的第二次提交会命中已存在记录而失败，不产生第二条；
   * 3. 新记录与被评价人的新信用分通过同一个 tx.set 批次提交，
   *    storage 层任一键写入失败即整体回滚——两者同时成立或同时不留下。
   */
  async submit(draft: ReviewDraft): Promise<{ review: ExchangeReview; creditScore: number }> {
    return runInTransaction(async (tx) => {
      const exchanges = await tx.get<Exchange[]>(STORAGE_KEYS.exchanges, []);
      const users = await tx.get<User[]>(STORAGE_KEYS.users, []);
      const reviews = await tx.get<ExchangeReview[]>(STORAGE_KEYS.reviews, []);

      const exchange = exchanges.find((item) => item.id === draft.exchange_id);
      if (!exchange || exchange.status !== ExchangeStatus.COMPLETED) {
        throw new Error(FORM_MESSAGES.reviewNotCompleted);
      }

      const participants = [exchange.from_user_id, exchange.to_user_id];
      if (!participants.includes(draft.reviewer_id)) {
        throw new Error(FORM_MESSAGES.reviewNotParticipant);
      }

      // 被评价人由交换关系推导，忽略客户端传入，避免越权评价第三方
      const revieweeId = participants.find((id) => id !== draft.reviewer_id)!;
      if (draft.reviewee_id && draft.reviewee_id !== revieweeId) {
        throw new Error(FORM_MESSAGES.reviewNotParticipant);
      }

      // 同一交换同一评价人只能生效一次（重复提交 / 并发提交的最终闸门）
      const duplicated = reviews.some(
        (review) => review.exchange_id === draft.exchange_id && review.reviewer_id === draft.reviewer_id,
      );
      if (duplicated) {
        throw new Error(FORM_MESSAGES.reviewAlreadyExists);
      }

      if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5) {
        throw new Error(FORM_MESSAGES.reviewRatingRange);
      }

      const review: ExchangeReview = {
        id: storage.createId('review'),
        exchange_id: draft.exchange_id,
        reviewer_id: draft.reviewer_id,
        reviewee_id: revieweeId,
        rating: draft.rating,
        content: draft.content?.trim() ?? '',
        created_at: new Date().toISOString(),
      };
      const nextReviews = [review, ...reviews];

      // 按被评价人“全部已生效评分”的平均分重算信用分
      const revieweeRatings = nextReviews
        .filter((item) => item.reviewee_id === revieweeId)
        .map((item) => item.rating);
      const nextScore = recalcCreditScore(revieweeRatings);
      if (nextScore === null) throw new Error(FORM_MESSAGES.reviewRatingRange);

      const nextUsers = users.map((user) =>
        user.id === revieweeId ? { ...user, credit_score: nextScore } : user,
      );
      if (!nextUsers.some((user) => user.id === revieweeId)) {
        throw new Error('被评价用户不存在');
      }

      // 同一批次原子落库：任一失败由 storage 层回滚，评价与分值保持一致
      tx.set(STORAGE_KEYS.reviews, nextReviews);
      tx.set(STORAGE_KEYS.users, nextUsers);

      return { review, creditScore: nextScore };
    });
  },
};
