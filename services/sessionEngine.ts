import type { ActivityKind, SessionRecord, SessionStatus, StepSource } from '@/types';

/**
 * Lógica pura de la sesión (sin React ni sensores): fácil de probar.
 * Garantías:
 *  - Pausar y reanudar NO reinician pasos, distancia ni tiempo.
 *  - Los pasos y la actividad solo se acumulan mientras el estado es `running`.
 *  - El cronómetro solo suma los tramos en los que la sesión estuvo corriendo.
 */
export interface SessionState {
  status: SessionStatus;
  source: StepSource | null;
  startedAt: number | null;
  /** Inicio del tramo actual en ejecución (null si está en pausa o inactiva). */
  segmentStartedAt: number | null;
  /** Tiempo acumulado de los tramos ya cerrados (ms). */
  accumulatedMs: number;
  steps: number;
  distanceM: number;
  /** Datos "en vivo" para la interfaz. */
  activity: ActivityKind;
  intensity: number;
  cadence: number;
  /** Tiempo (ms) pasado en cada actividad, para calcular la predominante. */
  activityMs: Record<ActivityKind, number>;
}

export type SessionAction =
  | { type: 'START'; now: number; source: StepSource }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'STEPS'; steps: number; distanceM: number }
  | { type: 'ACTIVITY'; activity: ActivityKind; intensity: number; cadence: number; dtMs: number }
  | { type: 'RESET' };

export const initialSessionState: SessionState = {
  status: 'idle',
  source: null,
  startedAt: null,
  segmentStartedAt: null,
  accumulatedMs: 0,
  steps: 0,
  distanceM: 0,
  activity: 'resting',
  intensity: 0,
  cadence: 0,
  activityMs: { resting: 0, walking: 0, running: 0 },
};

/** Máximo de ms que se acredita a una actividad por evaluación (evita saltos si el JS se pausó). */
const MAX_ACTIVITY_DT_MS = 2000;

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START':
      if (state.status !== 'idle') return state;
      return {
        ...initialSessionState,
        status: 'running',
        source: action.source,
        startedAt: action.now,
        segmentStartedAt: action.now,
        activityMs: { resting: 0, walking: 0, running: 0 },
      };

    case 'PAUSE':
      if (state.status !== 'running' || state.segmentStartedAt === null) return state;
      return {
        ...state,
        status: 'paused',
        accumulatedMs: state.accumulatedMs + Math.max(0, action.now - state.segmentStartedAt),
        segmentStartedAt: null,
        activity: 'resting',
        intensity: 0,
        cadence: 0,
      };

    case 'RESUME':
      if (state.status !== 'paused') return state;
      return { ...state, status: 'running', segmentStartedAt: action.now };

    case 'STEPS':
      if (state.status !== 'running') return state;
      return {
        ...state,
        steps: state.steps + Math.max(0, Math.floor(action.steps)),
        distanceM: state.distanceM + Math.max(0, action.distanceM),
      };

    case 'ACTIVITY': {
      if (state.status !== 'running') return state;
      const dt = Math.min(MAX_ACTIVITY_DT_MS, Math.max(0, action.dtMs));
      return {
        ...state,
        activity: action.activity,
        intensity: action.intensity,
        cadence: action.cadence,
        activityMs: {
          ...state.activityMs,
          [action.activity]: state.activityMs[action.activity] + dt,
        },
      };
    }

    case 'RESET':
      return {
        ...initialSessionState,
        activityMs: { resting: 0, walking: 0, running: 0 },
      };

    default:
      return state;
  }
}

/** Tiempo activo de la sesión en ms. No cuenta los periodos en pausa. */
export function elapsedMs(state: SessionState, now: number): number {
  if (state.status === 'running' && state.segmentStartedAt !== null) {
    return state.accumulatedMs + Math.max(0, now - state.segmentStartedAt);
  }
  return state.accumulatedMs;
}

/**
 * Actividad predominante: la más frecuente entre caminar y correr. Si no hubo movimiento
 * clasificado, se devuelve `resting`.
 */
export function dominantActivity(activityMs: Record<ActivityKind, number>): ActivityKind {
  if (activityMs.walking <= 0 && activityMs.running <= 0) return 'resting';
  return activityMs.running > activityMs.walking ? 'running' : 'walking';
}

export function buildRecord(state: SessionState, now: number, id: string): SessionRecord {
  const startedAt = state.startedAt ?? now;
  return {
    id,
    startedAt,
    endedAt: now,
    durationSec: Math.round(elapsedMs(state, now) / 1000),
    steps: state.steps,
    distanceM: state.distanceM,
    dominantActivity: dominantActivity(state.activityMs),
    stepSource: state.source ?? 'pedometer',
  };
}
