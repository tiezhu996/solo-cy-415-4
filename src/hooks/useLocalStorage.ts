import { ref, watch, type Ref } from 'vue';

export const useLocalStorage = <T>(key: string, fallback: T): Ref<T> => {
  const initial = localStorage.getItem(key);
  const state = ref(initial ? (JSON.parse(initial) as T) : fallback) as Ref<T>;
  watch(
    state,
    (value) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { deep: true },
  );
  return state;
};
