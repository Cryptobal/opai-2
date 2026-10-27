import { forTenant, globales } from "@opai/db";
import { almacenamientoDelEntorno } from "@opai/integrations";
import { imagenMarcaPrevia } from "@/lib/imagen-marca-previa";
import { ipDe, permitir } from "@/lib/rate-limit";

const ASSETS = {
  logoPrincipal: "logoPrincipalId",
  logoClaro: "logoClaroId",
  logoOscuro: "logoOscuroId",
  isotipo: "isotipoId",
  favicon: "faviconId",
} as const;

type Params = { params: Promise<{ slug: string; asset: string }> };

/**
 * URL pública y estable de los logos de la marca del tenant (correos, PDF, portales; ADR-028).
 * Redirige a una URL firmada de corta duración: el archivo nunca pasa por la función y el enlace
 * del correo sigue funcionando aunque la firma caduque.
 */
export async function GET(req: Request, { params }: Params): Promise<Response> {
  const previa = new URL(req.url).searchParams.get("vistaPrevia") === "1";
  if (previa && !(await permitir(`marca-previa:${ipDe(req)}`, 30, 60_000, { fallarCerrado: true })))
    return new Response(null, {
      status: 429,
      headers: { "Retry-After": "60", "Cache-Control": "no-store" },
    });
  const { slug, asset } = await params;
  const campo = ASSETS[asset as keyof typeof ASSETS];
  const noEncontrado = () => new Response("No encontrado.", { status: 404 });
  if (!campo || !/^[a-z0-9-]{2,40}$/.test(slug)) return noEncontrado();
  const tenant = await globales().tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) return noEncontrado();
  const db = forTenant(tenant.id);
  const perfil = await db.perfilEmpresa.findUnique({ where: { tenantId: tenant.id } });
  const documentoId = perfil?.[campo];
  if (!documentoId) return noEncontrado();
  const doc = await db.documento.findUnique({ where: { id: documentoId } });
  if (!doc || doc.estado !== "disponible" || !doc.mime.startsWith("image/")) return noEncontrado();
  // Solo documentos de marca de la empresa (mismo control que core.marca.update).
  const tipo = doc.tipoId ? await db.documentoTipo.findUnique({ where: { id: doc.tipoId } }) : null;
  if (!tipo?.codigo.startsWith("marca.")) return noEncontrado();
  const almacen = almacenamientoDelEntorno();
  if (!almacen.disponible) return noEncontrado();
  const url = await almacen.urlDescarga(doc.storageKey, doc.nombre, 3600);
  if (previa) return imagenMarcaPrevia(url, doc.mime, doc.tamano);
  return new Response(null, {
    status: 302,
    headers: { location: url, "cache-control": "public, max-age=300" },
  });
}
