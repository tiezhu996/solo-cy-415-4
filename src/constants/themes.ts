export type ThemeName = 'light' | 'dark';

export interface ThemeToken {
  name: ThemeName;
  label: string;
  background: string;
  surface: string;
  text: string;
  primary: string;
  accent: string;
  vantTheme: 'light' | 'dark';
}

export const THEMES: Record<ThemeName, ThemeToken> = {
  light: {
    name: 'light',
    label: '日间',
    background: '#f5f1e8',
    surface: '#fffaf0',
    text: '#213426',
    primary: '#3f6b57',
    accent: '#b77742',
    vantTheme: 'light',
  },
  dark: {
    name: 'dark',
    label: '夜间',
    background: '#17251d',
    surface: '#213426',
    text: '#eef2e6',
    primary: '#8ebc95',
    accent: '#d9a15f',
    vantTheme: 'dark',
  },
};

export const THEME_STORAGE_KEY = 'reswap:theme';
