<template>
  <article class="user-brief">
    <div class="avatar" :style="{ backgroundImage: user.avatar ? `url(${user.avatar})` : undefined }">
      <span v-if="!user.avatar">{{ user.nickname.slice(0, 1) }}</span>
    </div>
    <div>
      <div class="user-brief__name">
        <strong>{{ user.nickname }}</strong>
        <span>{{ formatCreditLevel(user.credit_score) }}</span>
      </div>
      <p>{{ user.location }} · 信用分 {{ user.credit_score }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { User } from '@/models/user';
import { useThemeStore } from '@/stores/themeStore';
import { formatCreditLevel } from '@/utils/formatters';

defineProps<{
  user: User;
}>();

useThemeStore();
</script>
