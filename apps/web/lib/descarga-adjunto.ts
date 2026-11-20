import { noAutenticado } from "@/lib/respuestas";
import { identidadActual } from "@/lib/servidor";

export const falloApi = (status: number, message: string) =>
  Response.json({ ok: false, error: { message } }, { status });

export async function gatePortalErp(): Promise<{ ok: true } | { ok: false; resp: Response }> {
  const identidad = await identidadActual();
  if (!identidad?.actual?.portales.includes("erp")) return { ok: false, resp: noAutenticado() };
  return { ok: true };
}

export function estadoHttpCapacidad(code: string) {
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND") return 404;
  if (code === "INVALID_INPUT") return 400;
  return 502;
}

export function respuestaAdjunto(mime: string, nombre: string, base64: string, extra?: Record<string, string>) {
  return new Response(new Uint8Array(Buffer.from(base64, "base64")), {
    headers: {
      "content-type": mime,
      "content-disposition": `attachment; filename="${nombre.replace(/"/g, "")}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extra,
    },
  });
}