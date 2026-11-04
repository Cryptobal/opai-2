import type { Contexto } from "@opai/capabilities";

/** Evento comunicable del correo al cliente (el evento de dominio `cpq.cotizacion.enviada` no se renombra). */
export const EVENTO_CORREO_CLIENTE = "cpq.cotizacion.enviada_cliente";

/**
 * Variables del correo que recibe el cliente al enviarle una cotización. El enlace es el de su
 * Portal Cliente (`/cliente`): hoy el portal no tiene vista de cotización, así que apunta a su
 * inicio. Cuando exista la vista, solo cambia la ruta aquí.
 */
export async function datosCorreoCliente(
  ctx: Contexto,
  d: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const [perfil, tenant] = await Promise.all([
    ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId }, select: { nombreComercial: true } }),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
  ]);
  const texto = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  return {
    cotizacion: { codigo: texto("codigo"), titulo: texto("titulo") },
    mensaje: texto("mensaje"),
    empresa: { nombre: perfil?.nombreComercial ?? tenant?.nombre ?? "" },
    url: `${ctx.servicios.urlBase.replace(/\/$/, "")}/cliente`,
  };
}
