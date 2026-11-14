import { noAutenticado } from "@/lib/respuestas";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

const fallo = (status: number, message: string) => Response.json({ ok: false, error: { message } }, { status });
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Descarga en Excel del reporte de rendiciones de un período (CAR-179), sin JS extra en el cliente (ADR-037). */
export async function GET(req: Request): Promise<Response> {
  const identidad = await identidadActual();
  if (!identidad?.actual?.portales.includes("erp")) return noAutenticado();
  const q = new URL(req.url).searchParams;
  const desde = q.get("desde") ?? "";
  const hasta = q.get("hasta") ?? "";
  if (!FECHA.test(desde) || !FECHA.test(hasta)) return fallo(400, "Período inválido.");
  const r = await ejecutarComoUsuario<{ nombre: string; mime: string; base64: string }>("erp", "rendiciones.reporte.excel", { periodo: { desde, hasta } });
  if (!r.ok) return fallo(r.error.code === "FORBIDDEN" ? 403 : r.error.code === "INVALID_INPUT" ? 400 : 422, r.error.message);
  return new Response(new Uint8Array(Buffer.from(r.data.base64, "base64")), {
    headers: {
      "content-type": r.data.mime,
      "content-disposition": `attachment; filename="${r.data.nombre.replace(/"/g, "")}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
