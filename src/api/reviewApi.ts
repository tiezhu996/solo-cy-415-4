import { ExchangeStatus } from '@/constants/exchange';
import { FORM_MESSAGES } from '@/constants/messages';
import type { ExchangeReview, ReviewDraft } from '@/models/review';
import { recalcCreditScore } from '@/utils/credit';
import { runInTransaction, STORAGE_KEYS, storage } from '@/utils/storage';

import type { Exchange } from '@/models/exchange';
import type { User } from '@/models/user';

/**
 * 种子评价与 seedExchanges 中的两笔已完成交换一一对应：
 * - exchange_done_1：仅林小雨评价了青禾（5 星），留给当前用户“青禾”去评价
 * - exchange_done_2：双向评价，演示双方各评一次
 * 信用分由这些评分平均分推导：青禾收到 [5] → 100、林小雨收到 [5] → 100、
 * 陈木木收到 [4] → 80，与 userApi 种子信用分保持一致。
 */
const seedReviews: ExchangeReview[] = [
  {
    id: 'review_seed_1',
    exchange_id: 'exchange_done_1',
    reviewer_id: 'user_lin',
    reviewee_id: 'user_me',
    rating: 5,
    content: '交换很准时，耳机成色和描述一致。',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 88).toISOString(),
  },
  {
    id: 'review_seed_2',
    exchange_id: 'exchange_done_2',
    reviewer_id: 'user_chen',
    reviewee_id: 'user_lin',
    rating: 5,
    content: '小夜灯包装得很仔细。',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 118).toISOString(),
  },
  {
    id: 'review_seed_3',
    exchange_id: 'exchange_done_2',
    reviewer_id: 'user_lin',
    reviewee_id: 'user_chen',
    rating: 4,
    content: '龟背竹状态很好，沟通也顺畅。',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 116).toISOString(),
  },
];

export const reviewApi = {
  async list(): Promise<ExchangeReview[]> {
    const reviews = await storage.get<ExchangeReview[]>(STORAGE_KEYS.reviews, []);
    if (reviews.length) return reviews;
    await storage.set(STORAGE_KEYS.reviews, seedReviews);
    return seedReviews;
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
