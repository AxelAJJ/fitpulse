import { Accelerometer, Pedometer } from 'expo-sensors';
import type { AppNotice, PermissionState, SensorSupport, StepSource } from '@/types';

export const INITIAL_SUPPORT: SensorSupport = {
  checked: false,
  pedometer: false,
  accelerometer: false,
  permission: 'undetermined',
};

function mapPermission(status: string): PermissionState {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

/** Comprueba qué sensores existen y el estado del permiso de "Movimiento y Fitness". No muestra diálogos. */
export async function detectSupport(): Promise<SensorSupport> {
  const [pedometer, accelerometer] = await Promise.all([
    Pedometer.isAvailableAsync().catch(() => false),
    Accelerometer.isAvailableAsync().catch(() => false),
  ]);

  let permission: PermissionState = 'undetermined';
  if (pedometer) {
    try {
      permission = mapPermission((await Pedometer.getPermissionsAsync()).status);
    } catch {
      permission = 'undetermined';
    }
  }
  return { checked: true, pedometer, accelerometer, permission };
}

/** Pide el permiso (muestra el diálogo del sistema solo si aún no se decidió). */
export async function ensureMotionPermission(): Promise<PermissionState> {
  try {
    const current = await Pedometer.getPermissionsAsync();
    if (current.status === 'granted') return 'granted';
    if (current.status === 'denied' && !current.canAskAgain) return 'denied';
    const requested = await Pedometer.requestPermissionsAsync();
    return mapPermission(requested.status);
  } catch {
    return 'denied';
  }
}

/** Elige UNA fuente de pasos. Prioriza el podómetro nativo. */
export function chooseStepSource(support: SensorSupport): StepSource | null {
  if (support.pedometer && support.permission === 'granted') return 'pedometer';
  if (support.accelerometer) return 'accelerometer';
  return null;
}

export function describeUnsupported(): AppNotice {
  return {
    level: 'error',
    message:
      'Este dispositivo no tiene podómetro ni acelerómetro disponibles (por ejemplo, el simulador de iOS). Prueba la app en un iPhone físico.',
  };
}

export function describeFallback(support: SensorSupport): AppNotice {
  if (!support.pedometer) {
    return {
      level: 'warning',
      message:
        'Este dispositivo no ofrece podómetro. Contaré los pasos con el acelerómetro, que es una estimación menos precisa.',
    };
  }
  return {
    level: 'warning',
    message:
      'Sin el permiso de "Movimiento y Fitness" no puedo usar el podómetro de Apple. Contaré los pasos con el acelerómetro (menos preciso). Puedes activar el permiso en Ajustes de iOS.',
    action: 'open-settings',
  };
}
