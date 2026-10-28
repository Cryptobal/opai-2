// Detalle legible del error que devuelve un proveedor de IA (Anthropic, OpenAI, Google, xAI o
// compatibles), saneado para mostrarlo en pantalla y guardarlo en el estado de la integración.

const MAX_CUERPO = 8_192;
const MAX_DETALLE = 300;

/** Formas que se parecen a credenciales: se reemplazan aunque no sean la key de esta llamada. */
const PARECE_SECRETO: [RegExp, string][] = [
  [/\bsk-ant-[\w-]+/gi, "[clave]"],
  [/\bsk-[\w-]{16,}/gi, "[clave]"],
  [/\bxai-[\w-]{16,}/gi, "[clave]"],
  [/AIza[\w-]{20,}/g, "[clave]"],
  [/\b(?:ghp|gho|ghu|ghs|ghr|gsk)_[\w]{16,}/gi, "[clave]"],
  [/\bgithub_pat_[\w]{20,}/gi, "[clave]"],
  [/\bBearer\s+[\w.~+/=-]+/gi, "[clave]"],
  // `Basic` con mayúscula y credencial base64 (no «basic tier» ni «Basic plan»).
  [/\bBasic\s+[A-Za-z0-9+/]{8,}={0,2}/g, "[clave]"],
  // Usuario y clave dentro de una URL (`https://usuario:clave@host`).
  [/(\/\/)[^/\s:@]+:[^@\s/]+@/g, "$1[clave]@"],
  // Credenciales en la query de una URL.
  [/([?&](?:key|api_key|apikey|token|access_token|secret)=)[^&\s"']+/gi, "$1[clave]"],
];

/** Bloques largos con forma de base64 o token (mayúsculas, minúsculas y dígitos mezclados). */
const PARECE_BASE64 = /[A-Za-z0-9+/]{40,}={0,2}/g;
const mezclado = (m: string) => /[a-z]/.test(m) && /[A-Z]/.test(m) && /\d/.test(m);

/** Caracteres invisibles que podrían partir una key para que no calce la búsqueda. */
const INVISIBLES = /[\u00AD\u180E\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g;
const SEPARADOR = "[\\s\\u00AD\\u200B-\\u200F\\u2060\\uFEFF]*";

/** Busca la key aunque venga en mayúsculas, partida por espacios o saltos, o URL-encoded. */
function quitarClave(texto: string, secreto: string): string {
  const escapar = (c: string) => c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const patron = new RegExp(Array.from(secreto, escapar).join(SEPARADOR), "gi");
  return texto.replace(patron, "[clave]");
}

function decodificarUrl(texto: string): string {
  if (!/%[0-9a-f]{2}/i.test(texto)) return texto;
  try {
    return decodeURIComponent(texto);
  } catch {
    return texto.replace(/%[0-9a-f]{2}/gi, (m) => String.fromCharCode(parseInt(m.slice(1), 16)));
  }
}

type CuerpoError = {
  error?: { type?: unknown; message?: unknown; status?: unknown } | string;
  message?: unknown;
};

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Quita la key (si se conoce) y todo lo que parezca credencial; deja una sola línea acotada. */
export function sanear(mensaje: string, secreto?: string): string {
  let limpio = decodificarUrl(mensaje.replace(INVISIBLES, ""));
  if (secreto && secreto.trim().length >= 4) limpio = quitarClave(limpio, secreto.trim());
  for (const [patron, reemplazo] of PARECE_SECRETO) limpio = limpio.replace(patron, reemplazo);
  limpio = limpio.replace(PARECE_BASE64, (m) => (mezclado(m) ? "[clave]" : m));
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
