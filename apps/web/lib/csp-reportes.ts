import { z } from "zod";

const directiva = z.enum([
  "default-src",
  "base-uri",
  "object-src",
  "frame-ancestors",
  "form-action",
  "img-src",
  "connect-src",
  "frame-src",
  "script-src",
  "script-src-elem",
  "script-src-attr",
  "style-src",
  "style-src-elem",
  "style-src-attr",
  "font-src",
  "media-src",
  "worker-src",
  "manifest-src",
]);
const estado = z.number().int().min(0).max(599).default(0);
const legado = z.object({
  "effective-directive": directiva,
  "blocked-uri": z.string().max(4096).default(""),
  "status-code": estado,
});
const moderno = z.object({
  type: z.literal("csp-violation"),
  body: z.object({
    effectiveDirective: directiva,
    blockedURL: z.string().max(4096).default(""),
    statusCode: estado,
  }),
});
const entrada = z.union([z.object({ "csp-report": legado }), z.array(moderno).min(1).max(10)]);

function destino(valor: string, origen: string) {
  if (["inline", "eval", "wasm-eval"].includes(valor)) return valor;
  if (valor.startsWith("data:")) return "data";
  if (valor.startsWith("blob:")) return "blob";
  try {
    return new URL(valor).origin === origen ? "self" : "externo";
  } catch {
    return "otro";
  }
}

/** Solo categorías controladas: nunca URL, ruta, query, muestra de script, IP ni policy/nonce. */
export function resumirReportes(valor: unknown, origen: string) {
  const r = entrada.safeParse(valor);
  if (!r.success) return null;
  const filas = Array.isArray(r.data)
    ? r.data.map((x) => ({
        directiva: x.body.effectiveDirective,
        bloqueado: x.body.blockedURL,
        estado: x.body.statusCode,
      }))
    : [
        {
          directiva: r.data["csp-report"]["effective-directive"],
          bloqueado: r.data["csp-report"]["blocked-uri"],
          estado: r.data["csp-report"]["status-code"],
        },
      ];
  return filas.map((f) => ({
    directiva: f.directiva,
    destino: destino(f.bloqueado, origen),
    estado: f.estado,
  }));
}

export const MAX_CSP_BYTES = 16_384;

/** Límite real del stream, no solo Content-Length (el navegador puede omitirlo). */
export async function leerReporte(req: Request) {
  if (Number(req.headers.get("content-length")) > MAX_CSP_BYTES) throw new RangeError("Tamaño");
  if (!req.body) throw new SyntaxError("Sin cuerpo");
  const reader = req.body.getReader();
  const partes: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_CSP_BYTES) {
        await reader.cancel();
        throw new RangeError("Tamaño");
      }
      partes.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const junto = new Uint8Array(bytes);
  let offset = 0;
  for (const parte of partes) {
    junto.set(parte, offset);
    offset += parte.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(junto)) as unknown;
}
