interface StepSample {
  t: number;
  steps: number;
}

/**
 * Estima la cadencia (pasos/min) a partir del total acumulado de pasos en una ventana deslizante.
 * Se alimenta con muestras (tiempo, total de pasos) y se consulta con `cadenceAt`.
 * Al dejar de llegar pasos la cadencia decae a 0 sola, porque la ventana avanza con el reloj.
 */
export class CadenceTracker {
  private samples: StepSample[] = [];

  constructor(
    private readonly windowMs = 12000,
    private readonly minSpanMs = 3000,
  ) {}

  addSample(tMs: number, totalSteps: number): void {
    this.samples.push({ t: tMs, steps: totalSteps });
    this.prune(tMs);
  }

  cadenceAt(nowMs: number): number {
    if (this.samples.length < 2) return 0;
    const cutoff = nowMs - this.windowMs;
    let anchor = this.samples[0];
    for (const s of this.samples) {
      if (s.t <= cutoff) anchor = s;
      else break;
    }
    const latest = this.samples[this.samples.length - 1];
    const spanMs = nowMs - anchor.t;
    if (spanMs < this.minSpanMs) return 0;
    const delta = latest.steps - anchor.steps;
    if (delta <= 0) return 0;
    return (delta / spanMs) * 60000;
  }

  reset(): void {
    this.samples = [];
  }

  /** Conserva solo una muestra anterior al borde de la ventana (el ancla) y las posteriores. */
  private prune(nowMs: number): void {
    const cutoff = nowMs - this.windowMs;
    let keepFrom = 0;
    for (let i = 0; i < this.samples.length; i += 1) {
      if (this.samples[i].t <= cutoff) keepFrom = i;
      else break;
    }
    if (keepFrom > 0) this.samples.splice(0, keepFrom);
  }
}
