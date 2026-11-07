 
import type { Contexto } from "@opai/capabilities";

import type { ResultadoCalculo } from "../domain/motor";
import { calculoVigente } from "./calculo-vigente";
import { type EntradaPdfCotizacion, type LineaPdfCotizacion } from "./documento-pdf";
import { cargarFilasVersion } from "./recalcular";
import { tasaIvaVentaTenant } from "./tasa-iva-tenant";

export { entradaPdfConBorradorMarca, entradaPdfMuestra } from "./entrada-pdf-muestra";

export async function entradaPdfDesdeCotizacion(
  ctx: Contexto,
  cotizacionId: string,
  opts?: { enviada?: boolean },
): Promise<EntradaPdfCotizacion | null> {
  const c = await ctx.db.cpqCotizacion.findFirst({
    where: { id: cotizacionId, tenantId: ctx.tenantId },
    select: {
      id: true,
      codigo: true,
      titulo: true,
      negocioId: true,
      creadoPorId: true,
    },
  });
  if (!c) return null;
  const pack = await cargarFilasVersion(ctx, cotizacionId, undefined, false);
  if (!pack) return null;
  const { version, secciones, lineas } = pack;
  const resultado = await calculoVigente(ctx, cotizacionId, version, lineas);
  if (!resultado) return null;

  const neg = await ctx.db.negocio.findFirst({
    where: { id: c.negocioId, tenantId: ctx.tenantId },
    select: {
      titulo: true,
      cuentaId: true,
      responsableId: true,
    },
  });
  const cuenta =
    neg?.cuentaId != null
      ? await ctx.db.cuenta.findFirst({
          where: { id: neg.cuentaId, tenantId: ctx.tenantId },
          select: {
            nombre: true,
            razonSocial: true,
            rut: true,
            giro: true,
            calle: true,
            comuna: true,
            ciudad: true,
            region: true,
          },
        })
      : null;
  const ejecutivo = neg?.responsableId
    ? await ctx.db.user.findFirst({
        where: { id: neg.responsableId },
        select: { name: true },
      })
    : null;

  const ventaPorLinea =
    opts?.enviada || ctx.autorizar("cpq:costos.ver")
      ? mapVentaLineas(
          resultado,
          lineas.map((l) => l.id),
        )
      : new Map<string, number>();
  const seccionesVista = secciones.map((s) => ({
    nombre: s.nombre,
    lineas: lineas
      .filter((l) => l.seccionId === s.id)
      .map((l): LineaPdfCotizacion => ({
        nombre: l.nombre,
        tipo: l.tipo,
        posiciones: l.posiciones,
        ventaMensualClp: ventaPorLinea.get(l.id) ?? null,
      })),
  }));

  const dirCli = [cuenta?.calle, cuenta?.comuna, cuenta?.ciudad ?? cuenta?.region]
    .filter(Boolean)
    .join(", ");

  const venta = resultado.ventaMensual;
  const borradorSinPrecio = venta == null;

  return {
    codigo: c.codigo,
    titulo: c.titulo,
    negocio: neg?.titulo ?? "",
    versionNumero: version.numero,
    secciones: seccionesVista,
    calculo: {
      ventaMensual: venta,
      fecha: resultado.fecha,
      pagosUnicos: resultado.pagosUnicos,
      borradorSinPrecio,
      uf: resultado.uf,
      tasaIvaPct: await tasaIvaVentaTenant(ctx),
    },
    validaHasta: version.validaHasta?.toISOString().slice(0, 10) ?? null,
    cliente: cuenta
      ? {
          nombre: cuenta.nombre,
          razonSocial: cuenta.razonSocial,
          rut: cuenta.rut,
          giro: cuenta.giro,
          direccion: dirCli || null,
        }
      : null,
    ejecutivo: ejecutivo?.name ?? null,
    enviada: opts?.enviada ?? version.estado === "enviada",
    condiciones: null,
  };
}

/** Venta por línea (reparto por costo) cuya suma es exactamente la venta mensual: el resto va a la línea mayor. */
export function mapVentaLineas(r: ResultadoCalculo, idsDb: string[]): Map<string, number> {
  const m = new Map<string, number>();
  const totalCosto = r.lineas.reduce((s, l) => s + l.costoMensual, 0);
  if (r.ventaMensual != null && totalCosto > 0) {
    for (const l of r.lineas)
      m.set(l.id, Math.round((l.costoMensual / totalCosto) * r.ventaMensual));
    const resto = r.ventaMensual - [...m.values()].reduce((a, v) => a + v, 0);
    const mayor = r.lineas.reduce(
      (a, l) => (l.costoMensual > (a?.costoMensual ?? -1) ? l : a),
      r.lineas[0],
    );
    if (resto !== 0 && mayor) m.set(mayor.id, (m.get(mayor.id) ?? 0) + resto);
    return m;
  }
  for (const l of r.lineas) {
    const v = l.ventaAdicional + l.ventaUnica;
    if (v > 0) m.set(l.id, v);
  }
  for (const id of idsDb) {
    if (!m.has(id)) m.set(id, 0);
  }
  return m;
}
