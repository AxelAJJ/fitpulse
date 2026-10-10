import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SETTINGS,
  MAX_SESSIONS,
  clearSessions,
  deleteSession,
  isSessionRecord,
  loadSessions,
  loadSettings,
  sanitizeSettings,
  saveSession,
  saveSettings,
} from '@/services/storage';
import type { SessionRecord } from '@/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function record(id: string, startedAt: number, overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id,
    startedAt,
    endedAt: startedAt + 60_000,
    durationSec: 60,
    steps: 100,
    distanceM: 70,
    dominantActivity: 'walking',
    stepSource: 'pedometer',
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('historial de sesiones', () => {
  it('guarda y recupera una sesión', async () => {
    await saveSession(record('a', 1000));
    expect(await loadSessions()).toEqual([record('a', 1000)]);
  });

  it('ordena de más reciente a más antigua', async () => {
    await saveSession(record('a', 1000));
    await saveSession(record('b', 3000));
    await saveSession(record('c', 2000));
    expect((await loadSessions()).map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('dos guardados simultáneos no se pisan', async () => {
    await Promise.all([saveSession(record('a', 1000)), saveSession(record('b', 2000))]);
    expect((await loadSessions()).map((s) => s.id).sort()).toEqual(['a', 'b']);
  });

  it('borra una sesión y limpia todo el historial', async () => {
    await saveSession(record('a', 1000));
    await saveSession(record('b', 2000));
    const after = await deleteSession('a');
    expect(after.map((s) => s.id)).toEqual(['b']);
    await clearSessions();
    expect(await loadSessions()).toEqual([]);
  });

  it('descarta registros corruptos y tolera JSON inválido', async () => {
    await AsyncStorage.setItem(
      '@fitpulse/sessions/v1',
      JSON.stringify([record('ok', 1), { id: 'mal', steps: 'x' }, null]),
    );
    expect((await loadSessions()).map((s) => s.id)).toEqual(['ok']);

    await AsyncStorage.setItem('@fitpulse/sessions/v1', '{no es json');
    expect(await loadSessions()).toEqual([]);
  });

  it('limita el tamaño del historial', async () => {
    const many = Array.from({ length: MAX_SESSIONS + 5 }, (_, i) => record(`s${i}`, i));
    await AsyncStorage.setItem('@fitpulse/sessions/v1', JSON.stringify(many));
    const result = await saveSession(record('nueva', 10_000_000));
    expect(result).toHaveLength(MAX_SESSIONS);
    expect(result[0].id).toBe('nueva');
  });

  it('valida la forma de un registro', () => {
    expect(isSessionRecord(record('a', 1))).toBe(true);
    expect(isSessionRecord({ ...record('a', 1), dominantActivity: 'volando' })).toBe(false);
    expect(isSessionRecord({ ...record('a', 1), steps: Number.NaN })).toBe(false);
    expect(isSessionRecord(undefined)).toBe(false);
  });
});

describe('ajustes', () => {
  it('devuelve valores por defecto si no hay nada guardado', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('guarda y recupera ajustes', async () => {
    await saveSettings({ heightCm: 182, distanceUnit: 'mi', keepScreenAwake: false });
    expect(await loadSettings()).toEqual({ heightCm: 182, distanceUnit: 'mi', keepScreenAwake: false });
  });

  it('sanea valores inválidos', () => {
    expect(sanitizeSettings({ heightCm: 9999, distanceUnit: 'parsecs', keepScreenAwake: 'si' })).toEqual({
      heightCm: 230,
      distanceUnit: 'km',
      keepScreenAwake: true,
    });
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ heightCm: 50 }).heightCm).toBe(100);
  });
});
