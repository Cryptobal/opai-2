// Detalle legible del error que devuelve un proveedor de IA (Anthropic, OpenAI, Google, xAI o
// compatibles), saneado para mostrarlo en pantalla y guardarlo en el estado de la integración.

const MAX_CUERPO = 8_192;
const MAX_DETALLE = 300;

/** Formas que se parecen a credenciales: se reemplazan aunque no sean la key de esta llamada. */
const PARECE_SECRETO = [
  /sk-ant-[\w-]+/g,
  /sk-[\w-]{16,}/g,
  /xai-[\w-]{16,}/g,
  /AIza[\w-]{20,}/g,
  /Bearer\s+[\w.~+/=-]+/gi,
];

type CuerpoError = {
  error?: { type?: unknown; message?: unknown; status?: unknown } | string;
  message?: unknown;
};

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Quita la key (si se conoce) y todo lo que parezca credencial; deja una sola línea acotada. */
export function sanear(mensaje: string, secreto?: string): string {
  let limpio = mensaje;
  if (secreto && secreto.length >= 4) limpio = limpio.split(secreto).join("[clave]");
  for (const patron of PARECE_SECRETO) limpio = limpio.replace(patron, "[clave]");
  const control = (c: string) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127;
  limpio = Array.from(limpio, (c) => (control(c) ? " " : c))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return limpio.length > MAX_DETALLE ? `${limpio.slice(0, MAX_DETALLE - 1)}…` : limpio;
}

/**
 * Extrae `tipo · mensaje` del JSON de error del proveedor. Anthropic: `{type:"error", error:{type,
 * message}}`; OpenAI y compatibles: `{error:{message,type}}`; Google: `{error:{message,status}}`.
 * Un cuerpo que no es JSON (HTML de un proxy, texto libre) no se muestra: devuelve undefined.
 */
export function detalleDeCuerpo(cuerpo: string, secreto?: string): string | undefined {
  let datos: CuerpoError;
  try {
    datos = JSON.parse(cuerpo.slice(0, MAX_CUERPO)) as CuerpoError;
  } catch {
    return undefined;
  }
  if (typeof datos !== "object" || datos === null) return undefined;
  const error = typeof datos.error === "object" && datos.error !== null ? datos.error : undefined;
  const mensaje = texto(error?.message) ?? texto(datos.error) ?? texto(datos.message);
  if (!mensaje) return undefined;
  const tipo = texto(error?.type) ?? texto(error?.status);
  return sanear(tipo ? `${tipo} · ${mensaje}` : mensaje, secreto);
}

/** Lee el cuerpo de una respuesta fallida sin lanzar; vacío si no se pudo leer. */
export async function leerCuerpoError(r: Response): Promise<string> {
  try {
    return (await r.text()).slice(0, MAX_CUERPO);
  } catch {
    return "";
  }
}
