import React from 'react';
import { View, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'gold';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'info', size = 'sm', style }: BadgeProps) {
  const getVariantStyles = (): { bg: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'success':
        return {
          bg: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
          text: { color: '#4ade80' },
        };
      case 'warning':
        return {
          bg: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
          text: { color: '#fbbf24' },
        };
      case 'danger':
        return {
          bg: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
          text: { color: '#f87171' },
        };
      case 'gold':
        return {
          bg: { backgroundColor: 'rgba(234, 179, 8, 0.15)' },
          text: { color: '#facc15' },
        };
      case 'neutral':
        return {
          bg: { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
          text: { color: '#94a3b8' },
        };
      case 'info':
      default:
        return {
          bg: { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
          text: { color: '#38bdf8' },
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <View
      style={[
        styles.badge,
        vStyles.bg,
        size === 'md' && styles.badgeMd,
        style,
      ]}
    >
      <Text style={[styles.badgeText, vStyles.text, size === 'md' && styles.badgeTextMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  badgeTextMd: {
    fontSize: 13,
  },
});
