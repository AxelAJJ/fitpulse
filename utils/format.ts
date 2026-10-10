import type { ActivityKind, DistanceUnit } from '@/types';
import { metersToUnit } from '@/services/distance';

const LOCALE = 'es-MX';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Formatea segundos como `mm:ss` o `h:mm:ss`. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatDistance(
  meters: number,
  unit: DistanceUnit,
): { value: string; unit: DistanceUnit } {
  return { value: metersToUnit(Math.max(0, meters), unit).toFixed(2), unit };
}

export function formatSteps(steps: number): string {
  return Math.max(0, Math.round(steps)).toLocaleString(LOCALE);
}

export function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  resting: 'En reposo',
  walking: 'Caminando',
  running: 'Corriendo',
};

export const ACTIVITY_SHORT_LABELS: Record<ActivityKind, string> = {
  resting: 'Reposo',
  walking: 'Caminar',
  running: 'Correr',
};

export function createSessionId(now: number): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
