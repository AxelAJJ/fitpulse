import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

interface Props {
  /** Valor de 0 a 1. */
  value: number;
  segments?: number;
  color?: string;
}

/** Barra segmentada que indica la intensidad del movimiento. */
export function IntensityMeter({ value, segments = 14, color = colors.accent }: Props) {
  const clamped = Math.min(1, Math.max(0, value));
  const filled = Math.round(clamped * segments);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Intensidad del movimiento"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      {Array.from({ length: segments }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { height: 10 + (i / segments) * 18 },
            i < filled ? { backgroundColor: color } : styles.segmentOff,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 30 },
  segment: { flex: 1, borderRadius: 3 },
  segmentOff: { backgroundColor: colors.cardAlt },
});
