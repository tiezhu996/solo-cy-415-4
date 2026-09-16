<template>
  <van-config-provider :theme="vantTheme">
    <GlobalErrorBoundary>
      <div class="app-shell">
        <header class="topbar">
          <RouterLink class="brand" to="/home">
            <span>ReSwap</span>
            <small>物尽其用</small>
          </RouterLink>
          <nav>
            <RouterLink to="/home">首页</RouterLink>
            <RouterLink to="/publish">发布</RouterLink>
            <RouterLink to="/exchanges">交换</RouterLink>
            <RouterLink to="/profile">我的</RouterLink>
          </nav>
          <button class="theme-toggle" type="button" @click="themeStore.toggle">
            {{ themeStore.token.label }}
          </button>
        </header>
        <main>
          <RouterView />
        </main>
      </div>
    </GlobalErrorBoundary>
  </van-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { ConfigProvider as VanConfigProvider } from 'vant';

import GlobalErrorBoundary from '@/components/common/GlobalErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import { useExchangeStore } from '@/stores/exchangeStore';
import { useItemStore } from '@/stores/itemStore';
import { useThemeStore } from '@/stores/themeStore';
import { toVantTheme } from '@/utils/themeUtils';

const authStore = useAuthStore();
const itemStore = useItemStore();
const exchangeStore = useExchangeStore();
const themeStore = useThemeStore();
const vantTheme = computed(() => toVantTheme(themeStore.theme));

onMounted(async () => {
  themeStore.hydrate();
  await Promise.all([authStore.hydrate(), itemStore.hydrate(), exchangeStore.hydrate()]);
});
</script>
