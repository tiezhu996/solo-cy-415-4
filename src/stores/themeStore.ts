import { defineStore } from 'pinia';

import { THEME_STORAGE_KEY, THEMES, type ThemeName } from '@/constants/themes';
import { applyThemeToDocument } from '@/utils/themeUtils';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: 'light' as ThemeName,
  }),
  getters: {
    token: (state) => THEMES[state.theme],
  },
  actions: {
    hydrate() {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
      this.theme = saved && THEMES[saved] ? saved : 'light';
      applyThemeToDocument(this.theme);
    },
    toggle() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_STORAGE_KEY, this.theme);
      applyThemeToDocument(this.theme);
    },
  },
});
