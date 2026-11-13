import { z } from "zod";

import { porcentajeDe, resumirCobertura } from "@opai/domain";

import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { cargarMes } from "./cargar";
import { mesSchema, PERMISO_READ, hoy } from "./comun";
import { ausenteSinJustificar, diasConTurno, type DiaConTurno, toleranciaAtrasoS } from "./dias-con-turno";

const ORDENES = ["cobertura", "ppc", "ausentismo", "atrasos"] as const;

const filaSchema = z.object({
  instalacionId: z.string(),
  instalacion: z.string(),
  cuenta: z.string(),
  puestos: z.number().int(),
  turnosProgramados: z.number().int(),
  cobertura: z.number().nullable().describe("% de turnos programados cubiertos (0 a 100)."),
  ppc: z.number().int().describe("Turnos que quedaron como puesto por cubrir."),
  refuerzos: z.number().int().describe("Turnos de refuerzo cubiertos sobre la pauta base."),
  diasConTurno: z.number().int().describe("Días con turno ya terminado que cuentan para el ausentismo."),
  ausentismo: z.number().nullable().describe("% de días con turno no trabajados sin justificación; null sin Asistencia o sin días."),
  atrasos: z.number().nullable().describe("% de entradas marcadas fuera de la tolerancia de atraso; null sin Asistencia o sin entradas."),
});

/** Ausentismo y atrasos por instalación desde el consolidado de Asistencia. */
function asistenciaPorInstalacion(dias: readonly DiaConTurno[], toleranciaS: number) {
  const m = new Map<string, { dias: number; ausentes: number; entradas: number; tarde: number }>();
  for (const d of dias) {
    if (!d.instalacionId) continue;
    const c = m.get(d.instalacionId) ?? { dias: 0, ausentes: 0, entradas: 0, tarde: 0 };
    const contra = ausenteSinJustificar(d);
    if (contra !== null) {
      c.dias += 1;
      if (contra) c.ausentes += 1;
    }
    if (d.conEntrada && d.estado !== "ausente") {
      c.entradas += 1;
      if (d.atraso > toleranciaS) c.tarde += 1;
    }
    m.set(d.instalacionId, c);
  }
  return m;
}

export const informeInstalaciones = defineCapability({
  id: "pauta.informes.instalaciones",
  descripcion:
    "Informe de Operaciones por instalación para un mes: cobertura de la pauta, turnos por cubrir (PPC), refuerzos, ausentismo sin justificación y entradas atrasadas (según la tolerancia de la empresa), ordenado por el criterio elegido para comparar instalaciones. Las licencias, vacaciones, permisos y ausencias justificadas no cuentan en el ausentismo.",
  permiso: PERMISO_READ,
  input: mesSchema.extend({
    orden: z.enum(ORDENES).default("ausentismo").describe("Criterio: las peores primero."),
  }),
  output: z.object({ anio: z.number().int(), mes: z.number().int(), conAsistencia: z.boolean(), instalaciones: z.array(filaSchema) }),
  auditarLectura: (s) => s.instalaciones.map((i) => i.instalacionId),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { anio, mes, orden }) {
    const instalaciones = await ctx.db.instalacion.findMany({
      where: { archivadaEn: null, ...dondeInstalacion(ctx) },
      select: { id: true, nombre: true, region: true, cuenta: { select: { nombre: true } } },
    });
    const puestos = await ctx.db.puesto.findMany({
      where: { estado: "activo", instalacionId: { in: instalaciones.map((i) => i.id) }, AND: [dondePuesto(ctx)] },
      select: { id: true, instalacionId: true },
    });
    const m = await cargarMes(ctx, puestos, instalaciones, anio, mes);
    const conAsistencia = ctx.modulosActivos.includes("asistencia") && ctx.autorizar("asistencia:ver");
    let asistencia = new Map<string, { dias: number; ausentes: number; entradas: number; tarde: number }>();
    if (conAsistencia) {
      const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
      const sig = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
      const [toleranciaS, h] = await Promise.all([toleranciaAtrasoS(ctx), hoy(ctx)]);
      const dias = await diasConTurno(ctx, { desde, hasta: sig, corte: h < sig ? h : sig, ahora: new Date() });
      asistencia = asistenciaPorInstalacion(dias, toleranciaS);
    }
    const filas = instalaciones.flatMap((i) => {
      const suyos = puestos.filter((p) => p.instalacionId === i.id);
      if (suyos.length === 0) return [];
      const celdas = suyos.flatMap((p) => m.celdas.get(p.id) ?? []);
      const r = resumirCobertura(celdas);
      const a = asistencia.get(i.id);
      return [{
        instalacionId: i.id,
        instalacion: i.nombre,
        cuenta: i.cuenta.nombre,
        puestos: suyos.length,
        turnosProgramados: r.programados,
        cobertura: porcentajeDe(r.cubiertos, r.programados),
        ppc: r.ppc,
        refuerzos: celdas.filter((c) => c.estado === "cubierto" && c.variante === "refuerzo").length,
        diasConTurno: a?.dias ?? 0,
        ausentismo: a ? porcentajeDe(a.ausentes, a.dias) : null,
        atrasos: a ? porcentajeDe(a.tarde, a.entradas) : null,
      }];
    });
    // Las peores primero; sin dato al final; desempate por nombre.
    const clave = (f: (typeof filas)[number]): number | null =>
      orden === "cobertura" ? (f.cobertura === null ? null : -f.cobertura) : orden === "ppc" ? f.ppc : f[orden];
    filas.sort((x, y) => {
      const a = clave(x);
      const b = clave(y);
      if (a === null || b === null) return a === b ? x.instalacion.localeCompare(y.instalacion) : a === null ? 1 : -1;
      return b - a || x.instalacion.localeCompare(y.instalacion);
    });
    return { anio, mes, conAsistencia, instalaciones: filas };
  },
});
