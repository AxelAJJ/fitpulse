import React, { useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SessionListItem } from '@/components/SessionListItem';
import { colors, radius, spacing } from '@/constants/theme';
import { useSession } from '@/context/SessionContext';
import { useSettings } from '@/context/SettingsContext';
import type { SessionRecord } from '@/types';
import { formatDistance, formatDuration, formatSteps } from '@/utils/format';

export default function HistoryScreen() {
  const { history, removeSession, clearHistory } = useSession();
  const { settings } = useSettings();

  const totals = useMemo(() => {
    let steps = 0;
    let distanceM = 0;
    let durationSec = 0;
    for (const s of history) {
      steps += s.steps;
      distanceM += s.distanceM;
      durationSec += s.durationSec;
    }
    return { steps, distanceM, durationSec };
  }, [history]);

  const confirmDelete = (session: SessionRecord) => {
    Alert.alert('Borrar sesión', '¿Quieres eliminar esta sesión del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => void removeSession(session.id) },
    ]);
  };

  const confirmClear = () => {
    Alert.alert('Borrar historial', 'Se eliminarán todas las sesiones guardadas. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar todo', style: 'destructive', onPress: () => void clearHistory() },
    ]);
  };

  const totalDistance = formatDistance(totals.distanceM, settings.distanceUnit);

  return (
    <ScreenContainer>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionListItem session={item} unit={settings.distanceUnit} onDelete={confirmDelete} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Historial</Text>
              {history.length > 0 ? (
                <Pressable onPress={confirmClear} accessibilityRole="button" hitSlop={10}>
                  <Text style={styles.clear}>Borrar todo</Text>
                </Pressable>
              ) : null}
            </View>
            {history.length > 0 ? (
              <View style={styles.summary}>
                <Summary label="Sesiones" value={String(history.length)} />
                <Summary label="Pasos" value={formatSteps(totals.steps)} />
                <Summary label="Distancia" value={`${totalDistance.value} ${settings.distanceUnit}`} />
                <Summary label="Tiempo" value={formatDuration(totals.durationSec)} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="Aún no hay sesiones"
            message="Cuando finalices y guardes una sesión aparecerá aquí con sus pasos, distancia y duración."
          />
        }
      />
    </ScreenContainer>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl },
  separator: { height: spacing.md },
  headerBlock: { gap: spacing.md, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  clear: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  summary: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  summaryItem: { flex: 1 },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryValue: { color: colors.accent, fontSize: 16, fontWeight: '800', marginTop: 4 },
});
