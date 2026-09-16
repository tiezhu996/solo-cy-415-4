import { MAX_RATING, MIN_RATING } from '@/constants/review';

export const isValidRating = (rating: number) =>
  Number.isInteger(rating) && rating >= MIN_RATING && rating <= MAX_RATING;

/**
 * 按被评价人“全部已生效评分”的平均分重算信用分。
 * 1-5 星线性映射到 20-100 分：信用分 = 平均分 × 20。
 * 尚未收到任何评价时返回 null，调用方保留原信用分。
 */
export const recalcCreditScore = (ratings: number[]): number | null => {
  if (!ratings.length) return null;
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return Math.round(average * 20);
};

export const averageRating = (ratings: number[]): number => {
  if (!ratings.length) return 0;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
};
