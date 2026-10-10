import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityBadge } from '@/components/ActivityBadge';
import { IntensityMeter } from '@/components/IntensityMeter';
import { NoticeBanner } from '@/components/NoticeBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PulseDot } from '@/components/PulseDot';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatCard } from '@/components/StatCard';
import { activityColors, colors, radius, spacing } from '@/constants/theme';
import { useSession } from '@/context/SessionContext';
import { useSettings } from '@/context/SettingsContext';
import { useNow } from '@/hooks/useNow';
import { describeUnsupported } from '@/services/sensors';
import { elapsedMs } from '@/services/sessionEngine';
import { formatDistance, formatDuration, formatSteps } from '@/utils/format';

export default function TodayScreen() {
  const {
    state,
    support,
    notice,
    starting,
    start,
    pause,
    resume,
    finish,
    dismissNotice,
    openSystemSettings,
  } = useSession();
  const { settings } = useSettings();

  const running = state.status === 'running';
  const idle = state.status === 'idle';
  const now = useNow(running, 500);
  const elapsedSec = elapsedMs(state, now) / 1000;
  const distance = formatDistance(state.distanceM, settings.distanceUnit);

  const unsupported = support.checked && !support.pedometer && !support.accelerometer;
  const visibleNotice = unsupported ? describeUnsupported() : notice;

  const statusText = running ? 'Sesión en curso' : idle ? 'Lista para empezar' : 'Sesión en pausa';
  const primaryTitle = idle ? 'Iniciar sesión' : running ? 'Pausar' : 'Reanudar';
  const primaryIcon = idle || state.status === 'paused' ? 'play' : 'pause';

  const onPrimary = () => {
    if (idle) void start();
    else if (running) pause();
    else resume();
  };

  const confirmFinish = () => {
    Alert.alert(
      'Finalizar sesión',
      `${formatSteps(state.steps)} pasos · ${distance.value} ${distance.unit} · ${formatDuration(elapsedSec)}`,
      [
        { text: 'Seguir', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => void finish(false) },
        { text: 'Guardar', onPress: () => void finish(true) },
      ],
    );
  };

  const sourceCaption =
    state.source === 'pedometer'
      ? 'Pasos del podómetro de Apple'
      : state.source === 'accelerometer'
        ? 'Pasos estimados con el acelerómetro'
        : 'Pulsa iniciar para empezar a contar';

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>FitPulse</Text>
            <Text style={styles.subtitle}>{statusText}</Text>
          </View>
          <PulseDot active={running} />
        </View>

        {visibleNotice ? (
          <NoticeBanner
            notice={visibleNotice}
            onDismiss={unsupported ? undefined : dismissNotice}
            onAction={openSystemSettings}
          />
        ) : null}

        <StatCard label="Pasos" value={formatSteps(state.steps)} icon="footsteps" size="hero" />
        <Text style={styles.caption}>{sourceCaption}</Text>

        <View style={styles.row}>
          <StatCard
            label="Distancia"
            value={distance.value}
            unit={distance.unit}
            icon="navigate"
            style={styles.flex}
          />
          <StatCard
            label="Tiempo"
            value={formatDuration(elapsedSec)}
            icon="timer-outline"
            style={styles.flex}
          />
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityTop}>
            <ActivityBadge activity={state.activity} live={running} idleLabel={idle ? 'Sin sesión' : 'En pausa'} />
            <View style={styles.cadenceBox}>
              <Text style={styles.cadenceValue}>{running && state.cadence > 0 ? state.cadence : '—'}</Text>
              <Text style={styles.cadenceUnit}>pasos/min</Text>
            </View>
          </View>
          <IntensityMeter
            value={running ? state.intensity : 0}
            color={activityColors[state.activity]}
          />
          <Text style={styles.hint}>
            Intensidad del movimiento. La actividad es una estimación y puede variar según el teléfono y
            cómo lo lleves.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={primaryTitle}
          icon={primaryIcon}
          onPress={onPrimary}
          loading={starting}
          disabled={idle && unsupported}
        />
        {!idle ? (
          <PrimaryButton
            title="Finalizar y guardar"
            icon="stop"
            variant="secondary"
            onPress={confirmFinish}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  caption: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: -spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  activityCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  activityTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cadenceBox: { alignItems: 'flex-end' },
  cadenceValue: { color: colors.text, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cadenceUnit: { color: colors.textMuted, fontSize: 12 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  footer: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.md },
});
