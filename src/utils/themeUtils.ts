import { ConfigProviderTheme } from 'vant';

import { THEMES, type ThemeName } from '@/constants/themes';

export const applyThemeToDocument = (theme: ThemeName) => {
  const token = THEMES[theme];
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.setProperty('--rs-bg', token.background);
  root.style.setProperty('--rs-surface', token.surface);
  root.style.setProperty('--rs-text', token.text);
  root.style.setProperty('--rs-primary', token.primary);
  root.style.setProperty('--rs-accent', token.accent);
};

export const toVantTheme = (theme: ThemeName): ConfigProviderTheme => THEMES[theme].vantTheme;
