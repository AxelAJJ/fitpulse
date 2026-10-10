import type { ActivityKind, DistanceUnit } from '@/types';

export const DEFAULT_HEIGHT_CM = 170;
export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 230;

const METERS_PER_MILE = 1609.344;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Longitud de paso estimada en metros.
 *
 * Se parte de la altura (la longitud de paso es una fracción de ella) y se ajusta con la
 * cadencia: a más pasos por minuto, el paso es más largo. `cadenceSpm = 0` significa
 * "cadencia desconocida" y usa valores promedio.
 *
 * - Caminando: 0.35 a 0.50 × altura (0.413 si no hay cadencia).
 * - Corriendo: 0.45 a 0.85 × altura (0.60 si no hay cadencia).
 *
 * Son aproximaciones poblacionales; la distancia resultante NO equivale a una medición GPS.
 */
export function stepLengthM(heightCm: number, activity: ActivityKind, cadenceSpm: number): number {
  const heightM = clamp(heightCm, MIN_HEIGHT_CM, MAX_HEIGHT_CM) / 100;
  const hasCadence = Number.isFinite(cadenceSpm) && cadenceSpm > 0;

  if (activity === 'running') {
    const factor = hasCadence ? clamp(0.45 + (cadenceSpm - 140) * 0.0045, 0.45, 0.85) : 0.6;
    return heightM * factor;
  }
  // En reposo con pasos entrando (retraso del clasificador) se usa el paso de caminata.
  const factor = hasCadence ? clamp(0.35 + (cadenceSpm - 80) * 0.0035, 0.35, 0.5) : 0.413;
  return heightM * factor;
}

/** Distancia = número de pasos × longitud estimada del paso (en metros). */
export function distanceForSteps(
  steps: number,
  heightCm: number,
  activity: ActivityKind,
  cadenceSpm: number,
): number {
  if (!Number.isFinite(steps) || steps <= 0) return 0;
  return steps * stepLengthM(heightCm, activity, cadenceSpm);
}

export function metersToKm(meters: number): number {
  return meters / 1000;
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function metersToUnit(meters: number, unit: DistanceUnit): number {
  return unit === 'mi' ? metersToMiles(meters) : metersToKm(meters);
}
