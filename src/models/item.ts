import { ItemCondition, ItemStatus } from '@/constants/item';

export interface Item {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  condition: ItemCondition;
  images: string[];
  status: ItemStatus;
  location: string;
  created_at: string;
}

export type ItemDraft = Omit<Item, 'id' | 'status' | 'created_at'> & {
  status?: ItemStatus;
};
