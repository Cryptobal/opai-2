import { adaptadorCesionSimulado, adaptadorOctava, type AdaptadorCesion, type AlmacenSesionOctava } from "@opai/integrations";

import type { Contexto } from "../types";
import { accesoOctava, almacenSesionOctava, cedenteOctava, type ConfigCesion } from "./adaptador-cesion-octava";

const ALMACEN_VACIO: AlmacenSesionOctava = {
  leerToken: async () => null,
  guardarToken: async () => {},
};

/**
 * Adaptador de cesión efectivo del tenant: simulado en test o sin proveedor; Octava (API real, CAR-154)
 * con el RUT y la contraseña de acceso cifrados en la integración `dte_cesion` (ObtenerToken, token de 6 h).
 */
export async function adaptadorCesionDe(ctx: Contexto): Promise<AdaptadorCesion> {
  if (process.env.NODE_ENV === "test" || process.env.CESION_ADAPTADOR === "simulado") {
    return adaptadorCesionSimulado();
  }
  const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
  if (cfg?.cesionProveedor !== "octava") return adaptadorCesionSimulado();
  const ambiente = cfg.ambiente === "produccion" ? "produccion" : "certificacion";
  const rutEmisor = cfg.rutEmisor ?? "";
  const integ = await ctx.db.integracion.findUnique({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_cesion" } },
  });
  const acceso = integ ? await accesoOctava(ctx, integ.id) : null;
  if (!integ || !acceso) {
    // Sin credenciales queda no disponible; quien llama pide configurar la integración.
    return adaptadorOctava({
      acceso: null,
      cedente: await cedenteOctava(ctx, {}, rutEmisor),
      almacen: ALMACEN_VACIO,
      ambiente,
    });
  }
  const config = (integ.config ?? {}) as ConfigCesion;
  return adaptadorOctava({
    acceso,
    cedente: await cedenteOctava(ctx, config, rutEmisor),
    almacen: almacenSesionOctava(ctx, integ.id),
    ambiente,
  });
}
