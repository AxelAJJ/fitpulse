import { useEffect, useState } from 'react';

/**
 * Devuelve la hora actual (ms) y la refresca cada `intervalMs` solo mientras `active` sea true.
 * El temporizador se limpia al desactivarse o al desmontar el componente.
 */
export function useNow(active: boolean, intervalMs = 500): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return now;
}
