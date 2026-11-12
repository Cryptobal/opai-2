import { reportesPorJefe, type CargoJefatura, type PersonaJefatura } from "@opai/domain";

import type { Contexto } from "../../types";
import { cargosConJefatura, instalacionesPorUsuario } from "./datos";

/**
 * Personas que reportan a cada jefatura de la empresa (ADR-094), leídas una sola vez: 3 consultas sin
 * importar cuántas jefaturas haya. Directas o, si nadie tiene a la persona (sin jefe asignado, o en una
 * instalación que nadie tiene a cargo), los jefes del nivel de arriba: nadie queda sin medir. Solo
 * cuentan vínculos vigentes de personas activas; a diferencia de `equipoDe`, un jefe inactivo tampoco
 * cuenta (su gente sube de nivel). Las jefaturas sin nadie no aparecen.
 */
export async function directasPorJefatura(ctx: Contexto): Promise<Map<string, Set<string>>> {
  const cargos = await cargosConJefatura(ctx);
  // Solo hay jefaturas si algún cargo reporta a otro.
  if (!cargos.some((c: CargoJefatura) => c.jefaturaCargoId !== null)) return new Map();
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: { estado: "vigente", persona: { estado: "activa" } },
    select: {
      personaId: true,
      cargoId: true,
      instalacionId: true,
      persona: { select: { jefePersonaId: true, usuarioId: true } },
    },
  });
  const usuarios = vinculos.flatMap((v) => (v.persona.usuarioId ? [v.persona.usuarioId] : []));
  const aCargo = await instalacionesPorUsuario(ctx, usuarios);
  const personas: PersonaJefatura[] = vinculos.map((v) => ({
    id: v.personaId,
    cargoId: v.cargoId,
    jefePersonaId: v.persona.jefePersonaId,
    instalacionId: v.instalacionId,
    instalacionesACargo: v.persona.usuarioId ? (aCargo.get(v.persona.usuarioId) ?? []) : [],
  }));
  return new Map([...reportesPorJefe(personas, cargos)].map(([jefe, ids]) => [jefe, new Set(ids)]));
}
