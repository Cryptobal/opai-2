// Indicadores de gestión que Asistencia publica en el catálogo del núcleo (ADR-094, CAR-311). Los días
// con turno salen de `diasConTurno` (compartido con el informe de Operaciones por instalación); se
// atribuyen a la persona del día y cuentan solo turnos ya terminados.
import { diaEnZona, porcentajeDe } from "@opai/domain";
import {
  ausenteSinJustificar,
  defineIndicador,
  diasConTurno,
  type IndicadorGestion,
  type MedicionIndicador,
  toleranciaAtrasoS,
} from "@opai/capabilities";

type Medir = IndicadorGestion["medir"];

/** Días con turno del mes ya terminados (vigentes), más las ausencias registradas en la Pauta. */
function diasDelMes(ctx: Parameters<Medir>[0], { rango, zona, ahora, sujetos }: Parameters<Medir>[1]) {
  const hoy = diaEnZona(ahora, zona);
  const hasta = diaEnZona(rango.hasta, zona);
  return diasConTurno(ctx, { desde: diaEnZona(rango.desde, zona), hasta, corte: hoy < hasta ? hoy : hasta, ahora, personas: sujetos });
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
      "De los días del mes en que marcó entrada, qué porcentaje la marcó a la hora: dentro de la tolerancia de atraso de la empresa (15 minutos por defecto) desde el inicio de su turno.",
    tipo: "oportunidad",
    unidad: "porcentaje",
    sentido: "mayor",
    sujeto: "persona",
    metaSugerida: 95,
    origen: "consolidado diario de asistencia: hora de entrada y atraso",
    permiso: "asistencia:ver",
    async medir(ctx, consulta) {
      const [dias, toleranciaS] = await Promise.all([diasDelMes(ctx, consulta), toleranciaAtrasoS(ctx)]);
      return porPersona(
        dias.filter((d) => d.conEntrada && d.estado !== "ausente"),
        (d) => d.personaId,
        (d) => [d.atraso <= toleranciaS ? 1 : 0, 1],
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
          const contra = ausenteSinJustificar(d);
          return contra === null ? [0, 0] : [contra ? 1 : 0, 1];
        },
      );
    },
  }),
];
