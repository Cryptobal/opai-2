import { z } from "zod";

import { resumirCobertura } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { noEncontrado } from "../errores";
import { candidatosDeInstalacion } from "./candidatos";
import { cargarMes } from "./cargar";
import { PERMISO_READ, hoy, mesSchema } from "./comun";
import { nombresDePersonas, vistaSerie } from "./nombres";
import { celdaSchema, resumenSchema, serieVistaSchema } from "./vistas";

const puestoMesSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  funcion: z.string().nullable(),
  /** "08:00–20:00" (el tramo principal del puesto). */
  horario: z.string(),
  jornada: z.string(),
  serie: serieVistaSchema.nullable(),
  celdas: z.array(celdaSchema),
  resumen: resumenSchema,
});

export const mesSalidaSchema = z.object({
  instalacionId: z.string(),
  instalacion: z.string(),
  anio: z.number().int(),
  mes: z.number().int(),
  hoy: z.string(),
  feriados: z.array(z.object({ fecha: z.string(), nombre: z.string() })),
  personas: z.array(z.object({ id: z.string(), nombre: z.string() })),
  puestos: z.array(puestoMesSchema),
  resumen: resumenSchema,
  /** Patrones activos del catálogo, para elegir al fijar una serie. */
  patrones: z.array(z.object({ id: z.string(), nombre: z.string(), ciclo: z.string() })),
  /** Personas con vínculo vigente en la instalación: los titulares que se pueden elegir. */
  candidatos: z.array(z.object({ id: z.string(), nombre: z.string() })),
});

/** Pauta mensual de una instalación: puestos × días, calculada desde las series y excepciones. */
export const mesLeer = defineCapability({
  id: "pauta.mes.leer",
  descripcion:
    "Pauta mensual de una instalación: por cada puesto, su serie (patrón, inicio de ciclo y titular) y el estado de cada día (cubierto, libre o puesto por cubrir con su motivo), con los feriados marcados y el resumen de cobertura.",
  permiso: PERMISO_READ,
  input: z.object({ instalacionId: uuidSchema }).extend(mesSchema.shape),
  output: mesSalidaSchema,
  auditarLectura: (s) => [...new Set([...s.personas, ...s.candidatos].map((p) => p.id))],
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    // La instalación se acota con el mismo alcance que sus puestos (ADR-022): fuera de alcance
    // responde como inexistente, sin revelar que existe.
    const inst = await ctx.db.instalacion.findFirst({
      // `id` y el alcance van en `AND`: un spread pisaría el id pedido y mostraría otra instalación.
      where: { id: input.instalacionId, AND: [dondeInstalacion(ctx)] },
      select: { id: true, nombre: true, region: true },
    });
    if (!inst) throw noEncontrado("La instalación");
    const puestos = await ctx.db.puesto.findMany({
      where: { instalacionId: inst.id, estado: "activo", AND: [dondePuesto(ctx)] },
      include: { funcion: { select: { nombre: true } } },
      orderBy: [{ nombre: "asc" }, { horaInicio: "asc" }],
    });
    const m = await cargarMes(ctx, puestos, [inst], input.anio, input.mes);
    const [patrones, candidatos] = await Promise.all([
      ctx.db.patronTurno.findMany({
        where: { activo: true },
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        select: { id: true, nombre: true, clase: true, diasTrabajo: true, diasDescanso: true },
      }),
      candidatosDeInstalacion(ctx, inst.id),
    ]);
    const todas = puestos.flatMap((p) => m.celdas.get(p.id) ?? []);
    const nombres = await nombresDePersonas(
      ctx,
      [...todas.map((c) => c.titularId), ...[...m.series.values()].map((s) => s.titularId)],
    );
    return {
      instalacionId: inst.id,
      instalacion: inst.nombre,
      anio: input.anio,
      mes: input.mes,
      hoy: await hoy(ctx),
      feriados: [...(m.feriados.get(inst.id) ?? [])].map(([fecha, nombre]) => ({ fecha, nombre })),
      personas: [...nombres].map(([id, nombre]) => ({ id, nombre })),
      puestos: puestos.map((p) => {
        const celdas = m.celdas.get(p.id) ?? [];
        const serie = m.series.get(p.id);
        return {
          id: p.id,
          nombre: p.nombre,
          funcion: p.funcion?.nombre ?? null,
          horario: `${p.horaInicio}–${p.horaFin}`,
          jornada: p.jornada,
          serie: serie ? vistaSerie(serie, nombres) : null,
          celdas,
          resumen: resumirCobertura(celdas),
        };
      }),
      resumen: resumirCobertura(todas),
      patrones: patrones.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        ciclo: p.clase === "semanal" ? "Días fijos de la semana" : `${p.diasTrabajo} de turno y ${p.diasDescanso} libres`,
      })),
      candidatos,
    };
  },
});
