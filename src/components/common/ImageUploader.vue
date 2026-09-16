<template>
  <div class="image-uploader">
    <label class="image-uploader__button">
      <input type="file" accept="image/*" multiple @change="handleFiles" />
      <span>上传图片</span>
      <small>最多 4 张，本地 base64</small>
    </label>
    <div v-if="modelValue.length" class="image-uploader__grid">
      <figure v-for="image in modelValue" :key="image">
        <img :src="image" alt="上传的物品图片" />
        <button type="button" @click="remove(image)">移除</button>
      </figure>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FORM_MESSAGES } from '@/constants/messages';
import { message } from '@/utils/message';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const handleFiles = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (props.modelValue.length + files.length > 4) {
    message(FORM_MESSAGES.imageLimit, 'error');
    input.value = '';
    return;
  }
  const nextImages = await Promise.all(files.map(readAsDataUrl));
  emit('update:modelValue', [...props.modelValue, ...nextImages]);
  input.value = '';
};

const remove = (image: string) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((item) => item !== image),
  );
};
</script>
