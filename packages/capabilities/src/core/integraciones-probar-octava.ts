import { probarAccesoOctava } from "@opai/integrations";

import { accesoOctava, almacenSesionOctava } from "../finanzas/adaptador-cesion-octava";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

/** Pide el token de Octava con el RUT y la contraseña guardados; no cede ningún documento. */
export async function probarOctava(ctx: Contexto): Promise<string> {
  const integ = await ctx.db.integracion.findUnique({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_cesion" } },
  });
  const acceso = integ ? await accesoOctava(ctx, integ.id) : null;
  if (!integ || !acceso) throw reglaDeNegocio("Faltan el RUT y la contraseña de acceso a la API de Octava.");
  const { venceEn } = await probarAccesoOctava({ acceso, almacen: almacenSesionOctava(ctx, integ.id) });
  const hora = new Date(venceEn).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
  return `Conexión correcta con Octava (token vigente hasta las ${hora}).`;
}
