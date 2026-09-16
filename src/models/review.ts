/**
 * ExchangeReview（交换信用评价）
 *
 * 一次已完成交换，参与双方各能留下一条评价：
 * - reviewer_id：评价人（打分的人）
 * - reviewee_id：被评价人（信用分被重算的人）
 * - (exchange_id, reviewer_id) 唯一：同一方重复/并发提交只生效一次
 */
export interface ExchangeReview {
  id: string;
  exchange_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  content: string;
  created_at: string;
}

export type ReviewDraft = Pick<ExchangeReview, 'exchange_id' | 'reviewer_id' | 'reviewee_id' | 'rating'> &
  Partial<Pick<ExchangeReview, 'content'>>;
