export type ActivityKind = 'resting' | 'walking' | 'running';

export type DistanceUnit = 'km' | 'mi';

/** Origen de los pasos de la sesión. Solo se usa UNO a la vez para no duplicar pasos. */
export type StepSource = 'pedometer' | 'accelerometer';

export type SessionStatus = 'idle' | 'running' | 'paused';

export interface Settings {
  heightCm: number;
  distanceUnit: DistanceUnit;
  keepScreenAwake: boolean;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  steps: number;
  distanceM: number;
  dominantActivity: ActivityKind;
  stepSource: StepSource;
}

export interface AccelSample {
  x: number;
  y: number;
  z: number;
  /** Marca de tiempo en milisegundos. */
  t: number;
}

export type PermissionState = 'undetermined' | 'granted' | 'denied';

export interface SensorSupport {
  checked: boolean;
  pedometer: boolean;
  accelerometer: boolean;
  permission: PermissionState;
}

export interface AppNotice {
  level: 'info' | 'warning' | 'error';
  message: string;
  action?: 'open-settings';
}
