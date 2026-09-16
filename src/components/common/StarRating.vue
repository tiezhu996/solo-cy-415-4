<template>
  <div class="star-rating" :class="{ 'star-rating--readonly': readonly }">
    <van-rate
      :model-value="modelValue"
      :readonly="readonly"
      :disabled="disabled"
      :allow-half="false"
      :size="size"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <span v-if="showText" class="star-rating__label">{{ ratingLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Rate as VanRate } from 'vant';

import { MAX_RATING, RATING_OPTIONS } from '@/constants/review';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    readonly?: boolean;
    disabled?: boolean;
    size?: number | string;
    showText?: boolean;
  }>(),
  {
    readonly: false,
    disabled: false,
    size: 22,
    showText: false,
  },
);

defineEmits<{
  'update:modelValue': [value: number];
}>();

const ratingLabel = computed(() => {
  if (!props.modelValue) return '未评分';
  return RATING_OPTIONS.find((option) => option.value === props.modelValue)?.label ?? `${props.modelValue}/${MAX_RATING}`;
});
</script>
