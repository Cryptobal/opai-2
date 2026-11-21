import { z } from "zod";

import { PERMISOS_CORE, PORTALES_VER_COMO, type PortalVerComo } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import type { Contexto } from "../../types";
import { cursorDe, listaSchema, pagina } from "../maestros/comun";
import { rolVisible } from "./objetivo";

const itemSchema = z.object({ id: z.string(), nombre: z.string(), detalle: z.string().nullable() });
type Item = z.infer<typeof itemSchema>;
type Tramo = { q: string; cursor: string | undefined; limite: number };

/** Con `q` vacío, `contains: ""` calza con todos. */
const busca = (q: string) => ({ contains: q, mode: "insensitive" as const });

/** Membresías activas en el portal, de rol visible y que no son de quien mira (mismo filtro que iniciar). */
async function visibles(ctx: Contexto, portal: string) {
  const filas = await ctx.db.membership.findMany({
    where: { estado: "activa", portales: { has: portal } },
    select: { id: true, userId: true, rol: true },
  });
  return filas.filter((m) => rolVisible(ctx, m.rol) && m.userId !== ctx.usuario?.id);
}

async function trabajador(ctx: Contexto, { q, cursor, limite }: Tramo): Promise<Item[]> {
  const visiblesMembresia = await visibles(ctx, "trabajador");
  const usuariosVisibles = new Set(visiblesMembresia.map((m) => m.userId));
  const filas = await ctx.db.persona.findMany({
    where: {
      estado: "activo",
      archivadaEn: null,
      anonimizadaEn: null,
      OR: [{ nombres: busca(q) }, { apellidos: busca(q) }],
    },
    select: { id: true, nombres: true, apellidos: true, usuarioId: true },
    orderBy: { id: "asc" },
    take: limite + 50,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const items: Item[] = [];
  for (const p of filas) {
    if (p.usuarioId === ctx.usuario?.id) continue;
    if (p.usuarioId && !usuariosVisibles.has(p.usuarioId)) continue;
    items.push({ id: p.id, nombre: `${p.nombres} ${p.apellidos}`, detalle: null });
    if (items.length > limite) break;
  }
  return items.slice(0, limite + 1);
}

/** Un contacto por fila: cada uno ve sus propias instalaciones. */
async function cliente(ctx: Contexto, { q, cursor, limite }: Tramo): Promise<Item[]> {
  const miembros = await visibles(ctx, "cliente");
  const cuentas = q
    ? await ctx.db.cuenta.findMany({ where: { nombre: busca(q) }, select: { id: true } })
    : null;
  const accesos = await ctx.db.accesoCliente.findMany({
    where: {
      membershipId: { in: miembros.map((m) => m.id) },
      estado: "activo",
      ...(cuentas ? { cuentaId: { in: cuentas.map((c) => c.id) } } : {}),
    },
    select: { id: true, cuentaId: true, membershipId: true },
    orderBy: { id: "asc" },
    ...cursorDe(cursor, limite),
  });
  const [nombres, usuarios] = await Promise.all([
    ctx.db.cuenta.findMany({
      where: { id: { in: accesos.map((a) => a.cuentaId) } },
      select: { id: true, nombre: true },
    }),
    ctx.db.user.findMany({
      where: { id: { in: miembros.map((m) => m.userId) } },
      select: { id: true, name: true },
    }),
  ]);
  const usuarioDe = (membershipId: string) =>
    usuarios.find((u) => u.id === miembros.find((m) => m.id === membershipId)?.userId)?.name ??
    null;
  return accesos.map((a) => ({
    id: a.id,
    nombre: nombres.find((c) => c.id === a.cuentaId)?.nombre ?? "Cliente",
    detalle: usuarioDe(a.membershipId),
  }));
}

/** Solo instalaciones con un equipo de Terreno emparejado activo: sin equipo no hay qué ver. */
async function terreno(ctx: Contexto, { q, cursor, limite }: Tramo): Promise<Item[]> {
  const equipos = await ctx.db.dispositivo.findMany({
    where: { estado: "activo" },
    select: { instalacionId: true, identificador: true },
  });
  const instalaciones = await ctx.db.instalacion.findMany({
    where: { id: { in: equipos.map((e) => e.instalacionId) }, archivadaEn: null, nombre: busca(q) },
    select: { id: true, nombre: true },
    orderBy: { id: "asc" },
    ...cursorDe(cursor, limite),
  });
  return instalaciones.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    detalle: equipos.find((e) => e.instalacionId === i.id)?.identificador ?? null,
  }));
}

async function supervisor(ctx: Contexto, { q, cursor, limite }: Tramo): Promise<Item[]> {
  const asignados = new Set(
    (
      await ctx.db.supervisorInstalacion.findMany({
        select: { membershipId: true },
        distinct: ["membershipId"],
      })
    ).map((f) => f.membershipId),
  );
  const filas = await ctx.db.membership.findMany({
    where: {
      estado: "activa",
      portales: { has: "supervisor" },
      OR: [{ rol: "supervisor" }, { id: { in: [...asignados] } }],
    },
    select: { id: true, userId: true, rol: true },
    orderBy: { id: "asc" },
    ...cursorDe(cursor, limite),
  });
  const visibles = filas.filter((m) => rolVisible(ctx, m.rol) && m.userId !== ctx.usuario?.id);
  const usuarios = await ctx.db.user.findMany({
    where: { id: { in: visibles.map((m) => m.userId) } },
    select: { id: true, name: true },
  });
  const filtro = q.toLowerCase();
  return visibles
    .map((m) => ({
      id: m.id,
      nombre: usuarios.find((u) => u.id === m.userId)?.name ?? "Supervisor",
      detalle: m.rol === "supervisor" ? null : "Por instalación",
    }))
    .filter((i) => !filtro || i.nombre.toLowerCase().includes(filtro));
}

const POR_PORTAL = { trabajador, cliente, terreno, supervisor } satisfies Record<
  PortalVerComo,
  (ctx: Contexto, t: Tramo) => Promise<Item[]>
>;

export const verComoList = defineCapability({
  id: "core.ver_como.list",
  soloPersonas: true,
  descripcion:
    "Solo personas: a quién se puede ver en «ver como» en la empresa actual (Terreno, trabajador, cliente o supervisor), paginado.",
  permiso: PERMISOS_CORE.verComoIniciar,
  input: listaSchema
    .pick({ cursor: true, limite: true })
    .extend({ portal: z.enum(PORTALES_VER_COMO), q: z.string().trim().max(80).default("") }),
  output: z.object({ items: z.array(itemSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { portal, q, cursor, limite }) {
    if (ctx.alcance) throw prohibido("«Ver como» es para quien ve toda la empresa.");
    return pagina(await POR_PORTAL[portal](ctx, { q, cursor, limite }), limite, cursor);
  },
});
