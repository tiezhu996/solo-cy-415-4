<template>
  <section class="page publish-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">发布闲置</p>
        <h1>描述清楚，比估价更重要</h1>
      </div>
    </div>

    <form class="publish-form" @submit.prevent="submit">
      <label>
        物品标题
        <input v-model="form.title" placeholder="例如：富士拍立得 Mini" />
      </label>
      <label>
        物品描述
        <textarea v-model="form.description" rows="4" placeholder="写明瑕疵、期望交换的品类和取货方式" />
      </label>
      <label>
        分类
        <CategoryFilter v-model="form.category" :categories="publishCategories" />
      </label>
      <label>
        成色
        <select v-model="form.condition">
          <option v-for="option in ITEM_CONDITION_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <label>
        交换地点
        <input v-model="form.location" placeholder="城市 · 区域" />
      </label>
      <ImageUploader v-model="form.images" />
      <p class="form-note">{{ PAGE_MESSAGES.publishReady }}</p>
      <button class="primary-button" type="submit">发布物品</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';

import CategoryFilter from '@/components/common/CategoryFilter.vue';
import ImageUploader from '@/components/common/ImageUploader.vue';
import { ITEM_CATEGORIES, ITEM_CONDITION_OPTIONS, ItemCondition, ItemStatus } from '@/constants/item';
import { PAGE_MESSAGES } from '@/constants/messages';
import { useAuthStore } from '@/stores/authStore';
import { useItemStore } from '@/stores/itemStore';

const router = useRouter();
const authStore = useAuthStore();
const itemStore = useItemStore();
const publishCategories = ITEM_CATEGORIES.filter((item) => item !== '全部');

const form = reactive({
  title: '',
  description: '',
  category: '数码',
  condition: ItemCondition.GOOD,
  images: [] as string[],
  location: authStore.currentUser?.location ?? '上海 · 徐汇',
  status: ItemStatus.AVAILABLE,
});

const submit = async () => {
  if (!authStore.currentUser) return;
  const item = await itemStore.publish({
    user_id: authStore.currentUser.id,
    title: form.title,
    description: form.description,
    category: form.category,
    condition: form.condition,
    images: form.images,
    location: form.location,
    status: ItemStatus.AVAILABLE,
  });
  if (item) {
    await router.push(`/item/${item.id}`);
  }
};
</script>
