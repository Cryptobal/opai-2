import type { z } from "zod";

import type { Contexto } from "@opai/capabilities";

import { calcularDia, fechaDe } from "./dias-calculo";
import { nombreCompleto, tenantBasico } from "./formato";
import type { itemSchema } from "./dias-hoy-tipos";

type Item = z.infer<typeof itemSchema>;

export async function idsBusqueda(ctx: Contexto, q: string, personasBase: string[] | undefined) {
  const t = q.trim();
  if (t.length < 2) return null;
  const [personas, insts] = await Promise.all([
    ctx.db.persona.findMany({
      where: {
        AND: [
          personasBase ? { id: { in: personasBase } } : {},
          { OR: [{ nombres: { contains: t, mode: "insensitive" } }, { apellidos: { contains: t, mode: "insensitive" } }] },
        ],
      },
      select: { id: true },
      take: 200,
    }),
    ctx.db.instalacion.findMany({ where: { nombre: { contains: t, mode: "insensitive" } }, select: { id: true }, take: 50 }),
  ]);
  return { personaIds: personas.map((p) => p.id), instalacionIds: insts.map((x) => x.id) };
}

export async function itemsResumenDia(
  ctx: Contexto,
  hoy: string,
  ahora: Date,
  zona: string,
  alcance: object,
  filtroInstalacion?: string,
  busqueda?: { personaIds: string[]; instalacionIds: string[] } | null,
) {
  const turnosTodos = await ctx.db.turnoEsperado.findMany({
    where: {
      vigente: true,
      fecha: new Date(`${hoy}T00:00:00Z`),
      AND: [
        alcance,
        filtroInstalacion ? { instalacionId: filtroInstalacion } : {},
        busqueda
          ? {
              OR: [
                ...(busqueda.personaIds.length ? [{ personaId: { in: busqueda.personaIds } }] : []),
                ...(busqueda.instalacionIds.length ? [{ instalacionId: { in: busqueda.instalacionIds } }] : []),
              ],
            }
          : {},
      ],
    },
    orderBy: [{ inicio: "asc" }, { id: "asc" }],
  });
  const instIds = [...new Set(turnosTodos.map((t) => t.instalacionId))];
  const [nombres, insts] = await Promise.all([
    ctx.db.persona.findMany({
      where: { id: { in: [...new Set(turnosTodos.map((t) => t.personaId))] } },
      select: { id: true, nombres: true, apellidos: true },
    }),
    ctx.db.instalacion.findMany({ where: { id: { in: instIds } }, select: { id: true, nombre: true } }),
  ]);
  const nombre = new Map(nombres.map((p) => [p.id, nombreCompleto(p)]));
  const instalacion = new Map(insts.map((x) => [x.id, x.nombre]));
  const alcanceInst = ctx.alcance ? [...ctx.alcance.instalaciones] : undefined;
  const items: Item[] = [];
  const vistos = new Set<string>();
  for (const t of turnosTodos) {
    if (vistos.has(t.personaId)) continue;
    vistos.add(t.personaId);
    items.push(await itemDiaPersona(ctx, t.personaId, hoy, ahora, zona, alcanceInst, nombre, instalacion));
  }
  return items;
}

async function itemDiaPersona(
  ctx: Contexto,
  personaId: string,
  hoy: string,
  ahora: Date,
  zona: string,
  alcanceInst: string[] | undefined,
  nombre: Map<string, string>,
  instalacion: Map<string, string>,
) {
  const d = await calcularDia(ctx, personaId, hoy, ahora, zona, alcanceInst);
  return {
    personaId,
    nombre: nombre.get(personaId) ?? "",
    instalacionId: d.instalacionId,
    instalacion: d.instalacionId ? (instalacion.get(d.instalacionId) ?? null) : null,
    turnoInicio: d.turno?.inicio.toISOString() ?? null,
    turnoFin: d.turno?.fin.toISOString() ?? null,
    entrada: d.entrada?.toISOString() ?? null,
    salida: d.salida?.toISOString() ?? null,
    estado: d.estado,
    sigla: d.sigla,
    atrasoMin: Math.floor(d.segundosAtraso / 60),
    tipoJornada: d.tipoJornada,
    correccionPendiente: d.correccionPendiente,
    descansoInsuficiente: d.descansoInsuficiente,
    marcaFueraDeTurno: d.marcaFueraDeTurno,
  };
}

export function resumenItems(items: Item[]) {
  const cuenta = (e: string) => items.filter((x) => x.estado === e).length;
  return {
    turnos: items.length,
    presentes: cuenta("presente"),
    sinMarca: cuenta("sin_marca"),
    ausentes: cuenta("ausente"),
    incompletos: cuenta("incompleto"),
    atrasos: items.filter((x) => x.atrasoMin > 0).length,
  };
}

export function paginaItems(items: Item[], estado: string | undefined, cursor: string | undefined, limite: number) {
  const filtrados = estado ? items.filter((x) => x.estado === estado) : items;
  let inicio = 0;
  if (cursor) {
    const ix = filtrados.findIndex((x) => x.personaId === cursor);
    if (ix >= 0) inicio = ix + 1;
  }
  const pagina = filtrados.slice(inicio, inicio + limite);
  return {
    items: pagina,
    siguiente: filtrados.length > inicio + limite ? (pagina.at(-1)?.personaId ?? null) : null,
  };
}

export async function hoyZona(ctx: Contexto) {
  const { zona } = await tenantBasico(ctx);
  const ahora = new Date();
  return { zona, hoy: fechaDe(ahora, zona), ahora };
}