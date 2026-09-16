import { ExchangeStatus } from '@/constants/exchange';

export interface Exchange {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_item_id: string;
  to_item_id: string;
  status: ExchangeStatus;
  message: string;
  created_at: string;
  updated_at: string;
}

export type ExchangeDraft = Omit<Exchange, 'id' | 'status' | 'created_at' | 'updated_at'> & {
  status?: ExchangeStatus;
};
