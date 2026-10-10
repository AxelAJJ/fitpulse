import type { AccelSample } from '@/types';
import { DynamicAccelFilter, PeakDetector } from './signal';

/**
 * Contador de pasos de RESPALDO basado únicamente en el acelerómetro.
 *
 * Solo se usa cuando el podómetro de Apple no está disponible o el permiso fue denegado.
 * Nunca se ejecuta a la vez que el podómetro para evitar contar los pasos dos veces.
 * Es una estimación: puede errar entre un 10 y un 25 % según la posición del teléfono.
 */
export class AccelerometerStepCounter {
  private readonly filter = new DynamicAccelFilter(0.6);
  private readonly peaks: PeakDetector;

  constructor(minAmplitude = 0.12, minGapMs = 280) {
    this.peaks = new PeakDetector(minAmplitude, minGapMs);
  }

  /** Devuelve 1 si la muestra confirma un paso, 0 en caso contrario. */
  addSample(sample: AccelSample): number {
    const value = this.filter.process(sample.x, sample.y, sample.z);
    return this.peaks.push(value, sample.t) === null ? 0 : 1;
  }

  reset(): void {
    this.filter.reset();
    this.peaks.reset();
  }
}
