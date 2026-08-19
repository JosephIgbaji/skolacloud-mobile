import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#0284c7', // Electric Cyan / Sky 600
    primaryLight: '#38bdf8', // Sky 400
    primaryDark: '#0369a1', // Sky 700
    text: '#0f172a',
    background: '#ffffff',
    backgroundElement: '#f1f5f9',
    backgroundSelected: '#e2e8f0',
    textSecondary: '#64748b',
    border: '#e2e8f0',
  },
  dark: {
    primary: '#0284c7', // Electric Cyan / Sky 600
    primaryLight: '#38bdf8', // Sky 400
    primaryDark: '#0369a1', // Sky 700
    text: '#f8fafc',
    background: '#0f172a',
    backgroundElement: '#1e293b',
    backgroundSelected: '#334155',
    textSecondary: '#94a3b8',
    border: '#334155',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
