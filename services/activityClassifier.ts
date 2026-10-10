import type { AccelSample, ActivityKind } from '@/types';
import { DynamicAccelFilter, PeakDetector, standardDeviation } from './signal';

/**
 * Umbrales configurables del clasificador. Los valores por defecto son una primera aproximación
 * razonable (teléfono en bolsillo o mano); conviene calibrarlos con pruebas reales en tu iPhone.
 */
export interface ClassifierConfig {
  /** Ventana temporal de análisis (ms). */
  windowMs: number;
  /** Cada cuánto se evalúa la ventana (ms). */
  evalIntervalMs: number;
  /** Coeficiente del filtro EMA (0-1). Más alto = menos suavizado. */
  smoothingAlpha: number;
  /** Muestras mínimas en la ventana antes de clasificar. */
  minSamples: number;
  /** Desviación estándar (g) por debajo de la cual se considera reposo. */
  restStd: number;
  /** Desviación estándar (g) a partir de la cual se considera carrera. */
  runStd: number;
  /** Cadencia (pasos/min) a partir de la cual, junto con `runCadenceMinStd`, se considera carrera. */
  runCadence: number;
  /** Desviación estándar mínima (g) para que la cadencia alta cuente como carrera. */
  runCadenceMinStd: number;
  /** Cadencia mínima (pasos/min) para considerar que el movimiento es periódico (caminar/correr). */
  minWalkCadence: number;
  /** Amplitud mínima (g) de un pico para contarlo como paso. */
  peakMinAmplitude: number;
  /** Separación mínima entre picos (ms). */
  minPeakGapMs: number;
  /** Evaluaciones consecutivas necesarias para confirmar un cambio hacia caminar/correr. */
  confirmEvaluations: number;
  /** Evaluaciones consecutivas necesarias para confirmar un cambio a reposo. */
  confirmRestEvaluations: number;
  /** Desviación estándar (g) que equivale a intensidad 100 %. */
  intensityFullScaleStd: number;
  /** Suavizado (0-1) del indicador de intensidad mostrado. */
  intensitySmoothing: number;
}

export const DEFAULT_CLASSIFIER_CONFIG: ClassifierConfig = {
  windowMs: 3000,
  evalIntervalMs: 500,
  smoothingAlpha: 0.6,
  minSamples: 20,
  restStd: 0.03,
  runStd: 0.4,
  runCadence: 150,
  runCadenceMinStd: 0.3,
  minWalkCadence: 60,
  peakMinAmplitude: 0.06,
  minPeakGapMs: 250,
  confirmEvaluations: 4,
  confirmRestEvaluations: 6,
  intensityFullScaleStd: 0.8,
  intensitySmoothing: 0.4,
};

export interface ClassifierOutput {
  /** Actividad confirmada (con histéresis). */
  activity: ActivityKind;
  /** Clasificación instantánea de la ventana, sin histéresis. */
  rawActivity: ActivityKind;
  /** Intensidad del movimiento suavizada, 0-1. */
  intensity: number;
  /** Cadencia estimada por picos de aceleración (pasos/min). */
  cadence: number;
  /** Desviación estándar de la señal dinámica en la ventana (g). */
  std: number;
  /** Tiempo transcurrido desde la evaluación anterior (ms). 0 en la primera. */
  dtMs: number;
}

interface WindowSample {
  t: number;
  v: number;
}

const MAX_CADENCE = 240;

export class ActivityClassifier {
  private readonly config: ClassifierConfig;
  private readonly filter: DynamicAccelFilter;
  private readonly peaks: PeakDetector;
  private samples: WindowSample[] = [];
  private peakTimes: number[] = [];
  private lastEvalT: number | null = null;
  private confirmed: ActivityKind = 'resting';
  private candidate: ActivityKind = 'resting';
  private candidateCount = 0;
  private intensity = 0;

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = { ...DEFAULT_CLASSIFIER_CONFIG, ...config };
    this.filter = new DynamicAccelFilter(this.config.smoothingAlpha);
    this.peaks = new PeakDetector(this.config.peakMinAmplitude, this.config.minPeakGapMs);
  }

  /** Procesa una muestra. Devuelve un resultado cuando toca evaluar la ventana; si no, `null`. */
  addSample(sample: AccelSample): ClassifierOutput | null {
    const value = this.filter.process(sample.x, sample.y, sample.z);
    this.samples.push({ t: sample.t, v: value });
    const peakT = this.peaks.push(value, sample.t);
    if (peakT !== null) this.peakTimes.push(peakT);
    this.prune(sample.t);

    if (this.lastEvalT === null) {
      this.lastEvalT = sample.t;
      return null;
    }
    if (sample.t - this.lastEvalT < this.config.evalIntervalMs) return null;

    const dtMs = sample.t - this.lastEvalT;
    this.lastEvalT = sample.t;
    return this.evaluate(sample.t, dtMs);
  }

  reset(): void {
    this.filter.reset();
    this.peaks.reset();
    this.samples = [];
    this.peakTimes = [];
    this.lastEvalT = null;
    this.confirmed = 'resting';
    this.candidate = 'resting';
    this.candidateCount = 0;
    this.intensity = 0;
  }

  private prune(nowT: number): void {
    const cutoff = nowT - this.config.windowMs;
    let drop = 0;
    while (drop < this.samples.length && this.samples[drop].t < cutoff) drop += 1;
    if (drop > 0) this.samples.splice(0, drop);
    let dropPeaks = 0;
    while (dropPeaks < this.peakTimes.length && this.peakTimes[dropPeaks] < cutoff) dropPeaks += 1;
    if (dropPeaks > 0) this.peakTimes.splice(0, dropPeaks);
  }

  private evaluate(nowT: number, dtMs: number): ClassifierOutput {
    const { config } = this;
    const count = this.samples.length;
    const spanMs = count > 0 ? nowT - this.samples[0].t : 0;

    let std = 0;
    let cadence = 0;
    let raw: ActivityKind = 'resting';

    if (count >= config.minSamples && spanMs >= config.windowMs * 0.5) {
      std = standardDeviation(this.samples.map((s) => s.v));
      cadence = Math.min(MAX_CADENCE, this.peakTimes.length / (spanMs / 60000));
      raw = this.classifyRaw(std, cadence);
    }

    const activity = this.applyHysteresis(raw);
    const targetIntensity = Math.min(1, std / config.intensityFullScaleStd);
    this.intensity += (targetIntensity - this.intensity) * config.intensitySmoothing;

    return {
      activity,
      rawActivity: raw,
      intensity: this.intensity,
      cadence: Math.round(cadence),
      std,
      dtMs,
    };
  }

  private classifyRaw(std: number, cadence: number): ActivityKind {
    const { config } = this;
    // Sin energía suficiente o sin periodicidad (movimientos aislados) = reposo.
    if (std < config.restStd || cadence < config.minWalkCadence) return 'resting';
    if (std >= config.runStd || (cadence >= config.runCadence && std >= config.runCadenceMinStd)) {
      return 'running';
    }
    return 'walking';
  }

  /** Un estado nuevo solo se confirma si se repite varias evaluaciones seguidas. */
  private applyHysteresis(raw: ActivityKind): ActivityKind {
    if (raw === this.confirmed) {
      this.candidate = raw;
      this.candidateCount = 0;
      return this.confirmed;
    }
    if (raw === this.candidate) {
      this.candidateCount += 1;
    } else {
      this.candidate = raw;
      this.candidateCount = 1;
    }
    const needed =
      raw === 'resting' ? this.config.confirmRestEvaluations : this.config.confirmEvaluations;
    if (this.candidateCount >= needed) {
      this.confirmed = raw;
      this.candidateCount = 0;
    }
    return this.confirmed;
  }
}
