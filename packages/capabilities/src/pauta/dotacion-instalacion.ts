import { z } from "zod";

import type { CeldaPauta } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { candidatosDeInstalacion } from "./candidatos";
import { PERMISO_READ, mesSchema } from "./comun";
import { mesLeer } from "./lectura-mes";
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
export const dotacionInstalacionGet = defineCapability({
  id: "pauta.dotacion.get",
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
    const [mes, vinculos] = await Promise.all([
      mesLeer.handler(ctx, input, { dryRun: false }),
      candidatosDeInstalacion(ctx, input.instalacionId),
    ]);
    const nom = (id: string) => mes.personas.find((p) => p.id === id)?.nombre ?? "—";
    const tramosConNombre = (celdas: CeldaPauta[], variante: "reemplazo" | "refuerzo") =>
      tramosVariante(celdas, variante).map((t) => ({ ...t, persona: nom(t.personaId) }));
    return {
      instalacionId: mes.instalacionId,
      anio: mes.anio,
      mes: mes.mes,
      hoy: mes.hoy,
      vinculos,
      puestos: mes.puestos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        funcion: p.funcion,
        horario: p.horario,
        serie: p.serie,
        reemplazos: tramosConNombre(p.celdas as CeldaPauta[], "reemplazo"),
        refuerzos: tramosConNombre(p.celdas as CeldaPauta[], "refuerzo"),
        vacantes: tramosPpc(p.celdas as CeldaPauta[]),
      })),
    };
  },
});