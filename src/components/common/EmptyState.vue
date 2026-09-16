<template>
  <section class="empty-state">
    <div class="empty-state__mark">{{ mark }}</div>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  mark?: string;
}>();
</script>
