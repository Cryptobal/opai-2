import type { Contexto } from "@opai/capabilities";
import { soloAutorizados, type ValorCampo } from "@opai/domain";

import { entradaPdfDesdeCotizacion } from "./entrada-pdf-cotizacion";
import { cargarFilasVersion } from "./recalcular";
import { tasaIvaVentaTenant } from "./tasa-iva-tenant";
import { escalaresCamposCotizacion } from "./campos-extra-escalares";
import {
  bloquesHtmlCotizacion,
  filasPuestosCotizacion,
  puestosSerializados,
  serializarCampos,
} from "./campos-extra-puestos";

type Registro = Record<string, string | number | boolean | null>;

export async function extrasCamposCotizacion(
  ctx: Contexto,
  cotizacionId: string,
  permitidas: ReadonlySet<string>,
  enviada?: boolean,
): Promise<{ campos: Registro; puestos: Registro[] }> {
  const cot = await ctx.db.cpqCotizacion.findFirst({
    where: { id: cotizacionId, tenantId: ctx.tenantId },
    select: { id: true, codigo: true, titulo: true, negocioId: true },
  });
  if (!cot) throw new Error("COTIZACION_NO_ENCONTRADA");

  const pack = await cargarFilasVersion(ctx, cotizacionId, undefined, false);
  const neg = await ctx.db.negocio.findFirst({
    where: { id: cot.negocioId, tenantId: ctx.tenantId },
    select: { titulo: true, inicioServicioEstimado: true, cierreEstimado: true },
  });
  const [tenant, perfil, entrada] = await Promise.all([
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
    entradaPdfDesdeCotizacion(ctx, cotizacionId, enviada === undefined ? {} : { enviada }),
  ]);

  const { campos: escalares, venta, meses } = escalaresCamposCotizacion(
    tenant?.nombre,
    perfil,
    neg,
    cot,
    pack,
    entrada,
  );
  const filas = filasPuestosCotizacion(pack, entrada);
  const tasa = await tasaIvaVentaTenant(ctx);
  const extraRaw: Record<string, ValorCampo> = {
    ...escalares,
    ...bloquesHtmlCotizacion(permitidas, filas, venta, meses, tasa),
  };

  return {
    campos: serializarCampos(soloAutorizados(extraRaw, permitidas)),
    puestos: puestosSerializados(filas, permitidas),
  };
}