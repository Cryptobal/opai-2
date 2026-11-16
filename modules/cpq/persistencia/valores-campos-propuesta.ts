import {
  noEncontrado,
  resolverCamposDocumento,
  type Contexto,
  type EntradaValoresCampos,
  type ValoresCamposResueltos,
} from "@opai/capabilities";
import { clasificarCampos } from "@opai/domain";

import { extrasCamposCotizacion } from "./campos-extra-cotizacion";

export type EntradaValoresPropuesta = EntradaValoresCampos & {
  cotizacionId: string;
  enviada?: boolean;
};

/** `resolverCamposDocumento` más empresa, negocio, cotización, puestos y bloques HTML (CAR-571). */
export async function resolverCamposPropuesta(ctx: Contexto, input: EntradaValoresPropuesta) {
  const permitidas = new Set(clasificarCampos(input.finalidad, (p) => ctx.autorizar(p)).autorizados.map((c) => c.clave));
  const base = await resolverCamposDocumento(ctx, input);

  const existe = await ctx.db.cpqCotizacion.findFirst({
    where: { id: input.cotizacionId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!existe) throw noEncontrado("La cotización");

  const extra = await extrasCamposCotizacion(ctx, input.cotizacionId, permitidas, input.enviada);
  return {
    ...base,
    campos: { ...base.campos, ...extra.campos },
    colecciones: { ...base.colecciones, puestos: extra.puestos },
  } as ValoresCamposResueltos & {
    colecciones: ValoresCamposResueltos["colecciones"] & { puestos: typeof extra.puestos };
  };
}