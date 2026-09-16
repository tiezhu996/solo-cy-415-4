import { computed } from 'vue';

import type { Exchange } from '@/models/exchange';
import { useAuthStore } from '@/stores/authStore';
import { useReviewStore } from '@/stores/reviewStore';

/**
 * 单个交换的评价状态：当前用户能否评价、是否已评价、对方是否已评价。
 * 仅交换参与者会进入评价流程，权限闸门同时存在于 reviewApi.submit。
 */
export const useExchangeReview = (exchange: () => Exchange | undefined) => {
  const authStore = useAuthStore();
  const reviewStore = useReviewStore();

  const reviews = computed(() => {
    const current = exchange();
    return current ? reviewStore.byExchange(current.id) : [];
  });

  const myReview = computed(() =>
    reviews.value.find((review) => review.reviewer_id === authStore.currentUser?.id),
  );

  const peerReview = computed(() =>
    reviews.value.find((review) => review.reviewee_id === authStore.currentUser?.id),
  );

  const isParticipant = computed(() => {
    const current = exchange();
    const userId = authStore.currentUser?.id;
    return Boolean(
      current && userId && [current.from_user_id, current.to_user_id].includes(userId),
    );
  });

  const canReview = computed(
    () => Boolean(exchange()) && isParticipant.value && !myReview.value,
  );

  return { reviews, myReview, peerReview, isParticipant, canReview };
};
