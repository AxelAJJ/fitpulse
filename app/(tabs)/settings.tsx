import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { colors, radius, spacing } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { MAX_HEIGHT_CM, MIN_HEIGHT_CM, stepLengthM } from '@/services/distance';
import type { DistanceUnit } from '@/types';

const UNIT_OPTIONS = [
  { value: 'km', label: 'Kilómetros' },
  { value: 'mi', label: 'Millas' },
] as const satisfies readonly { value: DistanceUnit; label: string }[];

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [heightText, setHeightText] = useState(String(settings.heightCm));

  useEffect(() => {
    setHeightText(String(settings.heightCm));
  }, [settings.heightCm]);

  const parsed = Number(heightText);
  const heightValid = Number.isInteger(parsed) && parsed >= MIN_HEIGHT_CM && parsed <= MAX_HEIGHT_CM;

  const onChangeHeight = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 3);
    setHeightText(digits);
    const value = Number(digits);
    if (Number.isInteger(value) && value >= MIN_HEIGHT_CM && value <= MAX_HEIGHT_CM) {
      updateSettings({ heightCm: value });
    }
  };

  const nudgeHeight = (delta: number) => {
    const next = Math.min(MAX_HEIGHT_CM, Math.max(MIN_HEIGHT_CM, settings.heightCm + delta));
    updateSettings({ heightCm: next });
  };

  const walkingStep = stepLengthM(settings.heightCm, 'walking', 0);
  const runningStep = stepLengthM(settings.heightCm, 'running', 0);

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Ajustes</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Altura</Text>
            <Text style={styles.cardHint}>
              Se usa para estimar la longitud de tu paso y, con ella, la distancia.
            </Text>
            <View style={styles.heightRow}>
              <StepperButton icon="remove" label="Disminuir altura" onPress={() => nudgeHeight(-1)} />
              <View style={styles.inputWrap}>
                <TextInput
                  value={heightText}
                  onChangeText={onChangeHeight}
                  onBlur={() => setHeightText(String(settings.heightCm))}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={[styles.input, !heightValid && styles.inputInvalid]}
                  accessibilityLabel="Altura en centímetros"
                  selectTextOnFocus
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
              <StepperButton icon="add" label="Aumentar altura" onPress={() => nudgeHeight(1)} />
            </View>
            {!heightValid ? (
              <Text style={styles.error}>
                Introduce una altura entre {MIN_HEIGHT_CM} y {MAX_HEIGHT_CM} cm.
              </Text>
            ) : (
              <Text style={styles.cardHint}>
                Paso estimado: {walkingStep.toFixed(2)} m caminando · {runningStep.toFixed(2)} m corriendo
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Unidades de distancia</Text>
            <SegmentedControl
              options={UNIT_OPTIONS}
              value={settings.distanceUnit}
              onChange={(distanceUnit) => updateSettings({ distanceUnit })}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>Mantener pantalla encendida</Text>
                <Text style={styles.cardHint}>
                  Durante una sesión en curso. Con la pantalla bloqueada iOS detiene el análisis de
                  actividad; los pasos del podómetro se recuperan al volver a la app.
                </Text>
              </View>
              <Switch
                value={settings.keepScreenAwake}
                onValueChange={(keepScreenAwake) => updateSettings({ keepScreenAwake })}
                trackColor={{ false: colors.cardAlt, true: colors.accent }}
                thumbColor={colors.text}
                accessibilityLabel="Mantener la pantalla encendida durante la sesión"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sobre la precisión</Text>
            <Text style={styles.cardHint}>
              • Los pasos vienen del podómetro de Apple (CMPedometer) cuando está disponible.{'\n'}•
              La distancia es estimada (pasos × longitud de paso) y no equivale a una medición GPS.{'\n'}•
              La detección de caminar o correr se basa en el acelerómetro: es una estimación y puede
              variar según el dispositivo, la posición del teléfono y tu forma de caminar.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function StepperButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed]}
    >
      <Ionicons name={icon} size={24} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cardHint: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 13 },
  heightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepper: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPressed: { opacity: 0.7 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  input: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 90,
    fontVariant: ['tabular-nums'],
  },
  inputInvalid: { color: colors.danger },
  inputUnit: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
