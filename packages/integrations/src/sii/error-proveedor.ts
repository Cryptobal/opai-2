// Error tipado de un proveedor SII (CAR-242). Separa el motivo fijo (seguro para el log) del detalle que devolvió el
// proveedor (solo para la persona, ya saneado): sin secretos, sin el XML ni el CAF, sin comillas ni caracteres de
// control, y nunca el cuerpo completo.

export type PasoProveedorSii = "generar" | "sobre de envío" | "enviar" | "consultar";

export class ErrorProveedorSii extends Error {
  override readonly name = "ErrorProveedorSii";
  /** Motivo fijo para el log (CAR-49): paso y estado, sin texto del proveedor ni datos del documento. */
  readonly motivoSeguro: string;
  /** Headers de límite de uso de la respuesta (`x-rate-limit-*`, `retry-after`), saneados; van al log (CAR-240). */
  limites: Readonly<Record<string, string>> = {};
  /** Forma del cuerpo de una respuesta no 2xx, sin su texto (CAR-240): distingue un 401 vacío de uno con motivo. */
  cuerpo: FormaCuerpo | null = null;

  constructor(
    readonly paso: PasoProveedorSii,
    /** Motivo fijo escrito por OPAI (p. ej. «respondió HTTP 400»). */
    readonly motivo: string,
    readonly status?: number,
    /** Detalle saneado del proveedor: texto externo, solo para la persona; nunca va al log. */
    readonly detalle?: string | null,
    /** El envío pudo haber llegado al SII aunque falló la respuesta (5xx o respuesta ilegible). */
    readonly incierto = false,
  ) {
    super(`SimpleAPI ${paso}: ${motivo}`);
    this.motivoSeguro = `SimpleAPI ${paso}: ${motivo}`;
  }
}

/**
 * «vacio»: sin cuerpo (SimpleAPI rechaza así un contenido inválido); «suscripcion»: habla de la API key, la
 * suscripción, el token o el cupo (la documentación de SimpleAPI usa 401 también para «falta de suscripción válida o
 * token expirado»); «otro»: cualquier otro texto. Nunca se guarda el texto.
 */
export type FormaCuerpo = "vacio" | "suscripcion" | "otro";

// Solo frases sobre la key o el plan: «Certificado vencido» o «CAF vencido» son del contenido y quedan como «otro».
const SUSCRIPCION =
  /suscrip|subscri|api ?key (vencida|expirada|bloqueada|inv[aá]lida|no v[aá]lida)|token (vencido|expirado)|expired token|cupo|l[ií]mite mensual|no tiene acceso a la api/i;

export function formaDeCuerpo(cuerpo: string): FormaCuerpo {
  const t = cuerpo.slice(0, 8 * 1024).trim();
  if (!t) return "vacio";
  return SUSCRIPCION.test(t) ? "suscripcion" : "otro";
}

const HEADER_LIMITE = /^(x-rate-?limit-[a-z0-9-]{1,40}|retry-after)$/i;
const VALOR_LIMITE = /^[\w.:+, -]{1,64}$/;

/**
 * Los headers de límite de uso de una respuesta (para el log; CAR-240): solo nombres `x-rate-limit-*`, `x-ratelimit-*`
 * o `retry-after`, y solo valores cortos de números, fechas o palabras. Nunca otros headers ni nada que parezca secreto.
 */
export function limitesDeRespuesta(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((valor, nombre) => {
    if (HEADER_LIMITE.test(nombre) && VALOR_LIMITE.test(valor.trim())) out[nombre.toLowerCase()] = valor.trim();
  });
  return out;
}

/** Palabras que la UI trata como texto técnico (`esMensajeDeNegocio`): un detalle que las trae no se muestra. */
const TECNICO = /capacidad|scope|input|zod|prisma|payload|tenant|undefined|null|\bP\d{4}\b|\bid\b|password|token|key|base64/i;
const CAMPOS_MENSAJE = ["mensaje", "message", "error", "glosa", "detalle", "title", "descripcion"] as const;
const MAX_CUERPO = 8 * 1024;

function textoDeCuerpo(cuerpo: string): string | null {
  const t = cuerpo.slice(0, MAX_CUERPO).trim();
  if (!t || t.startsWith("<")) return null; // HTML o XML: nunca se muestra (puede traer el documento).
  try {
    const j = JSON.parse(t) as unknown;
    if (typeof j === "string") return j;
    if (j && typeof j === "object") {
      for (const c of CAMPOS_MENSAJE) {
        const v = (j as Record<string, unknown>)[c];
        if (typeof v === "string" && v.trim()) return v;
      }
    }
    return null;
  } catch {
    return t;
  }
}

/**
 * Detalle corto y legible de la respuesta del proveedor, o null si no hay uno seguro. Quita caracteres de control y de
 * formato, comillas, llaves y etiquetas; descarta tokens largos (firmas, base64, claves) y toda palabra que contenga
 * un secreto propio (`secretos`: API key, clave del certificado); corta a 140 caracteres.
 */
export function detalleSeguroDeRespuesta(cuerpo: string, secretos: readonly string[] = []): string | null {
  const crudo = textoDeCuerpo(cuerpo);
  if (!crudo) return null;
  // Todo secreto no vacío se quita antes de normalizar, sea cual sea su largo (una clave de certificado puede tener
  // un solo carácter). Preferimos perder fidelidad del detalle antes que arriesgar un secreto.
  // Antes, los caracteres de control y de formato: uno invisible intercalado no debe esconder un secreto.
  const visible = crudo.replace(/[\p{Cf}]/gu, "").replace(/[\p{Cc}]/gu, " ");
  const texto = secretos.filter((s) => s.length > 0).reduce((t, s) => t.split(s).join(" "), visible);
  const propios = secretos.filter((s) => s.length >= 4);
  const limpio = texto
    .replace(/<[^>]*>/g, " ")
    .replace(/["'`{}[\]\\]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 0 && p.length < 32 && !propios.some((s) => p.includes(s) || s.includes(p) && p.length >= 4))
    .join(" ")
    .replace(/[.\s]+$/, "")
    .slice(0, 140)
    .trim();
  if (limpio.length < 3 || TECNICO.test(limpio)) return null;
  return limpio;
}
