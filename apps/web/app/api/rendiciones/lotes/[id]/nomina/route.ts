import { noAutenticado } from "@/lib/respuestas";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

const fallo = (status: number, message: string) => Response.json({ ok: false, error: { message } }, { status });

/** Descarga de la nómina Santander de un lote (Excel). Solo con sesión de una persona; el archivo lleva cuentas, por eso no hay herramienta MCP. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const identidad = await identidadActual();
  if (!identidad?.actual?.portales.includes("erp")) return noAutenticado();
  const { id } = await params;
  const r = await ejecutarComoUsuario<{ nombre: string; mime: string; base64: string }>("erp", "rendiciones.lotes.nomina_descargar", { id });
  if (!r.ok) return fallo(r.error.code === "FORBIDDEN" ? 403 : r.error.code === "NOT_FOUND" ? 404 : 422, r.error.message);
  return new Response(new Uint8Array(Buffer.from(r.data.base64, "base64")), {
    headers: {
      "content-type": r.data.mime,
      "content-disposition": `attachment; filename="${r.data.nombre.replace(/"/g, "")}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
