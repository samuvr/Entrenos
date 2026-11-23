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
const CACHE = 'entrenos-v2';

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

/*
 * Aviso del fin del descanso.
 *
 * Con el móvil bloqueado o la app en segundo plano los temporizadores de la
 * página se paran, así que la página le pasa aquí la hora de fin y es el
 * service worker el que lanza la notificación. `waitUntil` lo mantiene vivo
 * mientras dura el descanso (Chrome lo permite hasta unos minutos, de sobra
 * para un descanso). Si la app está a la vista no notifica: ya pita la página.
 */
let descansoPendiente = null;

function cancelarDescanso() {
  if (!descansoPendiente) return;
  clearTimeout(descansoPendiente.id);
  descansoPendiente.resolver();
  descansoPendiente = null;
}

async function avisarDescanso(datos) {
  const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clientes.some((c) => c.visibilityState === 'visible')) return;
  try {
    await self.registration.showNotification(datos.titulo || 'Descanso terminado', {
      body: datos.cuerpo || '',
      tag: 'descanso',
      renotify: true,
      requireInteraction: false,
      vibrate: [300, 150, 300],
      icon: './icono-192.png',
      badge: './icono-192.png',
    });
  } catch {
    // Sin permiso de notificaciones no hay nada que hacer.
  }
}

self.addEventListener('message', (evento) => {
  const datos = evento.data;
  if (!datos || typeof datos !== 'object') return;

  if (datos.tipo === 'cancelar-descanso') {
    cancelarDescanso();
    return;
  }
  if (datos.tipo !== 'programar-descanso' || typeof datos.finEn !== 'number') return;

  cancelarDescanso();
  const espera = Math.max(0, datos.finEn - Date.now());
  evento.waitUntil(
    new Promise((resolver) => {
      const id = setTimeout(() => {
        descansoPendiente = null;
        void avisarDescanso(datos).finally(resolver);
      }, espera);
      descansoPendiente = { id, resolver };
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      const abierto = clientes[0];
      if (abierto) return abierto.focus();
      return self.clients.openWindow('./');
    }),
  );
});
