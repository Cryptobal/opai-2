import { ejecutarComoUsuario } from "@/lib/servidor";
import { falloApi, estadoHttpCapacidad, gatePortalErp, respuestaAdjunto } from "@/lib/descarga-adjunto";

/** Exportación Excel/PDF de reportes DT (CAR-590). */
export async function GET(req: Request): Promise<Response> {
  const gate = await gatePortalErp();
  if (!gate.ok) return gate.resp;
  const q = new URL(req.url).searchParams;
  const tipo = q.get("tipo");
  const desde = q.get("desde");
  const hasta = q.get("hasta");
  const formato = q.get("formato");
  if (!tipo || !desde || !hasta || (formato !== "xlsx" && formato !== "pdf")) return falloApi(400, "Parámetros inválidos.");
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
  if (!r.ok) return falloApi(estadoHttpCapacidad(r.error.code), r.error.message);
  return respuestaAdjunto(r.data.mime, r.data.nombreArchivo, r.data.contenidoBase64);
}