import type { Almacenamiento, ObjetoAlmacenado } from "@opai/integrations";

/** Almacenamiento en memoria: `subir` simula el PUT del navegador a la URL firmada. */
export function almacenamientoEnMemoria() {
  const objetos = new Map<string, ObjetoAlmacenado>();
  const almacenamiento: Almacenamiento = {
    disponible: true,
    urlSubida: async (clave, mime, segundos = 600) =>
      `https://r2.test/${clave}?put&mime=${encodeURIComponent(mime)}&exp=${segundos}`,
    urlDescarga: async (clave, nombre, segundos = 300) =>
      `https://r2.test/${clave}?get&nombre=${encodeURIComponent(nombre)}&exp=${segundos}`,
    head: async (clave) => objetos.get(clave) ?? null,
    eliminar: async (clave) => void objetos.delete(clave),
  };
  const subir = (clave: string, tamano: number, mime: string) =>
    objetos.set(clave, { tamano, mime });
  return { almacenamiento, objetos, subir };
}
