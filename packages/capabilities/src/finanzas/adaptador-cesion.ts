import { adaptadorCesionSimulado, adaptadorOctava, type AdaptadorCesion, type AlmacenSesionOctava } from "@opai/integrations";

import type { Contexto } from "../types";
import { almacenSesionOctava, cedenteOctava, integradorOctava, type ConfigCesion } from "./adaptador-cesion-octava";

const ALMACEN_VACIO: AlmacenSesionOctava = {
  leerPassAcceso: async () => null,
  guardarPassAcceso: async () => {},
  leerToken: async () => null,
  guardarToken: async () => {},
};

/**
 * Adaptador de cesión efectivo del tenant: simulado en test o sin proveedor; Octava (API real, CAR-154)
 * con las credenciales del integrador cifradas en la integración `dte_cesion` y el certificado de `dte_emision`.
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
  const integrador = integ ? await integradorOctava(ctx, integ.id) : null;
  if (!integ || !integrador) {
    // Sin credenciales queda no disponible; quien llama pide configurar la integración.
    return adaptadorOctava({
      integrador: null,
      cedente: await cedenteOctava(ctx, {}, rutEmisor, false),
      almacen: ALMACEN_VACIO,
      ambiente,
    });
  }
  const almacen = almacenSesionOctava(ctx, integ.id);
  // El certificado solo hace falta para el registro inicial; con la clave de acceso guardada no se toca.
  const necesitaRegistro = (await almacen.leerPassAcceso()) === null;
  const config = (integ.config ?? {}) as ConfigCesion;
  return adaptadorOctava({
    integrador,
    cedente: await cedenteOctava(ctx, config, rutEmisor, necesitaRegistro),
    almacen,
    ambiente,
  });
}
