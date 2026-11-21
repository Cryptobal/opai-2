import { z } from "zod";

import { PERMISOS_CORE, PORTALES_VER_COMO, type PortalVerComo } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import type { Contexto } from "../../types";
import { cursorDe, listaSchema, pagina } from "../maestros/comun";
import { busca, type Item, type Tramo, visibles } from "./objetivos-comun";
import { trabajador } from "./objetivos-trabajador";
import { listarSupervisoresVerComo } from "./listar-supervisores";

const itemSchema = z.object({ id: z.string(), nombre: z.string(), detalle: z.string().nullable() });

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

const POR_PORTAL = {
  trabajador,
  cliente,
  terreno,
  supervisor: listarSupervisoresVerComo,
} satisfies Record<
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
