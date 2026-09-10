/**
 * Registro del service worker.
 *
 * Solo en producción. En desarrollo se hace lo contrario: si quedó uno
 * registrado de una prueba, se quita, porque si no sirve los ficheros viejos y
 * parece que los cambios no se aplican.
 */
export function registrarServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  if (!import.meta.env.PROD) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registros) => Promise.all(registros.map((r) => r.unregister())));
    return;
  }

  // Se espera a que cargue la página: registrarlo antes le quita ancho de banda
  // a lo que hace falta para pintar.
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Sin service worker la app funciona igual, solo que no arranca sin red.
    });
  });
}
