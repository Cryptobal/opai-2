import { noAutenticado } from "@/lib/respuestas";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

const fallo = (status: number, message: string) =>
  Response.json({ ok: false, error: { message } }, { status });

/** Exportación Excel/PDF de reportes DT (CAR-590). */
export async function GET(req: Request): Promise<Response> {
  const identidad = await identidadActual();
  if (!identidad?.actual?.portales.includes("erp")) return noAutenticado();
  const q = new URL(req.url).searchParams;
  const tipo = q.get("tipo");
  const desde = q.get("desde");
  const hasta = q.get("hasta");
  const formato = q.get("formato");
  if (!tipo || !desde || !hasta || (formato !== "xlsx" && formato !== "pdf")) return fallo(400, "Parámetros inválidos.");
  const personaId = q.get("personaId") ?? undefined;
  const instalacionId = q.get("instalacionId") ?? undefined;
  const r = await ejecutarComoUsuario<{
    nombreArchivo: string;
    mime: string;
    contenidoBase64: string;
  }>("erp", "asistencia.reportes.exportar", {
    tipo,
    desde,
    hasta,
    formato,
    ...(personaId ? { personaId } : {}),
    ...(instalacionId ? { instalacionId } : {}),
  });
  if (!r.ok) {
    const estado = r.error.code === "FORBIDDEN" ? 403 : r.error.code === "NOT_FOUND" ? 404 : 502;
    return fallo(estado, r.error.message);
  }
  return new Response(new Uint8Array(Buffer.from(r.data.contenidoBase64, "base64")), {
    headers: {
      "content-type": r.data.mime,
      "content-disposition": `attachment; filename="${r.data.nombreArchivo.replace(/"/g, "")}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}