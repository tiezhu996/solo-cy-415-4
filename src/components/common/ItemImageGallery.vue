<template>
  <div class="gallery">
    <div class="gallery__main" :style="{ backgroundImage: `url(${activeImage})` }">
      <span v-if="!images.length">{{ fallbackText }}</span>
    </div>
    <div v-if="normalizedImages.length > 1" class="gallery__thumbs">
      <button
        v-for="(image, index) in normalizedImages"
        :key="image"
        class="gallery__thumb"
        :class="{ 'gallery__thumb--active': image === activeImage }"
        type="button"
        :style="{ backgroundImage: `url(${image})` }"
        @click="activeIndex = index"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    images: string[];
    fallbackText?: string;
  }>(),
  {
    fallbackText: 'ReSwap',
  },
);

const fallbackImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='650' viewBox='0 0 900 650'%3E%3Crect width='900' height='650' fill='%23d9c7a5'/%3E%3Cpath d='M0 480C170 410 290 520 450 455S730 330 900 395V650H0Z' fill='%2385a77d'/%3E%3Ccircle cx='700' cy='130' r='74' fill='%23f6eddb'/%3E%3Ctext x='70' y='120' font-family='Arial' font-size='54' font-weight='700' fill='%23213426'%3EReSwap%3C/text%3E%3Ctext x='74' y='175' font-family='Arial' font-size='28' fill='%233f5d48'%3E物尽其用%3C/text%3E%3C/svg%3E";

const activeIndex = ref(0);
const normalizedImages = computed(() => (props.images.length ? props.images : [fallbackImage]));
const activeImage = computed(() => normalizedImages.value[activeIndex.value] ?? normalizedImages.value[0]);

watch(
  () => props.images,
  () => {
    activeIndex.value = 0;
  },
);
</script>
