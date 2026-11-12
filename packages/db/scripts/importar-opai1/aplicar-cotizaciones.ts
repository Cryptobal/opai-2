// Carga de cotizaciones de OPAI 1 (CAR-326). Carga histórica: cada una entra como una cotización con
// una sola versión (la que tenía en 1.0), con su estado, su venta mensual y sus puestos. No dispara
// aprobaciones, correlativos ni el motor de cálculo.
import type { TenantTx } from "../../src/transaccion";
import type { Decision } from "./comun";
import type { DatosCotizacion } from "./cotizaciones-tipos";
import type { Registro } from "./registro";

const fecha = (v: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function aplicarCotizaciones(
  tx: TenantTx,
  tenantId: string,
  decisiones: readonly Decision<DatosCotizacion>[],
  negocios: ReadonlyMap<string, string>,
  instalaciones: ReadonlyMap<string, string>,
  creadoPorId: string | null,
  reg: Registro,
  anotar: (idOpai1: string, destinoId: string, metodo: "creado" | "sinCambio") => Promise<void>,
): Promise<{ creadas: number; omitidas: number }> {
  let creadas = 0;
  let omitidas = 0;
  const omitir = async (id: string, motivo: string) => {
    await reg.omitido("cotizacion", id, motivo);
    omitidas += 1;
  };
  for (const d of decisiones) {
    if (d.accion === "sin_cambios" && d.destinoId) {
      await anotar(d.idOpai1, d.destinoId, "sinCambio");
      continue;
    }
    if (d.accion !== "crear" || !d.datos) {
      await omitir(d.idOpai1, d.motivo ?? d.accion);
      continue;
    }
    const q = d.datos;
    const negocioId = negocios.get(q.negocioIdOpai1);
    if (!negocioId) {
      await omitir(d.idOpai1, "negocio_no_importado");
      continue;
    }
    if (!creadoPorId) {
      await omitir(d.idOpai1, "sin_responsable");
      continue;
    }
    const existe = await tx.cpqCotizacion.findFirst({ where: { codigo: q.codigo }, select: { id: true } });
    if (existe) {
      await omitir(d.idOpai1, "codigo_ya_existe");
      continue;
    }
    const instalacionId = q.instalacionIdOpai1 ? (instalaciones.get(q.instalacionIdOpai1) ?? null) : null;
    const vigenteLibre =
      q.vigente && !(await tx.cpqCotizacion.findFirst({ where: { negocioId, vigente: true }, select: { id: true } }));
    const c = await tx.cpqCotizacion.create({
      data: { tenantId, codigo: q.codigo, negocioId, titulo: q.titulo, vigente: vigenteLibre, creadoPorId },
      select: { id: true },
    });
    const v = await tx.cpqVersion.create({
      data: {
        tenantId,
        cotizacionId: c.id,
        numero: 1,
        estado: q.estado,
        moneda: q.moneda,
        validaHasta: fecha(q.validaHasta),
        margenModo: q.margenModo,
        ventaMensualClp: q.ventaMensualClp,
        mesesContrato: q.meses,
        enviadaEn: fecha(q.enviadaEn),
        creadoPorId,
      },
      select: { id: true },
    });
    const inst = instalacionId
      ? await tx.instalacion.findFirst({ where: { id: instalacionId }, select: { nombre: true } })
      : null;
    const s = await tx.cpqSeccion.create({
      data: { tenantId, versionId: v.id, instalacionId, nombre: inst?.nombre ?? "Común", orden: 0 },
      select: { id: true },
    });
    if (q.lineas.length > 0)
      await tx.cpqLinea.createMany({
        data: q.lineas.map((l) => ({
          tenantId,
          seccionId: s.id,
          tipo: "puesto",
          grupo: l.grupo,
          nombre: l.nombre,
          posiciones: l.posiciones,
          orden: l.orden,
          horaInicio: l.horaInicio,
          horaFin: l.horaFin,
          diasSemana: l.diasSemana,
          diasCobertura: l.diasSemana.length > 0 ? l.diasSemana.length : null,
          sueldoBaseClp: l.sueldoBaseClp,
          sueldoOrigen: l.sueldoBaseClp ? "manual" : null,
          afp: l.afp,
          saludTipo: l.saludTipo,
        })),
      });
    await anotar(d.idOpai1, c.id, "creado");
    creadas += 1;
  }
  return { creadas, omitidas };
}
