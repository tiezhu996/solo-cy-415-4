import { defineStore } from 'pinia';

import { reviewApi } from '@/api/reviewApi';
import { PAGE_MESSAGES } from '@/constants/messages';
import type { ExchangeReview, ReviewDraft } from '@/models/review';
import { useAuthStore } from '@/stores/authStore';
import { averageRating } from '@/utils/credit';
import { message } from '@/utils/message';

export const useReviewStore = defineStore('reviews', {
  state: () => ({
    reviews: [] as ExchangeReview[],
    loaded: false,
    loading: false,
    submitting: false,
  }),
  getters: {
    byExchange: (state) => (exchangeId: string) =>
      state.reviews.filter((review) => review.exchange_id === exchangeId),
    mine: (state) => (userId: string) =>
      state.reviews.filter((review) => review.reviewer_id === userId),
    received: (state) => (userId: string) =>
      state.reviews.filter((review) => review.reviewee_id === userId),
    creditOf: (state) => (userId: string) => {
      const ratings = state.reviews
        .filter((review) => review.reviewee_id === userId)
        .map((review) => review.rating);
      return {
        count: ratings.length,
        average: averageRating(ratings),
      };
    },
  },
  actions: {
    async hydrate(force = false) {
      if (this.loading || (this.loaded && !force)) return;
      this.loading = true;
      try {
        this.reviews = await reviewApi.list();
        this.loaded = true;
        // 演示评价初始化会原子重算受影响用户的信用分，刷新用户数据保持口径一致
        const authStore = useAuthStore();
        await authStore.hydrate();
      } finally {
        this.loading = false;
      }
    },
    /**
     * 提交评价。成功后刷新评价记录与 authStore 用户列表，
     * 保证信用分展示与已生效评价同步；失败时 reviewApi 已整体回滚，这里只提示。
     */
    async submit(draft: ReviewDraft) {
      if (this.submitting) return null;
      this.submitting = true;
      try {
        const result = await reviewApi.submit(draft);
        this.reviews = await reviewApi.list();
        const authStore = useAuthStore();
        await authStore.hydrate();
        message(PAGE_MESSAGES.reviewSubmitted, 'success');
        return result;
      } catch (error) {
        message(error instanceof Error ? error.message : '评价提交失败', 'error');
        throw error;
      } finally {
        this.submitting = false;
      }
    },
  },
});
