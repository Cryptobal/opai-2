// Indicadores de gestión que Asistencia publica en el catálogo del núcleo (ADR-094, CAR-311). Solo leen
// el consolidado del día (`asistencia.dias`), nunca las marcas ni su bitácora, y no tocan el reporte
// para la DT. Se atribuyen a la persona del día y cuentan solo días ya terminados.
import { diaEnZona, porcentajeDe } from "@opai/domain";
import { defineIndicador, type IndicadorGestion, type MedicionIndicador } from "@opai/capabilities";

const aFecha = (dia: string) => new Date(`${dia}T00:00:00Z`);

/**
 * Siglas de ausencia que no cuentan ni a favor ni en contra en el ausentismo (CAR-311): licencias y
 * accidentes, pre y postnatal, vacaciones, permisos autorizados y ausencias justificadas. Cuentan en
 * contra solo la ausencia injustificada (A.I.) y el día con turno sin ninguna marca (S.A. o sin sigla).
 */
export const SIGLAS_NEUTRAS = new Set(["L.M.", "AT", "PREN.", "POSTN", "VAC", "P.G.R.", "P.S.G.R.", "A.J."]);

/** Días del mes ya terminados (antes de hoy), con turno o con alguna marca. */
async function diasDelMes(
  ctx: Parameters<IndicadorGestion["medir"]>[0],
  { rango, zona, ahora, sujetos }: Parameters<IndicadorGestion["medir"]>[1],
) {
  const hoy = diaEnZona(ahora, zona);
  const hasta = diaEnZona(rango.hasta, zona);
  return ctx.db.dia.findMany({
    where: {
      fecha: { gte: aFecha(diaEnZona(rango.desde, zona)), lt: aFecha(hoy < hasta ? hoy : hasta) },
      estado: { in: ["presente", "incompleto", "ausente"] },
      ...(sujetos ? { personaId: { in: [...sujetos] } } : {}),
    },
    select: { personaId: true, estado: true, sigla: true, entrada: true, segundosAtraso: true },
  });
}

function porPersona<T>(filas: readonly T[], clave: (f: T) => string, suma: (f: T) => [number, number]) {
  const cuenta = new Map<string, [number, number]>();
  for (const f of filas) {
    const [parte, total] = suma(f);
    if (total === 0) continue;
    const c = cuenta.get(clave(f)) ?? [0, 0];
    cuenta.set(clave(f), [c[0] + parte, c[1] + total]);
  }
  return [...cuenta].map(([sujetoId, [p, t]]): MedicionIndicador => ({ sujetoId, valor: porcentajeDe(p, t) }));
}

export const indicadoresAsistencia: readonly IndicadorGestion[] = [
  defineIndicador({
    id: "asistencia.marcas_a_la_hora",
    nombre: "Marcas a la hora",
    descripcion:
      "De los días del mes en que marcó entrada, qué porcentaje la marcó sin atraso respecto del inicio de su turno.",
    tipo: "oportunidad",
    unidad: "porcentaje",
    sentido: "mayor",
    sujeto: "persona",
    metaSugerida: 95,
    origen: "consolidado diario de asistencia: hora de entrada y atraso",
    permiso: "asistencia:ver",
    async medir(ctx, consulta) {
      const dias = await diasDelMes(ctx, consulta);
      return porPersona(
        dias.filter((d) => d.entrada !== null),
        (d) => d.personaId,
        (d) => [d.segundosAtraso === 0 ? 1 : 0, 1],
      );
    },
  }),
  defineIndicador({
    id: "asistencia.ausentismo",
    nombre: "Ausentismo",
    descripcion:
      "De los días con turno del mes, qué porcentaje no se trabajó sin justificación (ausencia injustificada o sin ninguna marca). Las licencias médicas, vacaciones, pre y postnatal, accidentes del trabajo, permisos y ausencias justificadas no cuentan.",
    tipo: "resultado",
    unidad: "porcentaje",
    sentido: "menor",
    sujeto: "persona",
    metaSugerida: 3,
    origen: "consolidado diario de asistencia: estado del día y sigla de la ausencia",
    permiso: "asistencia:ver",
    async medir(ctx, consulta) {
      const dias = await diasDelMes(ctx, consulta);
      return porPersona(
        dias,
        (d) => d.personaId,
        (d) => {
          if (d.estado !== "ausente") return [0, 1];
          if (d.sigla && SIGLAS_NEUTRAS.has(d.sigla)) return [0, 0];
          return [1, 1];
        },
      );
    },
  }),
];
