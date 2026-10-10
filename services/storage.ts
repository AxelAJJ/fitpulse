import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityKind, DistanceUnit, SessionRecord, Settings, StepSource } from '@/types';
import { DEFAULT_HEIGHT_CM, MAX_HEIGHT_CM, MIN_HEIGHT_CM } from './distance';

const SESSIONS_KEY = '@fitpulse/sessions/v1';
const SETTINGS_KEY = '@fitpulse/settings/v1';
export const MAX_SESSIONS = 500;

export const DEFAULT_SETTINGS: Settings = {
  heightCm: DEFAULT_HEIGHT_CM,
  distanceUnit: 'km',
  keepScreenAwake: true,
};

const ACTIVITIES: readonly ActivityKind[] = ['resting', 'walking', 'running'];
const SOURCES: readonly StepSource[] = ['pedometer', 'accelerometer'];
const UNITS: readonly DistanceUnit[] = ['km', 'mi'];

/** Serializa las escrituras para que dos guardados seguidos no se pisen (leer-modificar-escribir). */
let writeQueue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);
  return next;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isSessionRecord(value: unknown): value is SessionRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    isFiniteNumber(v.startedAt) &&
    isFiniteNumber(v.endedAt) &&
    isFiniteNumber(v.durationSec) &&
    isFiniteNumber(v.steps) &&
    isFiniteNumber(v.distanceM) &&
    ACTIVITIES.includes(v.dominantActivity as ActivityKind) &&
    SOURCES.includes(v.stepSource as StepSource)
  );
}

export function sanitizeSettings(raw: unknown): Settings {
  const v = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const height = isFiniteNumber(v.heightCm) ? Math.round(v.heightCm) : DEFAULT_SETTINGS.heightCm;
  return {
    heightCm: Math.min(MAX_HEIGHT_CM, Math.max(MIN_HEIGHT_CM, height)),
    distanceUnit: UNITS.includes(v.distanceUnit as DistanceUnit)
      ? (v.distanceUnit as DistanceUnit)
      : DEFAULT_SETTINGS.distanceUnit,
    keepScreenAwake:
      typeof v.keepScreenAwake === 'boolean' ? v.keepScreenAwake : DEFAULT_SETTINGS.keepScreenAwake,
  };
}

async function readSessions(): Promise<SessionRecord[]> {
  const json = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!json) return [];
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isSessionRecord);
}

function sortNewestFirst(sessions: SessionRecord[]): SessionRecord[] {
  return [...sessions].sort((a, b) => b.startedAt - a.startedAt);
}

/** Lee el historial. Si los datos están corruptos o hay un error, devuelve una lista vacía. */
export async function loadSessions(): Promise<SessionRecord[]> {
  try {
    return sortNewestFirst(await readSessions());
  } catch {
    return [];
  }
}

/** Guarda una sesión y devuelve el historial actualizado (más reciente primero). Lanza si falla. */
export function saveSession(record: SessionRecord): Promise<SessionRecord[]> {
  return enqueue(async () => {
    let current: SessionRecord[] = [];
    try {
      current = await readSessions();
    } catch {
      current = [];
    }
    const next = sortNewestFirst([record, ...current.filter((s) => s.id !== record.id)]).slice(
      0,
      MAX_SESSIONS,
    );
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
    return next;
  });
}

export function deleteSession(id: string): Promise<SessionRecord[]> {
  return enqueue(async () => {
    let current: SessionRecord[] = [];
    try {
      current = await readSessions();
    } catch {
      current = [];
    }
    const next = sortNewestFirst(current.filter((s) => s.id !== id));
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
    return next;
  });
}

export function clearSessions(): Promise<void> {
  return enqueue(async () => {
    await AsyncStorage.removeItem(SESSIONS_KEY);
  });
}

export async function loadSettings(): Promise<Settings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(json));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): Promise<void> {
  return enqueue(async () => {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitizeSettings(settings)));
  });
}
