import type { TenantTx } from "@opai/db";
import type { Contexto } from "@opai/capabilities";

type FilaVersion = NonNullable<Awaited<ReturnType<Contexto["db"]["cpqVersion"]["findFirst"]>>>;

export async function copiarSeccionesYLineas(
  tx: TenantTx,
  tenantId: string,
  origenVersionId: string,
  destinoVersionId: string,
) {
  const nuevaLinea = new Map<string, string>();
  const secciones = await tx.cpqSeccion.findMany({
    where: { versionId: origenVersionId },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
  });
  for (const s of secciones) {
    const nueva = await tx.cpqSeccion.create({
      data: {
        tenantId,
        versionId: destinoVersionId,
        instalacionId: s.instalacionId,
        nombre: s.nombre,
        margenPct: s.margenPct,
        orden: s.orden,
      },
    });
    const lineas = await tx.cpqLinea.findMany({
      where: { seccionId: s.id },
      orderBy: [{ orden: "asc" }, { id: "asc" }],
    });
    for (const l of lineas) {
      const copia = await tx.cpqLinea.create({
        data: {
          tenantId,
          seccionId: nueva.id,
          tipo: l.tipo,
          grupo: l.grupo,
          nombre: l.nombre,
          posiciones: l.posiciones,
          recurrencia: l.recurrencia,
          habilitada: l.habilitada,
          visibleCliente: l.visibleCliente,
          orden: l.orden,
          patron: l.patron,
          horaInicio: l.horaInicio,
          horaFin: l.horaFin,
          diasCobertura: l.diasCobertura,
          personasPorPosicionEscaladas: l.personasPorPosicionEscaladas,
          personasMotivo: l.personasMotivo,
          sueldoBaseClp: l.sueldoBaseClp,
          itemCodigo: l.itemCodigo,
          cantidadEscalada: l.cantidadEscalada,
          rateoJson: l.rateoJson,
          precioUnitarioClp: null,
          margenPropioPct: l.margenPropioPct,
          alcanceDotacion: l.alcanceDotacion,
          huellaJuegoValores: l.huellaJuegoValores,
          cargoId: l.cargoId,
          diasSemana: l.diasSemana,
          sueldoOrigen: l.sueldoOrigen,
          sueldoModo: l.sueldoModo,
          liquidoObjetivoClp: l.liquidoObjetivoClp,
          colacionClp: l.colacionClp,
          movilizacionClp: l.movilizacionClp,
          afp: l.afp,
          saludTipo: l.saludTipo,
          saludPlanUf: l.saludPlanUf,
          tipoContrato: l.tipoContrato,
        },
      });
      nuevaLinea.set(l.id, copia.id);
    }
  }
  // Costos manuales por categoría (CAR-162): los de puesto siguen al puesto copiado.
  const costos = await tx.cpqCostoCategoria.findMany({
    where: { versionId: origenVersionId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  for (const c of costos) {
    const lineaId = c.lineaId ? nuevaLinea.get(c.lineaId) : null;
    if (c.lineaId && !lineaId) continue;
    await tx.cpqCostoCategoria.create({
      data: { tenantId, versionId: destinoVersionId, lineaId: lineaId ?? null, categoria: c.categoria, montoClp: c.montoClp },
    });
  }
}

export function datosVersionDesde(origen: FilaVersion, cotizacionId: string, numero: number, creadoPorId: string) {
  return {
    tenantId: origen.tenantId,
    cotizacionId,
    numero,
    estado: "borrador" as const,
    moneda: origen.moneda,
    validaHasta: origen.validaHasta,
    margenModo: origen.margenModo,
    margenObjetivoPct: origen.margenObjetivoPct,
    instrumentosJson: origen.instrumentosJson,
    mesesContrato: origen.mesesContrato,
    ventaMensualClp: null,
    enviadaEn: null,
    calculoCongeladoJson: null,
    revision: 1,
    creadoPorId,
  };
}
