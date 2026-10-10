import type { AccelSample } from '@/types';

/**
 * Genera muestras sintéticas del acelerómetro a 20 Hz.
 * La magnitud es 1 g + una senoide de la frecuencia y amplitud dadas (simula pasos).
 */
export function synthSamples(options: {
  startMs: number;
  durationMs: number;
  freqHz: number;
  amplitudeG: number;
  intervalMs?: number;
}): AccelSample[] {
  const { startMs, durationMs, freqHz, amplitudeG, intervalMs = 50 } = options;
  const samples: AccelSample[] = [];
  for (let t = 0; t <= durationMs; t += intervalMs) {
    const phase = 2 * Math.PI * freqHz * (t / 1000);
    const magnitude = 1 + amplitudeG * Math.sin(phase);
    // Toda la aceleración en el eje Z: la orientación no importa porque se usa la magnitud.
    samples.push({ x: 0, y: 0, z: magnitude, t: startMs + t });
  }
  return samples;
}
