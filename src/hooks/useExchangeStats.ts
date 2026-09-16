import { computed } from 'vue';

import { ExchangeStatus } from '@/constants/exchange';
import type { Exchange } from '@/models/exchange';

export const useExchangeStats = (exchanges: () => Exchange[]) => {
  return computed(() => ({
    total: exchanges().length,
    pending: exchanges().filter((item) => item.status === ExchangeStatus.PENDING).length,
    accepted: exchanges().filter((item) => item.status === ExchangeStatus.ACCEPTED).length,
    rejected: exchanges().filter((item) => item.status === ExchangeStatus.REJECTED).length,
    completed: exchanges().filter((item) => item.status === ExchangeStatus.COMPLETED).length,
  }));
};
