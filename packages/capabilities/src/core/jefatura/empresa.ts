import { reportesPorJefe, type CargoJefatura, type PersonaJefatura } from "@opai/domain";

import type { Contexto } from "../../types";
import { cargosConJefatura, instalacionesPorUsuario } from "./datos";

/** Jefatura de toda la empresa: cargos, personas y el usuario de cada persona (si tiene). */
type Jefatura = { reportes: Map<string, string[]>; usuarioDe: Map<string, string> };

async function jefaturaEmpresa(ctx: Contexto): Promise<Jefatura | null> {
  const cargos = await cargosConJefatura(ctx);
  // Solo hay jefaturas si algún cargo reporta a otro.
  if (!cargos.some((c: CargoJefatura) => c.jefaturaCargoId !== null)) return null;
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
  const usuarioDe = new Map(
    vinculos.flatMap((v) => (v.persona.usuarioId ? [[v.personaId, v.persona.usuarioId] as const] : [])),
  );
  return { reportes: reportesPorJefe(personas, cargos), usuarioDe };
}

/**
 * Personas que reportan a cada jefatura de la empresa (ADR-094), leídas una sola vez: 3 consultas sin
 * importar cuántas jefaturas haya. Directas o, si nadie tiene a la persona (sin jefe asignado, o en una
 * instalación que nadie tiene a cargo), los jefes del nivel de arriba: nadie queda sin medir. Solo
 * cuentan vínculos vigentes de personas activas; a diferencia de `equipoDe`, un jefe inactivo tampoco
 * cuenta (su gente sube de nivel). Las jefaturas sin nadie no aparecen.
 */
export async function directasPorJefatura(ctx: Contexto): Promise<Map<string, Set<string>>> {
  const j = await jefaturaEmpresa(ctx);
  if (!j) return new Map();
  return new Map([...j.reportes].map(([jefe, ids]) => [jefe, new Set(ids)]));
}

/**
 * Instalaciones por las que responde cada usuario (ADR-094, adenda CAR-310): las que tiene a cargo
 * como supervisor y, si es jefatura (jefe de zona), las de los supervisores que le reportan.
 */
export async function instalacionesPorResponsable(ctx: Contexto): Promise<Map<string, Set<string>>> {
  const filas = await ctx.db.supervisorInstalacion.findMany({ select: { membershipId: true, instalacionId: true } });
  const out = new Map<string, Set<string>>();
  if (filas.length === 0) return out;
  const membresias = await ctx.db.membership.findMany({
    where: { id: { in: [...new Set(filas.map((f) => f.membershipId))] }, estado: "activa" },
    select: { id: true, userId: true },
  });
  const usuarioDeMembresia = new Map(membresias.map((m) => [m.id, m.userId]));
  const agregar = (usuario: string, instalaciones: Iterable<string>) => {
    const set = out.get(usuario) ?? new Set<string>();
    for (const i of instalaciones) set.add(i);
    out.set(usuario, set);
  };
  for (const f of filas) {
    const u = usuarioDeMembresia.get(f.membershipId);
    if (u) agregar(u, [f.instalacionId]);
  }
  const j = await jefaturaEmpresa(ctx);
  if (!j) return out;
  const supervisores = new Map(out);
  for (const [jefe, reportan] of j.reportes) {
    const usuarioJefe = j.usuarioDe.get(jefe);
    if (!usuarioJefe) continue;
    for (const persona of reportan) {
      const u = j.usuarioDe.get(persona);
      const suyas = u ? supervisores.get(u) : undefined;
      if (suyas && u !== usuarioJefe) agregar(usuarioJefe, suyas);
    }
  }
  return out;
}
