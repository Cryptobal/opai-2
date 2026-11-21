import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { ESTADOS_HILO, TIPOS_MENSAJE } from "../domain/mensajes";
import { cursorDe, listaSchema, pagina, uuidSchema } from "./esquemas";
import { dondeHilos, hiloSchema, mensajeSchema, PORTALES_TERRENO } from "./mensajes-util";

type Hilo = z.infer<typeof hiloSchema>;
type FilaHilo = Omit<Hilo, "tipo" | "estado"> & { tipo: string; estado: string };

const vista = (h: FilaHilo): Hilo => ({
  id: h.id,
  instalacionId: h.instalacionId,
  personaId: h.personaId,
  tipo: h.tipo as Hilo["tipo"],
  estado: h.estado as Hilo["estado"],
  alertaId: h.alertaId,
  consultaVenceEn: h.consultaVenceEn,
  cerradoEn: h.cerradoEn,
  createdAt: h.createdAt,
});

/** Hilos de mensajes de terreno (R16, R20): el guardia ve los suyos; la central, los de su alcance. */
export const mensajesListar = defineCapability({
  auditarLectura: (s) => s.items.flatMap((h) => [h.id, h.personaId]),
  id: "central.mensajes.listar",
  descripcion:
    "Lista los hilos de mensajes a la central (abiertos o cerrados), del más nuevo al más antiguo. El guardia ve solo los suyos y un supervisor los de sus instalaciones.",
  permiso: null,
  portales: PORTALES_TERRENO,
  input: listaSchema.extend({
    estado: z.enum(ESTADOS_HILO).optional(),
    tipo: z.enum(TIPOS_MENSAJE).optional(),
    abiertos: z.boolean().default(false).describe("Solo los que no están cerrados."),
  }),
  output: z.object({ items: z.array(hiloSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const filas = await ctx.db.centralHilo.findMany({
      where: {
        AND: [
          await dondeHilos(ctx),
          i.estado ? { estado: i.estado } : {},
          i.tipo ? { tipo: i.tipo } : {},
          i.abiertos ? { estado: { not: "cerrado" } } : {},
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...cursorDe(i.cursor, i.limite),
    });
    const p = pagina(filas, i.limite, i.cursor);
    return { items: p.items.map((h) => vista(h)), siguiente: p.siguiente };
  },
});

/** Un hilo con todos sus mensajes, en orden (R16). */
export const mensajesObtener = defineCapability({
  auditarLectura: (s) => [s.hilo.id, s.hilo.personaId],
  id: "central.mensajes.obtener",
  descripcion: "Obtiene un hilo de mensajes a la central con todos sus mensajes en orden, quién escribió cada uno y si está cerrado.",
  permiso: null,
  portales: PORTALES_TERRENO,
  input: z.object({ id: uuidSchema }),
  output: z.object({ hilo: hiloSchema, mensajes: z.array(mensajeSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, i) {
    const h = await ctx.db.centralHilo.findFirst({ where: { id: i.id, ...(await dondeHilos(ctx)) } });
    if (!h) throw noEncontrado("El hilo");
    const mensajes = await ctx.db.centralHiloMensaje.findMany({
      where: { hiloId: h.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 500,
    });
    return {
      hilo: vista(h),
      mensajes: mensajes.map((m) => ({ id: m.id, autorTipo: m.autorTipo as z.infer<typeof mensajeSchema>["autorTipo"], texto: m.texto, createdAt: m.createdAt })),
    };
  },
});
