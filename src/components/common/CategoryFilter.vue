<template>
  <div class="category-filter" aria-label="分类筛选">
    <button
      v-for="category in categories"
      :key="category"
      class="category-filter__item"
      :class="{ 'category-filter__item--active': modelValue === category }"
      type="button"
      @click="$emit('update:modelValue', category)"
    >
      {{ category }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ITEM_CATEGORIES } from '@/constants/item';
import { useThemeStore } from '@/stores/themeStore';

withDefaults(
  defineProps<{
    modelValue: string;
    categories?: string[];
  }>(),
  {
    categories: () => ITEM_CATEGORIES,
  },
);

defineEmits<{
  'update:modelValue': [value: string];
}>();

useThemeStore();
</script>
