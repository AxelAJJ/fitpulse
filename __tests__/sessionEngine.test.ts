import {
  buildRecord,
  dominantActivity,
  elapsedMs,
  initialSessionState,
  sessionReducer,
  type SessionAction,
  type SessionState,
} from '@/services/sessionEngine';

function apply(actions: SessionAction[], from: SessionState = initialSessionState): SessionState {
  return actions.reduce(sessionReducer, from);
}

describe('sessionReducer', () => {
  it('inicia una sesión desde idle', () => {
    const s = apply([{ type: 'START', now: 1000, source: 'pedometer' }]);
    expect(s.status).toBe('running');
    expect(s.source).toBe('pedometer');
    expect(s.startedAt).toBe(1000);
  });

  it('ignora START si ya hay una sesión', () => {
    const running = apply([{ type: 'START', now: 1000, source: 'pedometer' }]);
    const again = sessionReducer(running, { type: 'START', now: 5000, source: 'accelerometer' });
    expect(again).toBe(running);
  });

  it('acumula pasos y distancia mientras corre', () => {
    const s = apply([
      { type: 'START', now: 0, source: 'pedometer' },
      { type: 'STEPS', steps: 10, distanceM: 7 },
      { type: 'STEPS', steps: 5, distanceM: 3.5 },
    ]);
    expect(s.steps).toBe(15);
    expect(s.distanceM).toBeCloseTo(10.5);
  });

  it('pausar y reanudar NO reinicia pasos, distancia ni tiempo', () => {
    let s = apply([
      { type: 'START', now: 0, source: 'pedometer' },
      { type: 'STEPS', steps: 100, distanceM: 70 },
      { type: 'PAUSE', now: 60_000 },
    ]);
    expect(s.status).toBe('paused');
    expect(s.steps).toBe(100);
    expect(elapsedMs(s, 60_000)).toBe(60_000);

    // Mucho tiempo en pausa: el cronómetro no avanza.
    expect(elapsedMs(s, 600_000)).toBe(60_000);

    s = apply([{ type: 'RESUME', now: 600_000 }], s);
    expect(s.status).toBe('running');
    expect(s.steps).toBe(100);
    expect(s.distanceM).toBeCloseTo(70);
    expect(elapsedMs(s, 630_000)).toBe(90_000);
  });

  it('no suma pasos ni distancia durante la pausa (callbacks tardíos)', () => {
    let s = apply([
      { type: 'START', now: 0, source: 'pedometer' },
      { type: 'STEPS', steps: 20, distanceM: 14 },
      { type: 'PAUSE', now: 10_000 },
    ]);
    s = sessionReducer(s, { type: 'STEPS', steps: 50, distanceM: 35 });
    s = sessionReducer(s, { type: 'ACTIVITY', activity: 'running', intensity: 1, cadence: 170, dtMs: 500 });
    expect(s.steps).toBe(20);
    expect(s.distanceM).toBeCloseTo(14);
    expect(s.activityMs.running).toBe(0);
  });

  it('PAUSE y RESUME fuera de estado son no-ops', () => {
    expect(sessionReducer(initialSessionState, { type: 'PAUSE', now: 1 })).toBe(initialSessionState);
    expect(sessionReducer(initialSessionState, { type: 'RESUME', now: 1 })).toBe(initialSessionState);
  });

  it('acumula tiempo por actividad y limita saltos de dt', () => {
    const s = apply([
      { type: 'START', now: 0, source: 'pedometer' },
      { type: 'ACTIVITY', activity: 'walking', intensity: 0.3, cadence: 110, dtMs: 500 },
      { type: 'ACTIVITY', activity: 'walking', intensity: 0.3, cadence: 110, dtMs: 500 },
      { type: 'ACTIVITY', activity: 'running', intensity: 0.8, cadence: 170, dtMs: 60_000 },
    ]);
    expect(s.activityMs.walking).toBe(1000);
    expect(s.activityMs.running).toBe(2000);
    expect(s.activity).toBe('running');
  });

  it('RESET vuelve al estado inicial', () => {
    const s = apply([
      { type: 'START', now: 0, source: 'pedometer' },
      { type: 'STEPS', steps: 10, distanceM: 7 },
      { type: 'RESET' },
    ]);
    expect(s).toEqual(initialSessionState);
  });
});

describe('dominantActivity y buildRecord', () => {
  it('elige la más frecuente entre caminar y correr', () => {
    expect(dominantActivity({ resting: 99999, walking: 1000, running: 500 })).toBe('walking');
    expect(dominantActivity({ resting: 0, walking: 1000, running: 5000 })).toBe('running');
    expect(dominantActivity({ resting: 5000, walking: 0, running: 0 })).toBe('resting');
  });

  it('construye el registro final con la duración activa', () => {
    const s = apply([
      { type: 'START', now: 1000, source: 'accelerometer' },
      { type: 'STEPS', steps: 42, distanceM: 30 },
      { type: 'ACTIVITY', activity: 'walking', intensity: 0.4, cadence: 100, dtMs: 500 },
      { type: 'PAUSE', now: 31_000 },
    ]);
    const record = buildRecord(s, 999_000, 'abc');
    expect(record).toEqual({
      id: 'abc',
      startedAt: 1000,
      endedAt: 999_000,
      durationSec: 30,
      steps: 42,
      distanceM: 30,
      dominantActivity: 'walking',
      stepSource: 'accelerometer',
    });
  });
});
