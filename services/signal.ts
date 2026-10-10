/** Utilidades de procesamiento de señal para el acelerómetro. Funciones puras, sin dependencias de React. */

export function magnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

export function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let acc = 0;
  for (const v of values) acc += (v - m) * (v - m);
  return Math.sqrt(acc / values.length);
}

/**
 * Convierte muestras (x, y, z) en g a una señal "dinámica" suavizada.
 *
 * La magnitud de la aceleración en reposo es ~1 g sin importar la orientación del teléfono,
 * así que restar 1 elimina la gravedad sin necesitar conocer la orientación. Después se aplica
 * un filtro paso bajo exponencial (EMA) para reducir el ruido de alta frecuencia.
 */
export class DynamicAccelFilter {
  private value: number | null = null;

  constructor(private readonly alpha: number = 0.6) {}

  process(x: number, y: number, z: number): number {
    const dynamic = magnitude(x, y, z) - 1;
    this.value = this.value === null ? dynamic : this.value + this.alpha * (dynamic - this.value);
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

/**
 * Detector de picos en streaming. Un pico es un máximo local por encima de `minAmplitude`
 * separado del pico anterior al menos `minGapMs`. Devuelve la marca de tiempo del pico
 * cuando se confirma (una muestra después de ocurrir) o `null`.
 */
export class PeakDetector {
  private prev2 = Number.NaN;
  private prev1 = Number.NaN;
  private prevT = 0;
  private lastPeakT = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly minAmplitude: number,
    private readonly minGapMs: number,
  ) {}

  push(value: number, tMs: number): number | null {
    let peakT: number | null = null;
    if (
      !Number.isNaN(this.prev2) &&
      !Number.isNaN(this.prev1) &&
      this.prev1 > this.prev2 &&
      this.prev1 >= value &&
      this.prev1 >= this.minAmplitude &&
      this.prevT - this.lastPeakT >= this.minGapMs
    ) {
      peakT = this.prevT;
      this.lastPeakT = this.prevT;
    }
    this.prev2 = this.prev1;
    this.prev1 = value;
    this.prevT = tMs;
    return peakT;
  }

  reset(): void {
    this.prev2 = Number.NaN;
    this.prev1 = Number.NaN;
    this.prevT = 0;
    this.lastPeakT = Number.NEGATIVE_INFINITY;
  }
}
