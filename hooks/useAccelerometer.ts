import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import type { AccelSample } from '@/types';

/** Intervalo de muestreo: 50 ms = 20 Hz, suficiente para caminar y correr sin gastar de más. */
export const ACCEL_INTERVAL_MS = 50;

/**
 * Se suscribe al acelerómetro solo mientras `enabled` sea true y elimina el listener al
 * deshabilitarse o desmontarse. `onSample` se guarda en una ref para no re-suscribirse en cada render.
 */
export function useAccelerometer(
  enabled: boolean,
  onSample: (sample: AccelSample) => void,
  onError?: (error: unknown) => void,
): void {
  const sampleRef = useRef(onSample);
  const errorRef = useRef(onError);

  useEffect(() => {
    sampleRef.current = onSample;
    errorRef.current = onError;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    try {
      Accelerometer.setUpdateInterval(ACCEL_INTERVAL_MS);
      const subscription = Accelerometer.addListener(({ x, y, z }) => {
        sampleRef.current({ x, y, z, t: Date.now() });
      });
      return () => subscription.remove();
    } catch (error) {
      errorRef.current?.(error);
      return undefined;
    }
  }, [enabled]);
}
