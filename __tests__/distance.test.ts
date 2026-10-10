import { CadenceTracker } from '@/services/cadence';
import {
  distanceForSteps,
  metersToKm,
  metersToMiles,
  stepLengthM,
} from '@/services/distance';
import { formatDistance, formatDuration } from '@/utils/format';

describe('stepLengthM', () => {
  it('caminando sin cadencia usa 0.413 × altura', () => {
    expect(stepLengthM(170, 'walking', 0)).toBeCloseTo(0.7021, 3);
  });

  it('el paso crece con la cadencia, dentro de límites', () => {
    const slow = stepLengthM(170, 'walking', 90);
    const fast = stepLengthM(170, 'walking', 125);
    expect(fast).toBeGreaterThan(slow);
    expect(stepLengthM(170, 'walking', 300)).toBeCloseTo(0.85, 5); // tope 0.5 × 1.70
    expect(stepLengthM(170, 'walking', 10)).toBeCloseTo(0.595, 3); // piso 0.35 × 1.70
  });

  it('correr da pasos más largos que caminar', () => {
    expect(stepLengthM(170, 'running', 170)).toBeGreaterThan(stepLengthM(170, 'walking', 110));
  });

  it('una persona más alta da pasos más largos', () => {
    expect(stepLengthM(190, 'walking', 110)).toBeGreaterThan(stepLengthM(160, 'walking', 110));
  });

  it('limita alturas absurdas', () => {
    expect(stepLengthM(5000, 'walking', 0)).toBeCloseTo(2.3 * 0.413, 3);
    expect(stepLengthM(-10, 'walking', 0)).toBeCloseTo(1.0 * 0.413, 3);
  });
});

describe('distanceForSteps', () => {
  it('es pasos × longitud del paso', () => {
    const step = stepLengthM(170, 'walking', 0);
    expect(distanceForSteps(1000, 170, 'walking', 0)).toBeCloseTo(1000 * step, 6);
  });

  it('ignora pasos no válidos', () => {
    expect(distanceForSteps(0, 170, 'walking', 0)).toBe(0);
    expect(distanceForSteps(-5, 170, 'walking', 0)).toBe(0);
    expect(distanceForSteps(Number.NaN, 170, 'walking', 0)).toBe(0);
  });
});

describe('conversiones y formato', () => {
  it('convierte metros a km y millas', () => {
    expect(metersToKm(2500)).toBe(2.5);
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 6);
  });

  it('formatea distancia con 2 decimales', () => {
    expect(formatDistance(1234, 'km')).toEqual({ value: '1.23', unit: 'km' });
    expect(formatDistance(1609.344, 'mi')).toEqual({ value: '1.00', unit: 'mi' });
    expect(formatDistance(-5, 'km').value).toBe('0.00');
  });

  it('formatea la duración', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(-3)).toBe('00:00');
  });
});

describe('CadenceTracker', () => {
  it('estima ~120 pasos/min con 2 pasos por segundo', () => {
    const tracker = new CadenceTracker();
    tracker.addSample(0, 0);
    for (let s = 1; s <= 20; s += 1) tracker.addSample(s * 1000, s * 2);
    expect(tracker.cadenceAt(20000)).toBeCloseTo(120, 0);
  });

  it('devuelve 0 con muy pocos datos', () => {
    const tracker = new CadenceTracker();
    tracker.addSample(0, 0);
    tracker.addSample(1000, 2);
    expect(tracker.cadenceAt(1000)).toBe(0);
  });

  it('decae a 0 cuando dejan de llegar pasos', () => {
    const tracker = new CadenceTracker();
    tracker.addSample(0, 0);
    for (let s = 1; s <= 10; s += 1) tracker.addSample(s * 1000, s * 2);
    expect(tracker.cadenceAt(10000)).toBeGreaterThan(100);
    expect(tracker.cadenceAt(40000)).toBe(0);
  });

  it('reset() limpia las muestras', () => {
    const tracker = new CadenceTracker();
    tracker.addSample(0, 0);
    tracker.addSample(5000, 10);
    tracker.reset();
    expect(tracker.cadenceAt(6000)).toBe(0);
  });
});
