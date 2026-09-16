export const MIN_RATING = 1;
export const MAX_RATING = 5;

export const RATING_OPTIONS = [
  { label: '很差', value: 1 },
  { label: '较差', value: 2 },
  { label: '一般', value: 3 },
  { label: '满意', value: 4 },
  { label: '非常满意', value: 5 },
];

/** 无评分时的初始信用分（1-5 星均值映射到 20-100 分） */
export const DEFAULT_CREDIT_SCORE = 80;

export const REVIEW_STORAGE_HINTS = {
  statusKey: 'reswap:reviews',
  statusTouchedBy: ['models/review.ts', 'api/reviewApi.ts', 'stores/reviewStore.ts', 'components/common/ExchangeReviewPanel.vue'],
};
