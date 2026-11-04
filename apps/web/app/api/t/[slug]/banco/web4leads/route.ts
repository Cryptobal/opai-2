import { crearContexto, executeCapability } from "@opai/capabilities";
import { tenantPorSlug } from "@opai/db";

import { medidorDiferido } from "@/lib/medidor";
import { ipDe, permitir } from "@/lib/rate-limit";
import { asegurarRegistro } from "@/lib/registro";

asegurarRegistro();

const MAX_CUERPO = 1_000_000;
type Params = { params: Promise<{ slug: string }> };
const json = (status: number, cuerpo: Record<string, unknown>) => Response.json(cuerpo, { status });

/**
 * Receptor de movimientos bancarios de Web4Leads por empresa. El secreto de firma vive cifrado en
 * Integraciones › Banco (Web4Leads); aquí solo se limita, se lee el cuerpo y se delega en la capacidad
 * `finanzas.bancos.recibir_web4leads`, que verifica la firma. Mismas convenciones de respuesta que 1.0
 * para que Web4Leads no reintente en bucle: 200 si procesó o no aplicaba, 400/401 sin reintento, 5xx sí.
 */
export async function POST(req: Request, { params }: Params): Promise<Response> {
  const { slug } = await params;
  if (!(await permitir(`web4leads:${slug}:${ipDe(req)}`, 120, 60_000, { fallarCerrado: true }))) {
    return new Response(null, { status: 429, headers: { "Retry-After": "60" } });
  }
  const timestamp = req.headers.get("x-web4leads-timestamp") ?? "";
  const firma = req.headers.get("x-web4leads-signature") ?? "";
  if (!timestamp || !firma) return json(401, { success: false, error: "Faltan las cabeceras de firma." });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_CUERPO) return new Response(null, { status: 413 });
  const cuerpo = await req.text();
  if (cuerpo.length > MAX_CUERPO) return new Response(null, { status: 413 });

  const tenant = await tenantPorSlug(slug);
  if (!tenant || tenant.estado !== "activo") return json(200, { success: true, skipped: "tenant_no_encontrado" });

  const ctx = crearContexto({
    tenantId: tenant.id,
    actor: { tipo: "system" },
    medidor: medidorDiferido,
    modulosActivos: ["finanzas"],
  });
  const r = await executeCapability(ctx, "finanzas.bancos.recibir_web4leads", { cuerpo, timestamp, firma });
  if (!r.ok) {
    return r.error.code === "VALIDATION" || r.error.code === "UNPROCESSABLE"
      ? json(400, { success: false, error: r.error.message })
      : json(500, { success: false, error: "Error transitorio." });
  }
  const d = r.data as { firmaValida: boolean; reconocida: boolean; nuevos: number; duplicados: number; sospechosos: number };
  if (!d.firmaValida) return json(401, { success: false, error: "Firma inválida." });
  if (!d.reconocida) return json(200, { success: true, skipped: "cuenta_no_reconocida" });
  return json(200, { success: true, imported: d.nuevos, duplicates: d.duplicados, suspects: d.sospechosos });
}
