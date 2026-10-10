import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ActivityKind } from '@/types';
import { activityColors, colors, radius, spacing } from '@/constants/theme';
import { ACTIVITY_LABELS } from '@/utils/format';

export const ACTIVITY_ICONS: Record<
  ActivityKind,
  React.ComponentProps<typeof MaterialCommunityIcons>['name']
> = {
  resting: 'human-handsdown',
  walking: 'walk',
  running: 'run',
};

interface Props {
  activity: ActivityKind;
  /** Si es false (sesión inactiva o en pausa) se muestra atenuado. */
  live: boolean;
  /** Texto alternativo cuando no hay actividad en vivo. */
  idleLabel?: string;
}

export function ActivityBadge({ activity, live, idleLabel }: Props) {
  const tint = live ? activityColors[activity] : colors.textMuted;
  const label = live ? ACTIVITY_LABELS[activity] : (idleLabel ?? '—');
  return (
    <View style={styles.row} accessible accessibilityLabel={`Actividad: ${label}`}>
      <View style={[styles.iconWrap, { borderColor: tint }]}>
        <MaterialCommunityIcons name={ACTIVITY_ICONS[activity]} size={28} color={tint} />
      </View>
      <View>
        <Text style={styles.caption}>ACTIVIDAD</Text>
        <Text style={[styles.label, { color: live ? colors.text : colors.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardAlt,
  },
  caption: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  label: { fontSize: 22, fontWeight: '700', marginTop: 2 },
});
