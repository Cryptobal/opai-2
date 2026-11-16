import { dondePersona } from "../core/maestros/alcance";
import { conflicto, noEncontrado } from "../errores";
import type { Contexto } from "../types";
import { aFechaDb } from "./comun";
import { validarNoDoblar } from "./doblaje";

type Puesto = {
  id: string;
  instalacionId: string;
  horaInicio: string;
  horaFin: string;
};

type Vigencia = { patron: Parameters<typeof validarNoDoblar>[1]["patron"]; inicioCiclo: string };

/** Persona con vínculo vigente, sin excepción activa ese día y sin doblar. */
export async function validarPersonaParaExtra(
  ctx: Contexto,
  puesto: Puesto,
  args: { personaId: string; fecha: string; vig: Vigencia; conflictoMsg: string },
) {
  const ok = await ctx.db.persona.findFirst({
    where: {
      id: args.personaId,
      AND: [dondePersona(ctx)],
      vinculos: { some: { estado: "vigente", instalacionId: puesto.instalacionId } },
    },
    select: { id: true },
  });
  if (!ok) throw noEncontrado("La persona");
  const repetida = await ctx.db.excepcionPauta.findFirst({
    where: { puestoId: puesto.id, fecha: aFechaDb(args.fecha), estado: "activa" },
  });
  if (repetida) throw conflicto(args.conflictoMsg);
  await validarNoDoblar(ctx, {
    puestoId: puesto.id,
    titularPersonaId: args.personaId,
    patron: args.vig.patron,
    inicioCiclo: args.vig.inicioCiclo,
    desde: args.fecha,
    horaInicio: puesto.horaInicio,
    horaFin: puesto.horaFin,
  });
}
