import type { ActivityKind } from '@/types';

export const colors = {
  background: '#0B0D0F',
  card: '#15191D',
  cardAlt: '#1C2127',
  border: '#262C33',
  text: '#F2F5F7',
  textMuted: '#8B96A1',
  accent: '#B6F23C',
  accentText: '#0B0D0F',
  warning: '#FFB84D',
  danger: '#FF6B6B',
  info: '#5CC8FF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { md: 16, lg: 24, pill: 999 } as const;

export const activityColors: Record<ActivityKind, string> = {
  resting: colors.textMuted,
  walking: colors.accent,
  running: '#FF8A3D',
};
