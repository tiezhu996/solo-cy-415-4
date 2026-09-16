<template>
  <label class="avatar-uploader">
    <input type="file" accept="image/*" @change="handleFile" />
    <span class="avatar avatar--large" :style="{ backgroundImage: modelValue ? `url(${modelValue})` : undefined }">
      <span v-if="!modelValue">换</span>
    </span>
    <small>点击更换头像</small>
  </label>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const handleFile = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => emit('update:modelValue', String(reader.result));
  reader.readAsDataURL(file);
};

void props;
</script>
