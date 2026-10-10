import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/constants/theme';

interface Props {
  label: string;
  value: string;
  unit?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Tamaño de la cifra. `hero` se ajusta automáticamente al ancho disponible. */
  size?: 'normal' | 'hero';
  style?: StyleProp<ViewStyle>;
}

export function StatCard({ label, value, unit, icon, size = 'normal', style }: Props) {
  const hero = size === 'hero';
  return (
    <View
      style={[styles.card, style]}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
    >
      <View style={styles.header}>
        {icon ? <Ionicons name={icon} size={16} color={colors.accent} /> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text
          style={[styles.value, hero ? styles.valueHero : styles.valueNormal]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {value}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs + 2, marginTop: spacing.sm },
  value: { color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'], flexShrink: 1 },
  valueNormal: { fontSize: 32 },
  valueHero: { fontSize: 76, lineHeight: 84 },
  unit: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
});
