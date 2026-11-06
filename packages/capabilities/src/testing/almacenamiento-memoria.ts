import type { Almacenamiento, ObjetoAlmacenado } from "@opai/integrations";

/** Almacenamiento en memoria: `subir` simula el PUT del navegador a la URL firmada. */
export function almacenamientoEnMemoria() {
  const objetos = new Map<string, ObjetoAlmacenado>();
  const cuerpos = new Map<string, string>();
  const bytes = new Map<string, Buffer>();
  const almacenamiento: Almacenamiento = {
    disponible: true,
    urlSubida: async (clave, mime, sha256, segundos = 600) => ({
      url: `https://r2.test/${clave}?put&exp=${segundos}`,
      cabeceras: { "content-type": mime, "x-amz-checksum-sha256": sha256 },
    }),
    subir: async (clave, cuerpo, mime, sha256) => {
      // Como R2: lo que se guarda son los bytes; un string se codifica en UTF-8, un Buffer queda tal cual.
      const crudo = typeof cuerpo === "string" ? Buffer.from(cuerpo, "utf8") : Buffer.from(cuerpo);
      bytes.set(clave, crudo);
      cuerpos.set(clave, crudo.toString("utf8"));
      objetos.set(clave, { tamano: crudo.length, mime, sha256 });
    },
    urlDescarga: async (clave, nombre, segundos = 300) =>
      `https://r2.test/${clave}?get&nombre=${encodeURIComponent(nombre)}&exp=${segundos}`,
    leerTexto: async (clave) => cuerpos.get(clave) ?? null,
    leerBytes: async (clave) => bytes.get(clave) ?? null,
    head: async (clave) => objetos.get(clave) ?? null,
    eliminar: async (clave) => {
      objetos.delete(clave);
      cuerpos.delete(clave);
      bytes.delete(clave);
    },
  };
  /** Como R2: guarda el objeto con el hash declarado (el PUT con otro contenido fallaría). */
  const subir = (clave: string, tamano: number, mime: string, sha256: string | null = null) =>
    objetos.set(clave, { tamano, mime, sha256 });
  return { almacenamiento, objetos, cuerpos, bytes, subir };
}
