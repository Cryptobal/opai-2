import { z } from "zod";

import { defineCapability, type Contexto } from "@opai/capabilities";

import { estadoCorreccion, valorEfectivo, type TipoMarca } from "../domain";
import { nombreCompleto } from "./formato";
import { uuid } from "./esquemas";
import { alcanceMarcas } from "./alcance-marcas";

const itemSchema = z.object({
  correccionId: z.string(), marcaId: z.string(), personaId: z.string(), personaNombre: z.string(),
  original: z.object({ tipo: z.string(), hora: z.string() }),
  propuesta: z.object({ tipo: z.string(), hora: z.string() }),
  motivo: z.string(), venceEn: z.string().nullable(),
  estado: z.enum(["pendiente", "aceptada", "objetada", "vencida"]),
  /** Qué valor rige hoy y cómo se señala la alteración en pantalla y en el reporte. */
  rige: z.enum(["original", "propuesta"]),
  senal: z.enum(["pendiente", "corregida", "objetada", "vencida_aceptada"]).nullable(),
});

/** Corrección con su estado y el valor que rige (L-24, L-27): mientras está pendiente rige el original. */
export async function correccionesVista(ctx: Contexto, filtro: object, ahora = new Date()) {
  const filas = await ctx.db.correccion.findMany({ where: filtro, orderBy: { seq: "desc" }, take: 200 });
  const marcas = new Map((await ctx.db.marca.findMany({ where: { id: { in: filas.map((c) => c.marcaId) } } })).map((m) => [m.id, m]));
  const personas = new Map(
    (await ctx.db.persona.findMany({
      where: { id: { in: [...new Set(filas.map((c) => c.personaId))] } },
      select: { id: true, nombres: true, apellidos: true },
    })).map((p) => [p.id, nombreCompleto(p)]),
  );
  const respuestas = new Map((await ctx.db.correccionRespuesta.findMany({ where: { correccionId: { in: filas.map((c) => c.id) } } })).map((r) => [r.correccionId, r]));
  return filas.flatMap((c) => {
    const m = marcas.get(c.marcaId);
    if (!m) return [];
    const r = respuestas.get(c.id);
    const estado = estadoCorreccion({ selloServidor: c.horaServidor, plazoHoras: c.plazoHoras }, r && r.resultado !== "vencida" ? (r.resultado as "aceptada" | "objetada") : null, ahora);
    const original = { tipo: m.tipo as TipoMarca, hora: m.horaServidor };
    const propuesta = { tipo: c.tipoPropuesto as TipoMarca, hora: c.horaPropuesta };
    const e = valorEfectivo(original, propuesta, estado);
    return [{
      correccionId: c.id, marcaId: c.marcaId, personaId: c.personaId, personaNombre: personas.get(c.personaId) ?? "—",
      original: { tipo: original.tipo, hora: original.hora.toISOString() },
      propuesta: { tipo: propuesta.tipo, hora: propuesta.hora.toISOString() },
      motivo: c.motivo, venceEn: c.venceEn?.toISOString() ?? null, estado,
      rige: e.valor === propuesta ? ("propuesta" as const) : ("original" as const), senal: e.senal,
    }];
  });
}

export const correccionesListar = defineCapability({
  id: "asistencia.correcciones.listar",
  descripcion:
    "Lista las correcciones de marcas con su estado (pendiente, aceptada, objetada o vencida), el valor propuesto, el original y cuál rige hoy. El trabajador ve las suyas y el supervisor las de sus instalaciones.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno"],
  input: z.object({
    marcaId: uuid.optional(), estado: z.enum(["pendiente", "aceptada", "objetada", "vencida"]).optional(),
    cursor: z.string().uuid().optional(), limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({ items: z.array(itemSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((c) => c.correccionId),
  async handler(ctx, i) {
    const a = await alcanceMarcas(ctx);
    const marcas = await ctx.db.marca.findMany({ where: { ...a, ...(i.marcaId ? { id: i.marcaId } : {}) }, select: { id: true }, take: 5000 });
    const todos = await correccionesVista(ctx, { marcaId: { in: marcas.map((m) => m.id) } });
    const filtrados = i.estado ? todos.filter((x) => x.estado === i.estado) : todos;
    let inicio = 0;
    if (i.cursor) {
      const ix = filtrados.findIndex((x) => x.correccionId === i.cursor);
      if (ix >= 0) inicio = ix + 1;
    }
    const items = filtrados.slice(inicio, inicio + i.limite);
    return { items, siguiente: filtrados.length > inicio + i.limite ? (items.at(-1)?.correccionId ?? null) : null };
  },
});
