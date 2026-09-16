<template>
  <section v-if="exchange.status === ExchangeStatus.COMPLETED" class="review-panel">
    <h4>交换信用评价</h4>

    <ul v-if="reviews.length" class="review-panel__list">
      <li v-for="review in reviews" :key="review.id" class="review-panel__item">
        <div class="review-panel__head">
          <strong>{{ reviewerName(review.reviewer_id) }}</strong>
          <StarRating :model-value="review.rating" readonly size="15" show-text />
        </div>
        <p v-if="review.content">{{ review.content }}</p>
        <small>{{ formatDate(review.created_at) }}</small>
      </li>
    </ul>
    <p v-else class="review-panel__hint">双方都还没有评价，完成交换后各有一次评价机会。</p>

    <div v-if="myReview" class="review-panel__done">
      <StarRating :model-value="myReview.rating" readonly size="18" />
      <span>{{ PAGE_MESSAGES.reviewDone }}</span>
      <span v-if="!peerReview" class="review-panel__waiting">（{{ PAGE_MESSAGES.reviewWaiting }}）</span>
    </div>

    <form v-else-if="canReview" class="review-panel__form" @submit.prevent="submitReview">
      <label>
        给对方的本次交换打星
        <StarRating v-model="rating" :disabled="reviewStore.submitting" :size="26" show-text />
      </label>
      <label>
        评价内容（选填）
        <textarea
          v-model="content"
          rows="2"
          maxlength="120"
          placeholder="物品成色、守时程度、沟通体验……"
          :disabled="reviewStore.submitting"
        />
      </label>
      <button class="secondary-button" type="submit" :disabled="reviewStore.submitting || !rating">
        {{ reviewStore.submitting ? '提交中…' : '提交评价' }}
      </button>
      <p class="form-note">评价生效后对方信用分按全部已生效评分的平均分重算，且只能评价一次。</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import StarRating from '@/components/common/StarRating.vue';
import { ExchangeStatus } from '@/constants/exchange';
import { PAGE_MESSAGES } from '@/constants/messages';
import type { Exchange } from '@/models/exchange';
import { useExchangeReview } from '@/hooks/useExchangeReview';
import { useAuthStore } from '@/stores/authStore';
import { useReviewStore } from '@/stores/reviewStore';
import { formatDate } from '@/utils/formatters';

const props = defineProps<{
  exchange: Exchange;
}>();

const authStore = useAuthStore();
const reviewStore = useReviewStore();
const { reviews, myReview, peerReview, canReview } = useExchangeReview(() => props.exchange);

const rating = ref(0);
const content = ref('');

const reviewerName = (userId: string) =>
  authStore.users.find((user) => user.id === userId)?.nickname ?? '交换参与者';

const submitReview = async () => {
  if (!authStore.currentUser || !rating.value) return;
  const revieweeId = [props.exchange.from_user_id, props.exchange.to_user_id].find(
    (id) => id !== authStore.currentUser!.id,
  );
  try {
    await reviewStore.submit({
      exchange_id: props.exchange.id,
      reviewer_id: authStore.currentUser.id,
      reviewee_id: revieweeId!,
      rating: rating.value,
      content: content.value,
    });
    content.value = '';
  } catch {
    // 失败（含重复评价、权限不符）已由 store 统一提示，事务保证未留下任何数据
  }
};
</script>
