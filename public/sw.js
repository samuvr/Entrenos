/**
 * Service worker: hace que la app arranque sin cobertura.
 *
 * El gimnasio no tiene señal, así que abrir la app en modo avión tiene que
 * funcionar de principio a fin. Los entrenos ya viven en IndexedDB; lo que
 * falta es que el HTML, el JS y el CSS estén también guardados.
 *
 * Estrategia:
 * - Navegaciones: red primero, para coger la versión nueva al desplegar, y la
 *   copia guardada si no hay red.
 * - Todo lo demás: copia guardada primero. Vite pone un hash en el nombre de
 *   cada fichero, así que un fichero guardado nunca es la versión equivocada.
 *
 * Subir CACHE de versión tira todo lo guardado y vuelve a empezar. Es lo único
 * que hay que tocar aquí.
 */
const CACHE = 'entrenos-v1';

const BASICOS = ['./', './manifest.webmanifest', './icono-192.png', './icono-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      // Si algo no se puede guardar (sin red al instalar), la instalación
      // sigue: lo que falte se guardará en el primer uso con cobertura.
      .then((cache) => Promise.allSettled(BASICOS.map((ruta) => cache.add(ruta))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  if (new URL(peticion.url).origin !== self.location.origin) return;

  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          guardar(peticion, respuesta.clone());
          return respuesta;
        })
        .catch(() =>
          caches
            .match(peticion, { ignoreSearch: true })
            .then((guardada) => guardada ?? caches.match('./')),
        ),
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion).then(
      (guardada) =>
        guardada ??
        fetch(peticion).then((respuesta) => {
          guardar(peticion, respuesta.clone());
          return respuesta;
        }),
    ),
  );
});

function guardar(peticion, respuesta) {
  if (!respuesta.ok || respuesta.type === 'opaque') return;
  void caches.open(CACHE).then((cache) => cache.put(peticion, respuesta));
}
