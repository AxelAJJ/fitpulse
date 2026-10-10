import { ActivityClassifier, type ClassifierOutput } from '@/services/activityClassifier';
import { AccelerometerStepCounter } from '@/services/stepCounter';
import type { AccelSample } from '@/types';
import { synthSamples } from './helpers';

function run(classifier: ActivityClassifier, samples: AccelSample[]): ClassifierOutput[] {
  const outputs: ClassifierOutput[] = [];
  for (const s of samples) {
    const out = classifier.addSample(s);
    if (out) outputs.push(out);
  }
  return outputs;
}

describe('ActivityClassifier', () => {
  it('clasifica reposo con ruido pequeño', () => {
    const c = new ActivityClassifier();
    const samples = synthSamples({ startMs: 0, durationMs: 10000, freqHz: 3, amplitudeG: 0.005 });
    const outputs = run(c, samples);
    expect(outputs.length).toBeGreaterThan(10);
    expect(outputs[outputs.length - 1].activity).toBe('resting');
  });

  it('detecta caminar (~1.9 Hz, 0.25 g)', () => {
    const c = new ActivityClassifier();
    const outputs = run(c, synthSamples({ startMs: 0, durationMs: 12000, freqHz: 1.9, amplitudeG: 0.25 }));
    const last = outputs[outputs.length - 1];
    expect(last.activity).toBe('walking');
    expect(last.cadence).toBeGreaterThan(95);
    expect(last.cadence).toBeLessThan(135);
    expect(last.intensity).toBeGreaterThan(0.1);
  });

  it('detecta correr (~2.8 Hz, 1.0 g)', () => {
    const c = new ActivityClassifier();
    const outputs = run(c, synthSamples({ startMs: 0, durationMs: 12000, freqHz: 2.8, amplitudeG: 1.0 }));
    const last = outputs[outputs.length - 1];
    expect(last.activity).toBe('running');
    expect(last.cadence).toBeGreaterThan(140);
  });

  it('ignora una sacudida aislada de ~1 s (no hay periodicidad sostenida)', () => {
    const c = new ActivityClassifier();
    const rest1 = synthSamples({ startMs: 0, durationMs: 6000, freqHz: 3, amplitudeG: 0.004 });
    const shake = synthSamples({ startMs: 6050, durationMs: 1000, freqHz: 1.5, amplitudeG: 0.6 });
    const rest2 = synthSamples({ startMs: 7100, durationMs: 8000, freqHz: 3, amplitudeG: 0.004 });
    const outputs = run(c, [...rest1, ...shake, ...rest2]);
    expect(outputs.every((o) => o.activity === 'resting')).toBe(true);
  });

  it('no cambia de caminar a correr por una sola evaluación (histéresis)', () => {
    const c = new ActivityClassifier();
    const walk = synthSamples({ startMs: 0, durationMs: 10000, freqHz: 1.9, amplitudeG: 0.25 });
    // Un tramo corto de carrera de 1 s seguido de caminata otra vez.
    const burst = synthSamples({ startMs: 10050, durationMs: 1000, freqHz: 2.8, amplitudeG: 1.0 });
    const walk2 = synthSamples({ startMs: 11100, durationMs: 8000, freqHz: 1.9, amplitudeG: 0.25 });
    const outputs = run(c, [...walk, ...burst, ...walk2]);
    const afterWarmup = outputs.slice(8);
    expect(afterWarmup.every((o) => o.activity === 'walking')).toBe(true);
  });

  it('cambia de caminar a correr cuando el cambio se sostiene', () => {
    const c = new ActivityClassifier();
    const walk = synthSamples({ startMs: 0, durationMs: 8000, freqHz: 1.9, amplitudeG: 0.25 });
    const runSamples = synthSamples({ startMs: 8050, durationMs: 12000, freqHz: 2.8, amplitudeG: 1.0 });
    const outputs = run(c, [...walk, ...runSamples]);
    expect(outputs[outputs.length - 1].activity).toBe('running');
  });

  it('vuelve a reposo cuando el movimiento se detiene', () => {
    const c = new ActivityClassifier();
    const walk = synthSamples({ startMs: 0, durationMs: 8000, freqHz: 1.9, amplitudeG: 0.25 });
    const rest = synthSamples({ startMs: 8050, durationMs: 12000, freqHz: 3, amplitudeG: 0.004 });
    const outputs = run(c, [...walk, ...rest]);
    expect(outputs[outputs.length - 1].activity).toBe('resting');
  });

  it('reset() limpia el estado', () => {
    const c = new ActivityClassifier();
    run(c, synthSamples({ startMs: 0, durationMs: 10000, freqHz: 1.9, amplitudeG: 0.25 }));
    c.reset();
    const outputs = run(c, synthSamples({ startMs: 20000, durationMs: 2000, freqHz: 3, amplitudeG: 0.004 }));
    expect(outputs.every((o) => o.activity === 'resting' && o.intensity < 0.1)).toBe(true);
  });
});

describe('AccelerometerStepCounter (respaldo)', () => {
  it('cuenta ~1 paso por ciclo', () => {
    const counter = new AccelerometerStepCounter();
    let steps = 0;
    for (const s of synthSamples({ startMs: 0, durationMs: 10000, freqHz: 2, amplitudeG: 0.3 })) {
      steps += counter.addSample(s);
    }
    expect(steps).toBeGreaterThanOrEqual(18);
    expect(steps).toBeLessThanOrEqual(21);
  });

  it('no cuenta pasos en reposo', () => {
    const counter = new AccelerometerStepCounter();
    let steps = 0;
    for (const s of synthSamples({ startMs: 0, durationMs: 10000, freqHz: 2, amplitudeG: 0.01 })) {
      steps += counter.addSample(s);
    }
    expect(steps).toBe(0);
  });
});
