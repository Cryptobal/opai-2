import { esUuid } from "@/lib/ids";
import { noAutenticado } from "@/lib/respuestas";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

const fallo = (status: number, message: string) =>
  Response.json({ ok: false, error: { message } }, { status });

const ESTADOS = ["abierto", "ganado", "perdido"];

/** Descarga en Excel de los negocios filtrados, sin JS extra en el cliente (ADR-037, CAR-27). */
export async function GET(req: Request): Promise<Response> {
  const identidad = await identidadActual();
  if (!identidad?.actual?.portales.includes("erp")) return noAutenticado();
  const q = new URL(req.url).searchParams;
  const estado = q.get("estado");
  const etapa = q.get("etapa");
  const etiqueta = q.get("etiqueta");
  const texto = q.get("q");
  if (estado && !ESTADOS.includes(estado)) return fallo(400, "Estado inválido.");
  if ((etapa && !esUuid(etapa)) || (etiqueta && !esUuid(etiqueta))) return fallo(400, "Filtro inválido.");
  const r = await ejecutarComoUsuario<{ nombre: string; mime: string; base64: string; truncado: boolean }>(
    "erp",
    "comercial.negocios.exportar",
    {
      ...(texto ? { q: texto } : {}),
      ...(estado ? { estado } : {}),
      ...(etapa ? { etapaId: etapa } : {}),
      ...(etiqueta ? { etiquetaId: etiqueta } : {}),
    },
  );
  if (!r.ok) {
    const estadoHttp = r.error.code === "FORBIDDEN" ? 403 : r.error.code === "INVALID_INPUT" ? 400 : 502;
    return fallo(estadoHttp, r.error.message);
  }
  return new Response(new Uint8Array(Buffer.from(r.data.base64, "base64")), {
    headers: {
      "content-type": r.data.mime,
      "content-disposition": `attachment; filename="${r.data.nombre.replace(/"/g, "")}"`,
      "cache-control": "no-store",
      ...(r.data.truncado ? { "x-truncado": "1" } : {}),
      "x-content-type-options": "nosniff",
    },
  });
}
