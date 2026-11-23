/**
 * Avisos del temporizador de descanso: pitido, vibración y notificación.
 *
 * El pitido se genera con Web Audio (no hay fichero de audio). El navegador
 * solo deja sonar audio después de un toque del usuario, así que el contexto
 * se prepara al confirmar la serie, que es justo cuando arranca el descanso.
 */

type ConstructorAudio = typeof AudioContext;

let contexto: AudioContext | null = null;

/** Crea o despierta el contexto de audio. Llamar dentro de un toque. */
export function prepararAudio(): void {
  try {
    if (!contexto) {
      const Constructor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: ConstructorAudio }).webkitAudioContext;
      if (!Constructor) return;
      contexto = new Constructor();
    }
    if (contexto.state === 'suspended') void contexto.resume();
  } catch {
    contexto = null;
  }
}

/** Tres pitidos cortos y agudos: se oyen por encima de la música del gimnasio. */
export function pitar(): void {
  prepararAudio();
  if (!contexto) return;
  const inicio = contexto.currentTime + 0.02;
  for (let i = 0; i < 3; i += 1) {
    const t = inicio + i * 0.28;
    const oscilador = contexto.createOscillator();
    const volumen = contexto.createGain();
    oscilador.type = 'square';
    oscilador.frequency.value = 1320;
    volumen.gain.setValueAtTime(0.0001, t);
    volumen.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    oscilador.connect(volumen).connect(contexto.destination);
    oscilador.start(t);
    oscilador.stop(t + 0.2);
  }
}

export const PATRON_VIBRACION = [300, 150, 300];

/** Funciona en Android/Chrome; en iPhone no hace nada. */
export function vibrar(): void {
  try {
    navigator.vibrate?.(PATRON_VIBRACION);
  } catch {
    // Sin vibración no pasa nada: queda el pitido.
  }
}

export interface AvisoDescanso {
  /** Instante (ms desde epoch) en que termina el descanso. */
  finEn: number;
  titulo: string;
  cuerpo: string;
}

function trabajador(): ServiceWorker | null {
  return 'serviceWorker' in navigator ? navigator.serviceWorker.controller : null;
}

/**
 * Deja programada en el service worker la notificación del fin del descanso.
 * Es lo que avisa con el móvil bloqueado o la app en segundo plano: ahí los
 * temporizadores de la página se paran. El service worker no la muestra si la
 * app está a la vista (entonces ya pita la página).
 *
 * Solo hay service worker en la versión instalada (producción).
 */
export function programarAviso(aviso: AvisoDescanso): void {
  trabajador()?.postMessage({ tipo: 'programar-descanso', ...aviso });
}

export function cancelarAviso(): void {
  trabajador()?.postMessage({ tipo: 'cancelar-descanso' });
}

export type EstadoPermiso = NotificationPermission | 'no-disponible';

export function permisoNotificaciones(): EstadoPermiso {
  return 'Notification' in window ? Notification.permission : 'no-disponible';
}

export async function pedirPermisoNotificaciones(): Promise<EstadoPermiso> {
  if (!('Notification' in window)) return 'no-disponible';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Sin service worker (en desarrollo, o si no se registró) la notificación la
 * lanza la propia página, si sigue viva al acabar el descanso.
 */
export function notificarDesdeLaPagina(titulo: string, cuerpo: string): void {
  if (trabajador() || permisoNotificaciones() !== 'granted') return;
  try {
    new Notification(titulo, { body: cuerpo, tag: 'descanso' });
  } catch {
    // Android no deja crear notificaciones sin service worker; no hay más que hacer.
  }
}
