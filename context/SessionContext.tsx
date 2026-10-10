import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AppState, Linking } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type {
  AccelSample,
  ActivityKind,
  AppNotice,
  SensorSupport,
  SessionRecord,
  SessionStatus,
  StepSource,
} from '@/types';
import { ActivityClassifier } from '@/services/activityClassifier';
import { CadenceTracker } from '@/services/cadence';
import { distanceForSteps } from '@/services/distance';
import {
  buildRecord,
  initialSessionState,
  sessionReducer,
  type SessionState,
} from '@/services/sessionEngine';
import {
  INITIAL_SUPPORT,
  chooseStepSource,
  describeFallback,
  describeUnsupported,
  detectSupport,
  ensureMotionPermission,
} from '@/services/sensors';
import { AccelerometerStepCounter } from '@/services/stepCounter';
import { clearSessions, deleteSession, loadSessions, saveSession } from '@/services/storage';
import { createSessionId } from '@/utils/format';
import { useAccelerometer } from '@/hooks/useAccelerometer';
import { usePedometerSteps } from '@/hooks/usePedometerSteps';
import { useSettings } from '@/context/SettingsContext';

const KEEP_AWAKE_TAG = 'fitpulse-session';

interface SessionContextValue {
  state: SessionState;
  history: SessionRecord[];
  support: SensorSupport;
  notice: AppNotice | null;
  starting: boolean;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  /** Finaliza la sesión. Con `save = true` la guarda en el historial. */
  finish: (save: boolean) => Promise<SessionRecord | null>;
  removeSession: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  dismissNotice: () => void;
  openSystemSettings: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [support, setSupport] = useState<SensorSupport>(INITIAL_SUPPORT);
  const [notice, setNotice] = useState<AppNotice | null>(null);
  const [starting, setStarting] = useState(false);

  // Motores de análisis: una sola instancia durante toda la vida de la app.
  const [classifier] = useState(() => new ActivityClassifier());
  const [stepCounter] = useState(() => new AccelerometerStepCounter());
  const [cadenceTracker] = useState(() => new CadenceTracker());

  // Refs síncronas: los callbacks de los sensores necesitan el valor más reciente sin re-suscribirse.
  const statusRef = useRef<SessionStatus>('idle');
  const sourceRef = useRef<StepSource | null>(null);
  const startingRef = useRef(false);
  const totalStepsRef = useRef(0);
  const liveActivityRef = useRef<ActivityKind>('resting');
  const heightRef = useRef(settings.heightCm);
  const wasBackgroundRef = useRef(false);
  const backgroundGapRef = useRef(false);

  useEffect(() => {
    heightRef.current = settings.heightCm;
  }, [settings.heightCm]);

  // --- Carga inicial: historial y compatibilidad de sensores -----------------------------------
  const refreshSupport = useCallback(async () => {
    try {
      setSupport(await detectSupport());
    } catch {
      setSupport({ ...INITIAL_SUPPORT, checked: true });
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadSessions().then((sessions) => {
      if (active) setHistory(sessions);
    });
    refreshSupport();
    return () => {
      active = false;
    };
  }, [refreshSupport]);

  // --- Pasos --------------------------------------------------------------------------------
  const handleSteps = useCallback(
    (delta: number) => {
      if (statusRef.current !== 'running' || delta <= 0) return;
      const now = Date.now();
      totalStepsRef.current += delta;

      let cadence = 0;
      if (backgroundGapRef.current) {
        // Tras volver de segundo plano llega un bloque grande de pasos acumulados:
        // no sirve para estimar la cadencia, así que se usa la longitud de paso promedio.
        backgroundGapRef.current = false;
        cadenceTracker.reset();
        cadenceTracker.addSample(now, totalStepsRef.current);
      } else {
        cadenceTracker.addSample(now, totalStepsRef.current);
        cadence = cadenceTracker.cadenceAt(now);
      }

      const distanceM = distanceForSteps(
        delta,
        heightRef.current,
        liveActivityRef.current,
        cadence,
      );
      dispatch({ type: 'STEPS', steps: delta, distanceM });
    },
    [cadenceTracker],
  );

  const handleSensorError = useCallback((error: unknown) => {
    const detail = error instanceof Error ? ` (${error.message})` : '';
    setNotice({
      level: 'error',
      message: `No se pudo acceder a un sensor de movimiento${detail}. Revisa los permisos e inténtalo de nuevo.`,
      action: 'open-settings',
    });
  }, []);

  // --- Acelerómetro: clasificación (y pasos solo si es la fuente de respaldo) ----------------
  const handleSample = useCallback(
    (sample: AccelSample) => {
      if (statusRef.current !== 'running') return;

      if (sourceRef.current === 'accelerometer') {
        const step = stepCounter.addSample(sample);
        if (step > 0) handleSteps(step);
      }

      const result = classifier.addSample(sample);
      if (result) {
        liveActivityRef.current = result.activity;
        dispatch({
          type: 'ACTIVITY',
          activity: result.activity,
          intensity: result.intensity,
          cadence: result.cadence,
          dtMs: result.dtMs,
        });
      }
    },
    [classifier, stepCounter, handleSteps],
  );

  const running = state.status === 'running';

  // Podómetro nativo: solo cuando es la fuente elegida. Acelerómetro: siempre durante la sesión.
  usePedometerSteps(running && state.source === 'pedometer', handleSteps, handleSensorError);
  useAccelerometer(running, handleSample, handleSensorError);

  // --- Pantalla encendida durante la sesión (opcional) -----------------------------------------
  useEffect(() => {
    if (!running || !settings.keepScreenAwake) return undefined;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [running, settings.keepScreenAwake]);

  // --- Segundo plano / primer plano ------------------------------------------------------------
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        wasBackgroundRef.current = true;
        return;
      }
      if (next === 'active') {
        // El usuario pudo cambiar permisos en Ajustes de iOS.
        refreshSupport();
        if (wasBackgroundRef.current) {
          wasBackgroundRef.current = false;
          if (statusRef.current === 'running') {
            backgroundGapRef.current = true;
            classifier.reset();
            stepCounter.reset();
          }
        }
      }
    });
    return () => subscription.remove();
  }, [classifier, stepCounter, refreshSupport]);

  // --- Acciones ---------------------------------------------------------------------------------
  const resetEngines = useCallback(
    (now: number) => {
      classifier.reset();
      stepCounter.reset();
      cadenceTracker.reset();
      cadenceTracker.addSample(now, totalStepsRef.current);
      backgroundGapRef.current = false;
      liveActivityRef.current = 'resting';
    },
    [classifier, stepCounter, cadenceTracker],
  );

  const start = useCallback(async () => {
    if (statusRef.current !== 'idle' || startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    try {
      let current = await detectSupport();
      if (current.pedometer && current.permission !== 'granted') {
        // Momento adecuado para pedir el permiso: el usuario acaba de pulsar "Iniciar".
        const permission = await ensureMotionPermission();
        current = { ...current, permission };
      }
      setSupport(current);

      const source = chooseStepSource(current);
      if (source === null) {
        setNotice(describeUnsupported());
        return;
      }
      setNotice(source === 'accelerometer' ? describeFallback(current) : null);

      const now = Date.now();
      totalStepsRef.current = 0;
      sourceRef.current = source;
      resetEngines(now);
      statusRef.current = 'running';
      dispatch({ type: 'START', now, source });
    } catch (error) {
      handleSensorError(error);
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }, [handleSensorError, resetEngines]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return;
    statusRef.current = 'paused';
    dispatch({ type: 'PAUSE', now: Date.now() });
  }, []);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    const now = Date.now();
    resetEngines(now);
    statusRef.current = 'running';
    dispatch({ type: 'RESUME', now });
  }, [resetEngines]);

  const finish = useCallback(
    async (save: boolean): Promise<SessionRecord | null> => {
      if (state.status === 'idle') return null;
      const now = Date.now();
      // Se congela la sesión primero: los sensores se detienen y los valores dejan de cambiar.
      const record = buildRecord(state, now, createSessionId(now));
      if (statusRef.current === 'running') {
        statusRef.current = 'paused';
        dispatch({ type: 'PAUSE', now });
      }

      if (!save) {
        statusRef.current = 'idle';
        sourceRef.current = null;
        dispatch({ type: 'RESET' });
        setNotice(null);
        return null;
      }

      try {
        setHistory(await saveSession(record));
      } catch {
        // La sesión se conserva en pausa para poder reintentar el guardado.
        setNotice({
          level: 'error',
          message: 'No se pudo guardar la sesión en el historial. Inténtalo de nuevo.',
        });
        return null;
      }
      statusRef.current = 'idle';
      sourceRef.current = null;
      dispatch({ type: 'RESET' });
      setNotice({ level: 'info', message: 'Sesión guardada en el historial.' });
      return record;
    },
    [state],
  );

  const removeSession = useCallback(async (id: string) => {
    try {
      setHistory(await deleteSession(id));
    } catch {
      setNotice({ level: 'error', message: 'No se pudo borrar la sesión.' });
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await clearSessions();
      setHistory([]);
    } catch {
      setNotice({ level: 'error', message: 'No se pudo borrar el historial.' });
    }
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const openSystemSettings = useCallback(() => {
    Linking.openSettings().catch(() => undefined);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      history,
      support,
      notice,
      starting,
      start,
      pause,
      resume,
      finish,
      removeSession,
      clearHistory,
      dismissNotice,
      openSystemSettings,
    }),
    [
      state,
      history,
      support,
      notice,
      starting,
      start,
      pause,
      resume,
      finish,
      removeSession,
      clearHistory,
      dismissNotice,
      openSystemSettings,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}
