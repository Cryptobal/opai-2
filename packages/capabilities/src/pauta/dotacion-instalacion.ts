import { z } from "zod";

import type { CeldaPauta } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { noEncontrado } from "../errores";
import { candidatosDeInstalacion } from "./candidatos";
import { cargarMes } from "./cargar";
import { PERMISO_READ, hoy, mesSchema } from "./comun";
import { nombresDePersonas, vistaSerie } from "./nombres";
import { tramosPpc, tramosVariante } from "./tramos-celdas";
import { serieVistaSchema } from "./vistas";

const tramoPersonaSchema = z.object({
  personaId: z.string(),
  persona: z.string(),
  desde: z.string(),
  hasta: z.string(),
  dias: z.number().int(),
});

const vacanteSchema = z.object({
  motivo: z.enum(["sin_titular", "ausencia", "licencia", "vacaciones", "permiso"]),
  desde: z.string(),
  hasta: z.string(),
  dias: z.number().int(),
});

const puestoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  funcion: z.string().nullable(),
  horario: z.string(),
  serie: serieVistaSchema.nullable(),
  reemplazos: z.array(tramoPersonaSchema),
  refuerzos: z.array(tramoPersonaSchema),
  vacantes: z.array(vacanteSchema),
});

const salidaSchema = z.object({
  instalacionId: z.string(),
  anio: z.number().int(),
  mes: z.number().int(),
  hoy: z.string(),
  vinculos: z.array(z.object({ id: z.string(), nombre: z.string() })),
  puestos: z.array(puestoSchema),
});

/** Dotación de una instalación en el mes: titulares, reemplazos, refuerzos y vacantes (PPC) desde la Pauta. */
export const dotacionInstalacionListar = defineCapability({
  id: "pauta.dotacion.listar",
  descripcion:
    "Dotación de una instalación en un mes: por puesto, titular de la serie, tramos de reemplazo y refuerzo y vacantes (PPC), más las personas con vínculo vigente en la instalación.",
  permiso: PERMISO_READ,
  input: z.object({ instalacionId: uuidSchema }).merge(mesSchema),
  output: salidaSchema,
  auditarLectura: (s) => [
    ...new Set([
      ...s.vinculos.map((v) => v.id),
      ...s.puestos.flatMap((p) => [
        ...p.reemplazos.map((r) => r.personaId),
        ...p.refuerzos.map((r) => r.personaId),
        ...(p.serie?.titularId ? [p.serie.titularId] : []),
      ]),
    ]),
  ],
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const inst = await ctx.db.instalacion.findFirst({
      where: { id: input.instalacionId, AND: [dondeInstalacion(ctx)] },
      select: { id: true, nombre: true, region: true },
    });
    if (!inst) throw noEncontrado("La instalación");
    const puestos = await ctx.db.puesto.findMany({
      where: { instalacionId: inst.id, estado: "activo", AND: [dondePuesto(ctx)] },
      include: { funcion: { select: { nombre: true } } },
      orderBy: [{ nombre: "asc" }, { horaInicio: "asc" }],
    });
    const hoyCivil = await hoy(ctx);
    const m = await cargarMes(ctx, puestos, [inst], input.anio, input.mes);
    const idsNombres = new Set<string>();
    for (const p of puestos) {
      const serie = m.series.get(p.id);
      if (serie?.titularId) idsNombres.add(serie.titularId);
      for (const c of m.celdas.get(p.id) ?? []) {
        if (c.cubiertoPorId) idsNombres.add(c.cubiertoPorId);
        if (c.titularId) idsNombres.add(c.titularId);
      }
    }
    const nombres = await nombresDePersonas(ctx, [...idsNombres]);
    const nom = (id: string) => nombres.get(id) ?? "—";
    const tramosConNombre = (celdas: CeldaPauta[], variante: "reemplazo" | "refuerzo") =>
      tramosVariante(celdas, variante).map((t) => ({
        ...t,
        persona: nom(t.personaId),
      }));
    const [vinculos] = await Promise.all([candidatosDeInstalacion(ctx, inst.id)]);
    return {
      instalacionId: inst.id,
      anio: input.anio,
      mes: input.mes,
      hoy: hoyCivil,
      vinculos,
      puestos: puestos.map((p) => {
        const celdas = m.celdas.get(p.id) ?? [];
        const serie = m.series.get(p.id);
        return {
          id: p.id,
          nombre: p.nombre,
          funcion: p.funcion?.nombre ?? null,
          horario: `${p.horaInicio}–${p.horaFin}`,
          serie: serie ? vistaSerie(serie, nombres) : null,
          reemplazos: tramosConNombre(celdas, "reemplazo"),
          refuerzos: tramosConNombre(celdas, "refuerzo"),
          vacantes: tramosPpc(celdas),
        };
      }),
    };
  },
});