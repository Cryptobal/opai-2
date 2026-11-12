import {
  esJefeDirecto,
  personasACargo,
  type CargoJefatura,
  type PersonaJefatura,
} from "@opai/domain";

import type { Contexto } from "../../types";
import { modoJefatura } from "../maestros/cargos-vista";

/** Cargos de la empresa con su jefatura (catálogo chico: decenas de filas). */
export async function cargosConJefatura(ctx: Contexto): Promise<CargoJefatura[]> {
  const cargos = await ctx.db.cargo.findMany({
    select: { id: true, jefaturaCargoId: true, jefaturaVe: true },
  });
  return cargos.map((c) => ({
    id: c.id,
    jefaturaCargoId: c.jefaturaCargoId,
    jefaturaVe: modoJefatura(c.jefaturaVe),
  }));
}

/** Cargos que cuelgan de `cargoId` hacia abajo, sin incluirlo. */
export function cargosBajo(cargos: readonly CargoJefatura[], cargoId: string): Set<string> {
  const bajo = new Set<string>();
  const cola = [cargoId];
  while (cola.length > 0) {
    const actual = cola.pop();
    for (const c of cargos) {
      if (c.jefaturaCargoId !== actual || c.id === cargoId || bajo.has(c.id)) continue;
      bajo.add(c.id);
      cola.push(c.id);
    }
  }
  return bajo;
}

/** Instalaciones a cargo (ADR-022) de cada usuario, por su membresía en la empresa. */
export async function instalacionesPorUsuario(
  ctx: Contexto,
  usuarios: readonly string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (usuarios.length === 0) return out;
  const membresias = await ctx.db.membership.findMany({
    where: { userId: { in: [...usuarios] }, estado: "activa" },
    select: { id: true, userId: true },
  });
  if (membresias.length === 0) return out;
  const usuarioDe = new Map(membresias.map((m) => [m.id, m.userId]));
  const filas = await ctx.db.supervisorInstalacion.findMany({
    where: { membershipId: { in: [...usuarioDe.keys()] } },
    select: { membershipId: true, instalacionId: true },
  });
  for (const f of filas) {
    const usuario = usuarioDe.get(f.membershipId);
    if (usuario) out.set(usuario, [...(out.get(usuario) ?? []), f.instalacionId]);
  }
  return out;
}

export type Equipo = {
  /** Cargo vigente del jefe. null = sin vínculo vigente: no tiene a nadie a cargo. */
  cargoId: string | null;
  /** Todas las personas a su cargo, hacia abajo. */
  ids: Set<string>;
  /** De ellas, las que le reportan directamente. */
  directas: Set<string>;
};

/**
 * Personas a cargo de `jefeId` según la jefatura de cada cargo (ADR-094). Solo lee los cargos que
 * cuelgan del suyo: 4 consultas como máximo, sin importar el tamaño del equipo.
 */
export async function equipoDe(ctx: Contexto, jefeId: string): Promise<Equipo> {
  const propio = await ctx.db.vinculoLaboral.findFirst({
    where: { personaId: jefeId, estado: "vigente" },
    select: { cargoId: true },
  });
  if (!propio) return { cargoId: null, ids: new Set(), directas: new Set() };
  const cargos = await cargosConJefatura(ctx);
  const bajo = cargosBajo(cargos, propio.cargoId);
  if (bajo.size === 0) return { cargoId: propio.cargoId, ids: new Set(), directas: new Set() };
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: { estado: "vigente", cargoId: { in: [propio.cargoId, ...bajo] } },
    select: {
      personaId: true,
      cargoId: true,
      instalacionId: true,
      persona: { select: { jefePersonaId: true, usuarioId: true, estado: true } },
    },
  });
  // Una persona inactiva no aparece ni hace de jefe: su gente sube al nivel de arriba.
  const activos = vinculos.filter((v) => v.persona.estado === "activa" || v.personaId === jefeId);
  const usuarios = activos.flatMap((v) => (v.persona.usuarioId ? [v.persona.usuarioId] : []));
  const aCargo = await instalacionesPorUsuario(ctx, usuarios);
  const personas: PersonaJefatura[] = activos.map((v) => ({
    id: v.personaId,
    cargoId: v.cargoId,
    jefePersonaId: v.persona.jefePersonaId,
    instalacionId: v.instalacionId,
    instalacionesACargo: v.persona.usuarioId ? (aCargo.get(v.persona.usuarioId) ?? []) : [],
  }));
  const ids = personasACargo(jefeId, personas, cargos);
  const porCargo = new Map(cargos.map((c) => [c.id, c]));
  const jefe = personas.find((p) => p.id === jefeId);
  const directas = new Set(
    jefe ? personas.filter((p) => esJefeDirecto(jefe, p, porCargo)).map((p) => p.id) : [],
  );
  return { cargoId: propio.cargoId, ids, directas };
}

/** Ficha de Persona del usuario que consulta (vínculo 1 a 1 de `core.personas.vincular_usuario`). */
export async function personaDelUsuario(ctx: Contexto): Promise<string | null> {
  // Una key de servicio no es su responsable: no hereda su ficha ni su equipo.
  if (ctx.principal?.tipo === "servicio") return null;
  const usuarioId = ctx.usuario?.id;
  if (!usuarioId) return null;
  const p = await ctx.db.persona.findFirst({
    where: { usuarioId, archivadaEn: null, anonimizadaEn: null },
    select: { id: true },
  });
  return p?.id ?? null;
}
