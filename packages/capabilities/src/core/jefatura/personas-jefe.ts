import { PERMISOS_CORE } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { dondePersona } from "../maestros/alcance";
import { bloquearNoAnonimizado, exigirNoAnonimizado } from "../maestros/anonimizado";

const MAX_PERSONAS = 200;

export const personasAsignarJefe = defineCapability({
  id: "core.personas.asignar_jefe",
  descripcion:
    "Asigna a una o varias personas su jefe directo (null lo quita). El jefe debe tener hoy el cargo que es jefatura del cargo de cada persona. Se usa cuando el cargo se ve por personas asignadas: así dos jefes con el mismo cargo ven cada uno solo a su gente.",
  permiso: PERMISOS_CORE.personasManage,
  input: z.object({
    personaIds: z.array(uuidSchema).min(1).max(MAX_PERSONAS).describe("Personas a asignar."),
    jefePersonaId: uuidSchema.nullable().describe("Persona que será su jefe directo; null lo quita."),
  }),
  output: z.object({
    jefePersonaId: z.string().nullable(),
    personaIds: z.array(z.string()).describe("Personas que quedaron con ese jefe."),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const ids = [...new Set(input.personaIds)];
    const jefeId = input.jefePersonaId;
    if (jefeId && ids.includes(jefeId)) {
      throw reglaDeNegocio("Una persona no puede ser su propio jefe.");
    }
    const personas = await ctx.db.persona.findMany({
      where: { id: { in: ids }, ...dondePersona(ctx) },
      select: { id: true, nombres: true, apellidos: true, anonimizadaEn: true },
    });
    if (personas.length !== ids.length) throw noEncontrado("Alguna de las personas");
    for (const p of personas) exigirNoAnonimizado(p, "La persona");
    if (jefeId) {
      const [jefe, vinculos] = await Promise.all([
        ctx.db.vinculoLaboral.findFirst({
          where: {
            personaId: jefeId,
            estado: "vigente",
            persona: { estado: "activa", anonimizadaEn: null },
          },
          select: { cargoId: true },
        }),
        ctx.db.vinculoLaboral.findMany({
          where: { personaId: { in: ids }, estado: "vigente" },
          select: { personaId: true, cargoId: true },
        }),
      ]);
      if (!jefe) throw reglaDeNegocio("El jefe no está activo o no tiene un vínculo laboral vigente.");
      const cargos = await ctx.db.cargo.findMany({
        where: { id: { in: [...new Set(vinculos.map((v) => v.cargoId))] } },
        select: { id: true, jefaturaCargoId: true },
      });
      const jefaturaDe = new Map(cargos.map((c) => [c.id, c.jefaturaCargoId]));
      const cargoDe = new Map(vinculos.map((v) => [v.personaId, v.cargoId]));
      const fuera = personas.filter((p) => {
        const cargo = cargoDe.get(p.id);
        return !cargo || jefaturaDe.get(cargo) !== jefe.cargoId;
      });
      if (fuera.length > 0) {
        const nombres = fuera.slice(0, 5).map((p) => `${p.nombres} ${p.apellidos}`);
        throw reglaDeNegocio(
          `El cargo del jefe no es la jefatura del cargo de: ${nombres.join(", ")}${fuera.length > 5 ? "…" : ""}. Revisa la jefatura del cargo.`,
          { personaIds: fuera.map((p) => p.id) },
        );
      }
    }
    const salida = { jefePersonaId: jefeId, personaIds: ids.sort() };
    if (dryRun) return salida;
    await ctx.transaccion(async (tx) => {
      // Mismo bloqueo que toma la anonimización: las dos escrituras se serializan sobre la fila.
      for (const id of ids) await bloquearNoAnonimizado(tx, "persona", id);
      await tx.persona.updateMany({ where: { id: { in: ids } }, data: { jefePersonaId: jefeId } });
      for (const id of ids) {
        await ctx.eventos.emitir(tx, {
          tipo: "core.persona.actualizada",
          entidadTipo: "persona",
          entidadId: id,
          payload: { jefePersonaId: jefeId },
        });
      }
    });
    return salida;
  },
});
