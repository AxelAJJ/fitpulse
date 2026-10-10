import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { DistanceUnit, SessionRecord } from '@/types';
import { activityColors, colors, radius, spacing } from '@/constants/theme';
import {
  ACTIVITY_LABELS,
  formatDistance,
  formatDuration,
  formatSessionDate,
  formatSteps,
} from '@/utils/format';
import { ACTIVITY_ICONS } from '@/components/ActivityBadge';

interface Props {
  session: SessionRecord;
  unit: DistanceUnit;
  onDelete: (session: SessionRecord) => void;
}

export function SessionListItem({ session, unit, onDelete }: Props) {
  const distance = formatDistance(session.distanceM, unit);
  const tint = activityColors[session.dominantActivity];
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${formatSessionDate(session.startedAt)}. ${formatSteps(session.steps)} pasos, ${distance.value} ${unit}, ${formatDuration(session.durationSec)}. ${ACTIVITY_LABELS[session.dominantActivity]}`}
    >
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { borderColor: tint }]}>
            <MaterialCommunityIcons
              name={ACTIVITY_ICONS[session.dominantActivity]}
              size={22}
              color={tint}
            />
          </View>
          <View>
            <Text style={styles.date}>{formatSessionDate(session.startedAt)}</Text>
            <Text style={styles.activity}>{ACTIVITY_LABELS[session.dominantActivity]}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => onDelete(session)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Borrar sesión"
        >
          <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.metrics}>
        <Metric label="Pasos" value={formatSteps(session.steps)} />
        <Metric label="Distancia" value={`${distance.value} ${unit}`} />
        <Metric label="Duración" value={formatDuration(session.durationSec)} />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
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
    gap: spacing.lg,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardAlt,
  },
  date: { color: colors.text, fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  activity: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  metrics: { flexDirection: 'row', gap: spacing.md },
  metric: { flex: 1 },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
