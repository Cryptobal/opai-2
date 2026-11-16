import type { Contexto } from "@opai/capabilities";
import {
  htmlResumenEconomico,
  htmlTablaServicio,
  soloAutorizados,
  valoresCotizacion,
  valoresEmpresa,
  valoresNegocio,
  valoresPuesto,
  type FilaPuestoCotizacion,
  type ValorCampo,
} from "@opai/domain";
import { IVA_PCT } from "@opai/domain/dinero";

import { totalesDocumento } from "../domain/documento/totales";
import { servicioDesdeFilas } from "./propuesta-tecnica";
import { entradaPdfDesdeCotizacion } from "./entrada-pdf-cotizacion";
import { cargarFilasVersion, packServicioCotizacion } from "./recalcular";
import { mesesContrato } from "./version";
import { tasaIvaVentaTenant } from "./tasa-iva-tenant";

type Registro = Record<string, string | number | boolean | null>;

function serializar(reg: Record<string, ValorCampo>): Registro {
  return Object.fromEntries(
    Object.entries(reg).map(([k, x]) => [k, x instanceof Date ? x.toISOString().slice(0, 10) : (x ?? null)]),
  );
}

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
  const [tenant, perfil] = await Promise.all([
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
  ]);
  const entrada = await entradaPdfDesdeCotizacion(ctx, cotizacionId, { enviada });
  const ventaPorLinea = new Map<string, number | null>();
  for (const s of entrada?.secciones ?? []) {
    for (const l of s.lineas) ventaPorLinea.set(`${s.nombre}\0${l.nombre}`, l.ventaMensualClp);
  }

  const version = pack?.version;
  const valida = version?.validaHasta?.toISOString().slice(0, 10) ?? entrada?.validaHasta ?? null;
  const meses = version?.mesesContrato ?? (version?.validaHasta ? mesesContrato(version.validaHasta) : null);
  const envio = version?.enviadaEn?.toISOString().slice(0, 10) ?? null;
  const venta = entrada?.calculo.ventaMensual ?? null;

  const extraRaw: Record<string, ValorCampo> = {
    ...valoresEmpresa({
      nombreComercial: tenant?.nombre ?? null,
      razonSocial: perfil?.razonSocial ?? null,
      rut: perfil?.rut ?? null,
      giro: perfil?.giro ?? null,
      correoComercial: perfil?.correoComercial ?? null,
      telefono: perfil?.telefono ?? null,
      sitioWeb: perfil?.sitioWeb ?? null,
    }),
    ...(neg ? valoresNegocio(neg) : {}),
    ...valoresCotizacion({
      codigo: cot.codigo,
      titulo: cot.titulo,
      versionNumero: version?.numero ?? 1,
      validaHasta: valida,
      ventaMensual: venta,
      mesesContrato: meses,
      fechaEnvio: envio,
    }),
  };

  const puestos: FilaPuestoCotizacion[] = [];
  const servicio = pack ? servicioDesdeFilas(packServicioCotizacion(pack.cot, pack)) : null;
  for (const s of servicio?.secciones ?? []) {
    for (const p of s.puestos) {
      puestos.push({
        nombre: p.nombre,
        posiciones: p.posiciones,
        patron: p.patron,
        horaInicio: p.horaInicio,
        horaFin: p.horaFin,
        diasCobertura: p.diasCobertura,
        ventaMensualClp: ventaPorLinea.get(`${s.nombre}\0${p.nombre}`) ?? null,
        seccion: s.nombre,
      });
    }
  }

  const tasa = await tasaIvaVentaTenant(ctx);
  const tot = venta != null ? totalesDocumento(venta, tasa ?? IVA_PCT, 0) : null;
  if (permitidas.has("bloque.tabla_servicio") || permitidas.has("tabla_servicio")) {
    extraRaw["bloque.tabla_servicio"] = htmlTablaServicio(puestos);
  }
  if (permitidas.has("bloque.resumen_economico") || permitidas.has("resumen_economico")) {
    extraRaw["bloque.resumen_economico"] = htmlResumenEconomico({
      netoMensualClp: venta,
      ivaClp: tot?.ivaClp ?? null,
      totalMensualClp: tot?.totalClp ?? null,
      mesesContrato: meses,
    });
  }

  return {
    campos: serializar(soloAutorizados(extraRaw, permitidas)),
    puestos: puestos.map((p) => serializar(soloAutorizados(valoresPuesto(p), permitidas))),
  };
}