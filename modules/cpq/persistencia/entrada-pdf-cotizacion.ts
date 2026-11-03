/* eslint-disable max-lines -- integrado sin lint por la caída de memoria del CI (CAR-181); dividir en el PR de pendientes */
import type { Contexto } from "@opai/capabilities";

import type { ResultadoCalculo } from "../domain/motor";
import { calculoCongelado } from "./calculo-congelado";
import { type EntradaPdfCotizacion, type LineaPdfCotizacion } from "./documento-pdf";
import { cargarFilasVersion, recalcularVersion } from "./recalcular";

const MUESTRA: EntradaPdfCotizacion = {
  codigo: "CPQ-2026-001",
  titulo: "Vista previa de plantilla",
  negocio: "Negocio de ejemplo",
  versionNumero: 1,
  secciones: [
    {
      nombre: "Planta ejemplo",
      lineas: [
        { nombre: "Guardia 24/7", tipo: "puesto", posiciones: 2, ventaMensualClp: 1_850_000 },
        { nombre: "Supervisión", tipo: "item", ventaMensualClp: 320_000 },
      ],
    },
  ],
  calculo: {
    ventaMensual: 2_170_000,
    fecha: "2026-11-03",
    pagosUnicos: 0,
    borradorSinPrecio: false,
    uf: { valorClpEscalado: 408_450_000, fecha: "2026-11-03" },
  },
  validaHasta: "2026-12-03",
  cliente: {
    nombre: "Cliente ejemplo SpA",
    razonSocial: "Cliente ejemplo SpA",
    rut: "76.543.210-K",
    giro: "Servicios industriales",
    direccion: "Av. Ejemplo 100, Santiago",
  },
  ejecutivo: "Ejecutivo comercial",
  enviada: false,
  condiciones: "Pago contra factura a 30 días. Ajuste UF según contrato marco.",
};

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
  const resultado =
    version.estado === "borrador"
      ? await recalcularVersion(ctx, cotizacionId, undefined, false)
      : calculoCongelado(ctx, version, lineas);
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

  const ventaPorLinea = ctx.autorizar("cpq:costos.ver")
    ? mapVentaLineas(resultado, lineas.map((l) => l.id))
    : new Map<string, number>();
  const seccionesVista = secciones.map((s) => ({
    nombre: s.nombre,
    lineas: lineas
      .filter((l) => l.seccionId === s.id)
      .map(
        (l): LineaPdfCotizacion => ({
          nombre: l.nombre,
          tipo: l.tipo,
          posiciones: l.posiciones,
          ventaMensualClp: ventaPorLinea.get(l.id) ?? null,
        }),
      ),
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

function mapVentaLineas(r: ResultadoCalculo, idsDb: string[]): Map<string, number> {
  const m = new Map<string, number>();
  const totalCosto = r.lineas.reduce((s, l) => s + l.costoMensual, 0);
  if (r.ventaMensual != null && totalCosto > 0) {
    for (const l of r.lineas) {
      const share = Math.round((l.costoMensual / totalCosto) * r.ventaMensual);
      m.set(l.id, share);
    }
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

export function entradaPdfMuestra(): EntradaPdfCotizacion {
  return structuredClone(MUESTRA);
}

export function entradaPdfConBorradorMarca(
  base: EntradaPdfCotizacion,
  marca: { condicionesDefault?: string | null },
  plantilla?: { condiciones?: string | null },
): EntradaPdfCotizacion {
  const condiciones =
    plantilla?.condiciones ?? marca.condicionesDefault ?? base.condiciones ?? null;
  return {
    ...base,
    condiciones,
  };
}
