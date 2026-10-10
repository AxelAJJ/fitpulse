import { useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';

/**
 * Suscripción al podómetro nativo (CMPedometer en iOS) mientras `enabled` sea true.
 *
 * `watchStepCount` entrega el total acumulado DESDE que se creó la suscripción, no incrementos.
 * Aquí se convierte a incrementos (`delta`) para que el consumidor sume sin duplicar:
 * - al pausar se cancela la suscripción (los pasos en pausa no se cuentan);
 * - al reanudar se crea una nueva suscripción que vuelve a empezar desde 0.
 */
export function usePedometerSteps(
  enabled: boolean,
  onSteps: (delta: number) => void,
  onError?: (error: unknown) => void,
): void {
  const stepsRef = useRef(onSteps);
  const errorRef = useRef(onError);

  useEffect(() => {
    stepsRef.current = onSteps;
    errorRef.current = onError;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let lastCumulative = 0;
    let cancelled = false;

    try {
      const subscription = Pedometer.watchStepCount(({ steps }) => {
        if (cancelled) return;
        const delta = steps - lastCumulative;
        if (delta <= 0) return;
        lastCumulative = steps;
        stepsRef.current(delta);
      });
      return () => {
        cancelled = true;
        subscription.remove();
      };
    } catch (error) {
      errorRef.current?.(error);
      return undefined;
    }
  }, [enabled]);
}
