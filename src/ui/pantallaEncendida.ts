import { useEffect } from 'react';

interface WakeLockSentinel {
  release: () => Promise<void>;
}

interface ConWakeLock {
  wakeLock?: { request: (tipo: 'screen') => Promise<WakeLockSentinel> };
}

export function hayWakeLock(): boolean {
  return 'wakeLock' in navigator;
}

/**
 * Mantiene la pantalla encendida mientras `activo` sea true (Wake Lock API).
 * El navegador lo suelta solo al pasar a segundo plano, así que se vuelve a
 * pedir cada vez que la app vuelve a verse.
 */
export function usePantallaEncendida(activo: boolean): void {
  useEffect(() => {
    const api = (navigator as Navigator & ConWakeLock).wakeLock;
    if (!activo || !api) return;

    let bloqueo: WakeLockSentinel | null = null;
    let vigente = true;
    const pedir = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const nuevo = await api.request('screen');
        if (vigente) bloqueo = nuevo;
        else void nuevo.release();
      } catch {
        // Batería baja o sin permiso: la pantalla se apagará como siempre.
      }
    };
    const alVolver = () => void pedir();

    void pedir();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      vigente = false;
      document.removeEventListener('visibilitychange', alVolver);
      void bloqueo?.release().catch(() => undefined);
    };
  }, [activo]);
}
