<template>
  <section class="page exchanges-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">交换管理</p>
        <h1>让每一次交换都有状态</h1>
      </div>
    </div>

    <div class="stats-row">
      <span>全部 {{ stats.total }}</span>
      <span>待确认 {{ stats.pending }}</span>
      <span>已同意 {{ stats.accepted }}</span>
      <span>已完成 {{ stats.completed }}</span>
    </div>

    <div class="segmented">
      <button :class="{ active: tab === 'sent' }" type="button" @click="tab = 'sent'">我发起的</button>
      <button :class="{ active: tab === 'received' }" type="button" @click="tab = 'received'">我收到的</button>
      <select v-model="exchangeStore.statusFilter">
        <option value="all">全部状态</option>
        <option v-for="option in EXCHANGE_STATUS_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div v-if="visibleExchanges.length" class="exchange-list">
      <ExchangeCard
        v-for="exchange in visibleExchanges"
        :key="exchange.id"
        :exchange="exchange"
        :items="itemStore.items"
        :users="authStore.users"
        @accept="exchangeStore.accept"
        @reject="exchangeStore.reject"
        @complete="completeExchange"
      />
    </div>
    <EmptyState
      v-else
      title="暂无交换请求"
      :description="PAGE_MESSAGES.exchangeEmpty"
      mark="换"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import EmptyState from '@/components/common/EmptyState.vue';
import ExchangeCard from '@/components/common/ExchangeCard.vue';
import { EXCHANGE_STATUS_OPTIONS, ExchangeStatus } from '@/constants/exchange';
import { PAGE_MESSAGES } from '@/constants/messages';
import { useExchangeStats } from '@/hooks/useExchangeStats';
import { useAuthStore } from '@/stores/authStore';
import { useExchangeStore } from '@/stores/exchangeStore';
import { useItemStore } from '@/stores/itemStore';

const authStore = useAuthStore();
const itemStore = useItemStore();
const exchangeStore = useExchangeStore();
const tab = ref<'sent' | 'received'>('sent');

const mine = computed(() => {
  if (!authStore.currentUser) return [];
  const list = tab.value === 'sent' ? exchangeStore.sent(authStore.currentUser.id) : exchangeStore.received(authStore.currentUser.id);
  return exchangeStore.statusFilter === 'all'
    ? list
    : list.filter((item) => item.status === exchangeStore.statusFilter);
});
const visibleExchanges = computed(() => mine.value);
const stats = useExchangeStats(() => exchangeStore.exchanges);

const completeExchange = async (id: string) => {
  await exchangeStore.complete(id);
  itemStore.items = itemStore.items.map((item) => item);
};

void ExchangeStatus.PENDING;
</script>
