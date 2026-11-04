import { type Contexto, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

/** «4x4», «4×4», «4 X 4» → «4x4», para casar el patrón de la línea con el catálogo del tenant. */
export const normalizarPatron = (p: string) => p.toLowerCase().replace(/×/g, "x").replace(/\s/g, "");

export type LineaOferta = {
  lineaId: string;
  linea: string;
  cargoId: string | null;
  cargo: string | null;
  instalacionId: string | null;
  instalacion: string | null;
  posiciones: number;
  creados: number;
  patron: string | null;
  patronId: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  sueldoBaseClp: number | null;
  sueldoOrigen: string | null;
};

/**
 * Oferta de puestos de una cotización aceptada (R2): una fila por línea de guardias habilitada de la
 * versión aceptada, con lo ya creado. Sin versión aceptada no hay oferta (R45: se acepta al ganar).
 */
export async function cargarOferta(ctx: Contexto, cotizacionId: string) {
  const cot = await ctx.db.cpqCotizacion.findFirst({ where: { id: cotizacionId } });
  if (!cot) throw noEncontrado("La cotización");
  const version = await ctx.db.cpqVersion.findFirst({
    where: { cotizacionId, estado: "aceptada" },
    orderBy: { numero: "desc" },
    select: { id: true, numero: true },
  });
  if (!version) throw reglaDeNegocio("La cotización aún no está aceptada: se ofrecen puestos al ganar el negocio.");
  const secciones = await ctx.db.cpqSeccion.findMany({
    where: { versionId: version.id },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    include: {
      lineas: { where: { tipo: "puesto", habilitada: true }, orderBy: [{ orden: "asc" }, { id: "asc" }] },
    },
  });
  const lineas = secciones.flatMap((s) => s.lineas.map((l) => ({ l, s })));
  const [instalaciones, cargos, patrones, creados] = await Promise.all([
    ctx.db.instalacion.findMany({
      where: { id: { in: secciones.flatMap((s) => (s.instalacionId ? [s.instalacionId] : [])) } },
      select: { id: true, nombre: true },
    }),
    ctx.db.cargo.findMany({
      where: { id: { in: lineas.flatMap(({ l }) => (l.cargoId ? [l.cargoId] : [])) } },
      select: { id: true, nombre: true },
    }),
    ctx.db.patronTurno.findMany({ where: { activo: true }, select: { id: true, nombre: true } }),
    ctx.db.cpqPuestoCreado.groupBy({
      by: ["lineaId"],
      where: { lineaId: { in: lineas.map(({ l }) => l.id) } },
      _count: { _all: true },
    }),
  ]);
  const hechos = new Map(creados.map((c) => [c.lineaId, c._count._all]));
  const items: LineaOferta[] = lineas.map(({ l, s }) => ({
    lineaId: l.id,
    linea: l.nombre,
    cargoId: l.cargoId,
    cargo: cargos.find((c) => c.id === l.cargoId)?.nombre ?? null,
    instalacionId: s.instalacionId,
    instalacion: instalaciones.find((i) => i.id === s.instalacionId)?.nombre ?? null,
    posiciones: l.posiciones,
    creados: hechos.get(l.id) ?? 0,
    patron: l.patron,
    patronId: l.patron
      ? (patrones.find((p) => normalizarPatron(p.nombre) === normalizarPatron(l.patron!))?.id ?? null)
      : null,
    horaInicio: l.horaInicio,
    horaFin: l.horaFin,
    sueldoBaseClp: l.sueldoBaseClp,
    sueldoOrigen: l.sueldoOrigen,
  }));
  return { cotizacion: cot, versionId: version.id, items };
}
