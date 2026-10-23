// Reglas puras de documentos (ADR-019, ADR-039): tipos de archivo, tamaño, nombre y clave en R2.

/** MIME que el núcleo acepta si el tipo de documento no restringe más. */
export const MIMES_NUCLEO = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
] as const;

/** 25 MB por archivo. */
export const TAMANO_MAXIMO_DOCUMENTO = 25 * 1024 * 1024;

export const CAPAS_DOCUMENTO = ["empresa", "cuenta", "instalacion", "persona", "puesto"] as const;

/** MIME permitido para un tipo: su lista si la tiene; si no, la del núcleo. */
export function mimePermitido(mime: string, delTipo: readonly string[] = []): boolean {
  const lista: readonly string[] = delTipo.length ? delTipo : MIMES_NUCLEO;
  return lista.includes(mime.toLowerCase());
}

/**
 * Nombre de archivo seguro para la clave del objeto y la descarga: sin rutas, sin caracteres de
 * control ni reservados, máximo 120 caracteres conservando la extensión.
 */
export function nombreSeguro(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? "";
  const limpio = [...base.normalize("NFC")]
    .filter((c) => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) !== 0x7f)
    .join("")
    .replace(/[<>:"|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  if (!limpio) return "archivo";
  if (limpio.length <= 120) return limpio;
  const punto = limpio.lastIndexOf(".");
  const ext = punto > 0 && limpio.length - punto <= 10 ? limpio.slice(punto) : "";
  return limpio.slice(0, 120 - ext.length) + ext;
}

/** Clave del objeto en R2: prefijo por tenant (ADR-019) y versión. */
export function claveDocumento(
  tenantId: string,
  documentoId: string,
  version: number,
  nombre: string,
) {
  return `t/${tenantId}/d/${documentoId}/v${version}/${encodeURIComponent(nombreSeguro(nombre))}`;
}

/** SHA-256 en hex (64 caracteres en minúscula). */
export const esSha256 = (v: string) => /^[0-9a-f]{64}$/.test(v);
