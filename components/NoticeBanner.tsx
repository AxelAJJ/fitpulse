import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppNotice } from '@/types';
import { colors, radius, spacing } from '@/constants/theme';

interface Props {
  notice: AppNotice;
  onDismiss?: () => void;
  onAction?: () => void;
}

const TINTS: Record<AppNotice['level'], string> = {
  info: colors.info,
  warning: colors.warning,
  error: colors.danger,
};

const ICONS: Record<AppNotice['level'], React.ComponentProps<typeof Ionicons>['name']> = {
  info: 'information-circle',
  warning: 'warning',
  error: 'alert-circle',
};

export function NoticeBanner({ notice, onDismiss, onAction }: Props) {
  const tint = TINTS[notice.level];
  return (
    <View style={[styles.box, { borderColor: tint }]} accessibilityRole="alert">
      <Ionicons name={ICONS[notice.level]} size={20} color={tint} style={styles.icon} />
      <View style={styles.body}>
        <Text style={styles.message}>{notice.message}</Text>
        {notice.action === 'open-settings' && onAction ? (
          <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.action, { color: tint }]}>Abrir Ajustes de iOS</Text>
          </Pressable>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso"
          hitSlop={10}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.card,
  },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: spacing.xs },
  message: { color: colors.text, fontSize: 14, lineHeight: 20 },
  action: { fontSize: 14, fontWeight: '700' },
});
