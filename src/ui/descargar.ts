/**
 * Descarga un texto como fichero. Sin librerías: un blob, un enlace y un clic.
 *
 * En el móvil el navegador lo manda a "Archivos" o al menú de compartir, que es
 * justo lo que interesa para poder subir la copia a la nube.
 */
export function descargarTexto(nombre: string, contenido: string, tipo: string): void {
  const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Safari necesita que la URL siga viva mientras arranca la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function descargarJSON(nombre: string, contenido: string): void {
  descargarTexto(nombre, contenido, 'application/json');
}

export function descargarCSV(nombre: string, contenido: string): void {
  descargarTexto(nombre, contenido, 'text/csv');
}
