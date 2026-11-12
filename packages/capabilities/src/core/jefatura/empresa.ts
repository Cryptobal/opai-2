import { esJefeDirecto, type CargoJefatura, type PersonaJefatura } from "@opai/domain";

import type { Contexto } from "../../types";
import { cargosBajo, cargosConJefatura, instalacionesPorUsuario } from "./datos";

/**
 * Personas a cargo directo de cada jefatura de la empresa (ADR-094), leídas una sola vez: 3 consultas
 * sin importar cuántas jefaturas haya. Solo cuentan los vínculos vigentes de personas activas, igual
 * que `equipoDe`. Las jefaturas sin nadie a cargo no aparecen.
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
  const porCargo = new Map(cargos.map((c) => [c.id, c]));
  const out = new Map<string, Set<string>>();
  for (const jefe of personas) {
    if (cargosBajo(cargos, jefe.cargoId).size === 0) continue;
    const directas = personas.filter((p) => p.id !== jefe.id && esJefeDirecto(jefe, p, porCargo));
    if (directas.length > 0) out.set(jefe.id, new Set(directas.map((p) => p.id)));
  }
  return out;
}
