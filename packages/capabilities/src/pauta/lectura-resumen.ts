import { z } from "zod";

import { resumirCobertura, type CeldaPauta } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { cargarMes } from "./cargar";
import { PERMISO_READ, mesSchema } from "./comun";
import { resumenSchema } from "./vistas";

const filaInstalacion = z.object({
  instalacionId: z.string(),
  instalacion: z.string(),
  cuenta: z.string(),
  puestos: z.number().int(),
  resumen: resumenSchema,
});

/** Pauta mensual de todas las instalaciones: cobertura y PPC del mes por instalación. */
export const resumenLeer = defineCapability({
  id: "pauta.resumen.leer",
  descripcion:
    "Resumen mensual de la pauta de todas las instalaciones a cargo: por instalación, cuántos puestos tiene, el porcentaje de cobertura del mes y cuántos turnos quedaron como puesto por cubrir según su motivo.",
  permiso: PERMISO_READ,
  input: mesSchema,
  output: z.object({
    anio: z.number().int(),
    mes: z.number().int(),
    instalaciones: z.array(filaInstalacion),
    resumen: resumenSchema,
  }),
  auditarLectura: (s) => s.instalaciones.map((i) => i.instalacionId),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { anio, mes }) {
    const instalaciones = await ctx.db.instalacion.findMany({
      where: { archivadaEn: null, ...dondeInstalacion(ctx) },
      select: { id: true, nombre: true, region: true, cuenta: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    });
    const puestos = await ctx.db.puesto.findMany({
      where: { estado: "activo", instalacionId: { in: instalaciones.map((i) => i.id) }, AND: [dondePuesto(ctx)] },
      select: { id: true, instalacionId: true },
    });
    const m = await cargarMes(ctx, puestos, instalaciones, anio, mes);
    const celdasDe = (instalacionId: string): CeldaPauta[] =>
      puestos.filter((p) => p.instalacionId === instalacionId).flatMap((p) => m.celdas.get(p.id) ?? []);
    const filas = instalaciones
      .map((i) => ({
        instalacionId: i.id,
        instalacion: i.nombre,
        cuenta: i.cuenta.nombre,
        puestos: puestos.filter((p) => p.instalacionId === i.id).length,
        resumen: resumirCobertura(celdasDe(i.id)),
      }))
      .filter((f) => f.puestos > 0);
    return {
      anio,
      mes,
      instalaciones: filas,
      resumen: resumirCobertura(filas.flatMap((f) => celdasDe(f.instalacionId))),
    };
  },
});

const ppcSchema = z.object({
  instalacionId: z.string(),
  instalacion: z.string(),
  puestoId: z.string(),
  puesto: z.string(),
  motivo: z.enum(["sin_titular", "ausencia", "licencia", "vacaciones", "permiso"]),
  desde: z.string(),
  hasta: z.string(),
  dias: z.number().int(),
});

/** Puestos sin cubrir del mes (P06): tramos seguidos de PPC por puesto y motivo. */
export const ppcListar = defineCapability({
  id: "pauta.ppc.listar",
  descripcion:
    "Lista los puestos por cubrir (PPC) de un mes, uno por tramo de días seguidos y motivo (sin titular, ausencia, licencia, vacaciones o permiso), de una instalación o de todas las que están a cargo.",
  permiso: PERMISO_READ,
  input: mesSchema.extend({ instalacionId: uuidSchema.optional() }),
  output: z.array(ppcSchema),
  auditarLectura: (s) => [...new Set(s.map((x) => x.puestoId))],
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { anio, mes, instalacionId }) {
    const instalaciones = await ctx.db.instalacion.findMany({
      where: { archivadaEn: null, AND: [dondeInstalacion(ctx), instalacionId ? { id: instalacionId } : {}] },
      select: { id: true, nombre: true, region: true },
    });
    const puestos = await ctx.db.puesto.findMany({
      where: { estado: "activo", instalacionId: { in: instalaciones.map((i) => i.id) }, AND: [dondePuesto(ctx)] },
      select: { id: true, nombre: true, instalacionId: true },
      orderBy: { nombre: "asc" },
    });
    const m = await cargarMes(ctx, puestos, instalaciones, anio, mes);
    const salida: z.infer<typeof ppcSchema>[] = [];
    for (const p of puestos) {
      const inst = instalaciones.find((i) => i.id === p.instalacionId);
      let actual: z.infer<typeof ppcSchema> | null = null;
      for (const c of m.celdas.get(p.id) ?? []) {
        if (c.estado === "libre") continue;
        if (c.estado !== "ppc" || !c.motivo) {
          actual = null;
        } else if (actual && actual.motivo === c.motivo) {
          actual.hasta = c.fecha;
          actual.dias += 1;
        } else if (inst) {
          actual = {
            instalacionId: inst.id,
            instalacion: inst.nombre,
            puestoId: p.id,
            puesto: p.nombre,
            motivo: c.motivo,
            desde: c.fecha,
            hasta: c.fecha,
            dias: 1,
          };
          salida.push(actual);
        }
      }
    }
    return salida.sort((a, b) => (a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : 0));
  },
});
