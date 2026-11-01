import { z } from "zod";

import { minutosDeHora, serieVigente, sugerirReemplazos, trabajaEn } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { cargarSeries } from "./cargar";
import { diaSchema, PERMISO_READ, puestoParaPauta } from "./comun";

const sugerenciaSchema = z.object({
  personaId: z.string(),
  nombre: z.string(),
  mismaInstalacion: z.boolean(),
  horasSemana: z.number(),
  conflictos: z.array(z.string()),
});

const salidaSchema = z.object({ puestoId: z.string(), fecha: z.string(), sugerencias: z.array(sugerenciaSchema) });

function horasTurno(horaInicio: string, horaFin: string): number {
  const ini = minutosDeHora(horaInicio);
  let fin = minutosDeHora(horaFin);
  if (fin <= ini) fin += 1440;
  return (fin - ini) / 60;
}

/** Sugiere guardias para cubrir un turno PPC (A4), priorizando la misma instalación. */
export const reemplazosSugerir = defineCapability({
  id: "pauta.reemplazos.sugerir",
  descripcion:
    "Sugiere guardias disponibles para cubrir un puesto por cubrir en una fecha: ordena por misma instalación, horas semanales y conflictos de doblaje explicados.",
  permiso: PERMISO_READ,
  input: z.object({ puestoId: uuidSchema, fecha: diaSchema }),
  output: salidaSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const puesto = await puestoParaPauta(ctx, input.puestoId);
    const series = await cargarSeries(ctx, puesto.id);
    const vig = serieVigente(series, input.fecha);
    if (!vig || !trabajaEn(vig.patron, vig.inicioCiclo, input.fecha))
      throw reglaDeNegocio("Ese día no es de turno según la serie del puesto.");
    const personas = await ctx.db.persona.findMany({
      where: {
        estado: "activa",
        archivadaEn: null,
        vinculos: { some: { estado: "vigente", instalacionId: puesto.instalacionId } },
      },
      select: { id: true, nombres: true, apellidos: true },
    });
    const seriesDb = await ctx.db.seriePauta.findMany({
      where: {
        titularPersonaId: { in: personas.map((p) => p.id) },
        vigenteDesde: { lte: new Date(`${input.fecha}T00:00:00.000Z`) },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: new Date(`${input.fecha}T00:00:00.000Z`) } }],
      },
    });
    const puestoIds = [...new Set(seriesDb.map((s) => s.puestoId))];
    const puestos = await ctx.db.puesto.findMany({
      where: { id: { in: puestoIds }, AND: [dondePuesto(ctx)] },
      select: { id: true, nombre: true, instalacionId: true, horaInicio: true, horaFin: true },
    });
    const patronIds = [...new Set(seriesDb.map((s) => s.patronId))];
    const patrones = new Map(
      (await ctx.db.patronTurno.findMany({ where: { id: { in: patronIds } } })).map((p) => [p.id, p]),
    );
    const guardias = personas.map((persona) => ({
      personaId: persona.id,
      instalacionId: puesto.instalacionId,
      series: seriesDb
        .filter((s) => s.titularPersonaId === persona.id)
        .flatMap((s) => {
          const p = puestos.find((x) => x.id === s.puestoId);
          const patron = patrones.get(s.patronId);
          if (!p || !patron) return [];
          return [
            {
              id: s.id,
              puestoId: s.puestoId,
              puestoNombre: p.nombre,
              patron: {
                clase: patron.clase === "semanal" ? ("semanal" as const) : ("ciclico" as const),
                diasTrabajo: patron.diasTrabajo,
                diasDescanso: patron.diasDescanso,
                diasSemana: patron.diasSemana,
              },
              inicioCiclo: s.inicioCiclo.toISOString().slice(0, 10),
              titularId: s.titularPersonaId,
              desde: s.vigenteDesde.toISOString().slice(0, 10),
              hasta: s.vigenteHasta ? s.vigenteHasta.toISOString().slice(0, 10) : null,
              horaInicio: p.horaInicio,
              horaFin: p.horaFin,
            },
          ];
        }),
    }));
    const raw = sugerirReemplazos(guardias, {
      puestoId: puesto.id,
      instalacionId: puesto.instalacionId,
      fecha: input.fecha,
      patron: vig.patron,
      inicioCiclo: vig.inicioCiclo,
      horaInicio: puesto.horaInicio,
      horaFin: puesto.horaFin,
      horasTurno: horasTurno(puesto.horaInicio, puesto.horaFin),
    });
    const nombres = new Map(personas.map((p) => [p.id, `${p.nombres} ${p.apellidos}`.trim()]));
    return {
      puestoId: puesto.id,
      fecha: input.fecha,
      sugerencias: raw.map((s) => ({
        ...s,
        nombre: nombres.get(s.personaId) ?? s.personaId,
      })),
    };
  },
});
