import { noAutenticado } from "@/lib/respuestas";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

const fallo = (status: number, message: string) =>
  Response.json({ ok: false, error: { message } }, { status });

/** Descarga de pauta filtrada (PDF o CSV) sin JS extra en el cliente (ADR-037). */
export async function GET(req: Request): Promise<Response> {
  const identidad = await identidadActual();
  if (!identidad?.actual?.portales.includes("erp")) return noAutenticado();
  const q = new URL(req.url).searchParams;
  const instalacionId = q.get("inst") ?? "";
  const formato = q.get("formato");
  if (!instalacionId || (formato !== "pdf" && formato !== "excel")) return fallo(400, "Parámetros inválidos.");
  const fecha = q.get("fecha") ?? undefined;
  const anio = q.get("anio") ? Number(q.get("anio")) : undefined;
  const mes = q.get("mes") ? Number(q.get("mes")) : undefined;
  const sinCubrir = q.get("sinCubrir") === "1";
  const input = fecha
    ? { instalacionId, fecha, formato, sinCubrir: sinCubrir || undefined }
    : anio && mes
      ? { instalacionId, anio, mes, formato, sinCubrir: sinCubrir || undefined }
      : null;
  if (!input) return fallo(400, "Indica fecha o año y mes.");
  const r = await ejecutarComoUsuario<{ nombre: string; mime: string; base64: string }>("erp", "pauta.exportar", input);
  if (!r.ok) {
    const estado = r.error.code === "FORBIDDEN" ? 403 : r.error.code === "NOT_FOUND" ? 404 : 502;
    return fallo(estado, r.error.message);
  }
  return new Response(new Uint8Array(Buffer.from(r.data.base64, "base64")), {
    headers: {
      "content-type": r.data.mime,
      "content-disposition": `attachment; filename="${r.data.nombre.replace(/"/g, "")}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
