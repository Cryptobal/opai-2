// Error tipado de un proveedor SII (CAR-242). Lleva un motivo ya saneado para la persona y para el log: sin
// secretos, sin el XML ni el CAF, sin comillas ni palabras técnicas que la UI descarta. Nunca el cuerpo completo.

export type PasoProveedorSii = "generar" | "sobre de envío" | "enviar" | "consultar";

export class ErrorProveedorSii extends Error {
  override readonly name = "ErrorProveedorSii";
  /** Motivo seguro para mostrar y registrar (CAR-49): ya saneado, sin datos del documento ni secretos. */
  readonly motivoSeguro: string;

  constructor(
    readonly paso: PasoProveedorSii,
    readonly motivo: string,
    readonly status?: number,
  ) {
    super(`SimpleAPI ${paso}: ${motivo}`);
    this.motivoSeguro = `SimpleAPI ${paso}: ${motivo}`;
  }
}

/** Palabras que la UI trata como texto técnico (`esMensajeDeNegocio`): un detalle que las trae no se muestra. */
const TECNICO = /capacidad|scope|input|zod|prisma|payload|tenant|undefined|null|\bP\d{4}\b|\bid\b|password|clave|token|key|base64/i;
const CAMPOS_MENSAJE = ["mensaje", "message", "error", "glosa", "detalle", "title", "descripcion"] as const;

function textoDeCuerpo(cuerpo: string): string | null {
  const t = cuerpo.trim();
  if (!t || t.startsWith("<")) return null; // HTML o XML: nunca se muestra (puede traer el documento).
  try {
    const j = JSON.parse(t) as unknown;
    if (typeof j === "string") return j;
    if (j && typeof j === "object") {
      for (const c of CAMPOS_MENSAJE) {
        const v = (j as Record<string, unknown>)[c];
        if (typeof v === "string" && v.trim()) return v;
      }
      return null;
    }
    return null;
  } catch {
    return t;
  }
}

/**
 * Detalle corto y legible de la respuesta del proveedor, o null si no hay uno seguro. Quita comillas, llaves y
 * etiquetas, descarta tokens largos (posibles firmas, base64 o claves) y corta a 140 caracteres.
 */
export function detalleSeguroDeRespuesta(cuerpo: string): string | null {
  const texto = textoDeCuerpo(cuerpo);
  if (!texto) return null;
  const limpio = texto
    .replace(/<[^>]*>/g, " ")
    .replace(/["'`{}[\]\\]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 0 && p.length < 32)
    .join(" ")
    .replace(/[.\s]+$/, "")
    .slice(0, 140)
    .trim();
  if (limpio.length < 3 || TECNICO.test(limpio)) return null;
  return limpio;
}
