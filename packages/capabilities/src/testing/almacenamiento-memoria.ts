import type { Almacenamiento, ObjetoAlmacenado } from "@opai/integrations";

/** Almacenamiento en memoria: `subir` simula el PUT del navegador a la URL firmada. */
export function almacenamientoEnMemoria() {
  const objetos = new Map<string, ObjetoAlmacenado>();
  const almacenamiento: Almacenamiento = {
    disponible: true,
    urlSubida: async (clave, mime, sha256, segundos = 600) => ({
      url: `https://r2.test/${clave}?put&exp=${segundos}`,
      cabeceras: { "content-type": mime, "x-amz-checksum-sha256": sha256 },
    }),
    urlDescarga: async (clave, nombre, segundos = 300) =>
      `https://r2.test/${clave}?get&nombre=${encodeURIComponent(nombre)}&exp=${segundos}`,
    head: async (clave) => objetos.get(clave) ?? null,
    eliminar: async (clave) => void objetos.delete(clave),
  };
  /** Como R2: guarda el objeto con el hash declarado (el PUT con otro contenido fallaría). */
  const subir = (clave: string, tamano: number, mime: string, sha256: string | null = null) =>
    objetos.set(clave, { tamano, mime, sha256 });
  return { almacenamiento, objetos, subir };
}
