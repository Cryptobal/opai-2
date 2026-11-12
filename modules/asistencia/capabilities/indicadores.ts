// Indicadores de gestión que Asistencia publica en el catálogo del núcleo (ADR-094, CAR-311). Leen el
// consolidado del día (`asistencia.dias`), los turnos esperados del núcleo y las ausencias registradas en
// la Pauta; nunca las marcas ni su bitácora, y no tocan el reporte para la DT. Se atribuyen a la persona
// del día y cuentan solo turnos ya terminados.
import { diaEnZona, porcentajeDe } from "@opai/domain";
import { ajuste, defineIndicador, type IndicadorGestion, type MedicionIndicador } from "@opai/capabilities";

const aFecha = (dia: string) => new Date(`${dia}T00:00:00Z`);

/**
 * Siglas de ausencia que no cuentan ni a favor ni en contra en el ausentismo (CAR-311): licencias y
 * accidentes, pre y postnatal, vacaciones, permisos autorizados y ausencias justificadas. Cuentan en
 * contra solo la ausencia injustificada (A.I.) y el día con turno sin ninguna marca (S.A. o sin sigla).
 */
export const SIGLAS_NEUTRAS = new Set(["L.M.", "AT", "PREN.", "POSTN", "VAC", "P.G.R.", "P.S.G.R.", "A.J."]);

type Medir = IndicadorGestion["medir"];
type Dia = { personaId: string; fecha: string; estado: string; sigla: string | null; atraso: number; conEntrada: boolean };

/**
 * Días con turno del mes, ya terminados, cuyo turno esperado sigue vigente. Una licencia, vacación o
 * permiso registrado después en la Pauta anula el turno esperado: ese día sale del cálculo aunque el
 * consolidado no se haya recalculado. Un día `sin_marca` cuyo turno ya terminó cuenta como sin marca.
 */
async function diasDelMes(ctx: Parameters<Medir>[0], { rango, zona, ahora, sujetos }: Parameters<Medir>[1]) {
  const hoy = diaEnZona(ahora, zona);
  const hasta = diaEnZona(rango.hasta, zona);
  const desde = diaEnZona(rango.desde, zona);
  const corte = hoy < hasta ? hoy : hasta;
  const personas = sujetos ? { personaId: { in: [...sujetos] } } : {};
  const filas = await ctx.db.dia.findMany({
    where: {
      fecha: { gte: aFecha(desde), lt: aFecha(hasta) },
      turnoEsperadoId: { not: null },
      estado: { in: ["presente", "incompleto", "ausente", "sin_marca"] },
      ...personas,
    },
    select: { personaId: true, fecha: true, estado: true, sigla: true, entrada: true, segundosAtraso: true, turnoEsperadoId: true },
  });
  const turnos = new Map(
    (
      await ctx.db.turnoEsperado.findMany({
        where: { id: { in: filas.flatMap((f) => (f.turnoEsperadoId ? [f.turnoEsperadoId] : [])) }, vigente: true },
        select: { id: true, fin: true },
      })
    ).map((t) => [t.id, t.fin]),
  );
  const dias: Dia[] = [];
  for (const f of filas) {
    const fin = f.turnoEsperadoId ? turnos.get(f.turnoEsperadoId) : undefined;
    if (!fin || fin > ahora) continue;
    const fecha = f.fecha.toISOString().slice(0, 10);
    // Un día con turno que ya terminó y sigue sin marca es un día sin marca (S.A.).
    const estado = f.estado === "sin_marca" ? "ausente" : f.estado;
    dias.push({ personaId: f.personaId, fecha, estado, sigla: f.sigla, atraso: f.segundosAtraso, conEntrada: f.entrada !== null });
  }
  // Ausencias registradas en la Pauta: anulan el turno, pero cuentan en contra (A.I.).
  const ausencias = await ctx.db.excepcionPauta.findMany({
    where: { tipo: "ausencia", estado: "activa", fecha: { gte: aFecha(desde), lt: aFecha(corte) }, ...(sujetos ? { personaId: { in: [...sujetos] } } : { personaId: { not: null } }) },
    select: { personaId: true, fecha: true },
  });
  const vistos = new Set(dias.map((d) => `${d.personaId}:${d.fecha}`));
  for (const a of ausencias) {
    const fecha = a.fecha.toISOString().slice(0, 10);
    if (!a.personaId || vistos.has(`${a.personaId}:${fecha}`)) continue;
    vistos.add(`${a.personaId}:${fecha}`);
    dias.push({ personaId: a.personaId, fecha, estado: "ausente", sigla: "A.I.", atraso: 0, conEntrada: false });
  }
  return dias;
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
      const [dias, tolerancia] = await Promise.all([
        diasDelMes(ctx, consulta),
        ajuste<number>(ctx, "asistencia", "tolerancia_atraso_min"),
      ]);
      const toleranciaS = (tolerancia ?? 15) * 60;
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
          if (d.estado !== "ausente") return [0, 1];
          if (d.sigla && SIGLAS_NEUTRAS.has(d.sigla)) return [0, 0];
          return [1, 1];
        },
      );
    },
  }),
];
