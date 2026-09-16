import type { ExchangeStatus } from '@/constants/exchange';
import type { ItemCondition, ItemStatus } from '@/constants/item';

export interface Option<T extends string> {
  label: string;
  value: T;
}

export interface PersistedEnvelope<T> {
  version: number;
  expiresAt?: number;
  payload: T;
}

export interface StatusFilter {
  item?: ItemStatus;
  exchange?: ExchangeStatus;
  condition?: ItemCondition;
}

export interface ImageFilePayload {
  id: string;
  name: string;
  dataUrl: string;
}
