import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { cursorDe, pagina } from "../maestros/comun";
import { exigeSinAlcance } from "./comun";
import { encolarEnvio } from "./envio";

const entregaSchema = z.object({
  id: z.string(),
  destinoId: z.string(),
  eventoId: z.string(),
  tipo: z.string(),
  /** "pendiente" | "ok" | "error". */
  estado: z.string(),
  intentos: z.number().int(),
  proximoIntentoEn: z.date().nullable(),
  /** Código HTTP de la última respuesta; el cuerpo de la respuesta no se guarda. */
  ultimoCodigo: z.number().int().nullable(),
  ultimoError: z.string().nullable(),
  duracionMs: z.number().int().nullable(),
  entregadaEn: z.date().nullable(),
  createdAt: z.date(),
});

const SELECT_ENTREGA = {
  id: true,
  destinoId: true,
  eventoId: true,
  tipo: true,
  estado: true,
  intentos: true,
  proximoIntentoEn: true,
  ultimoCodigo: true,
  ultimoError: true,
  duracionMs: true,
  entregadaEn: true,
  createdAt: true,
} as const;

type FilaEntrega = z.infer<typeof entregaSchema> & { proximoIntentoEn: Date | null };
const vista = (e: FilaEntrega) => ({
  ...e,
  proximoIntentoEn: e.estado === "pendiente" ? e.proximoIntentoEn : null,
});

export const webhooksEntregasList = defineCapability({
  id: "core.webhooks.entregas_list",
  descripcion:
    "Registro de entregas de eventos salientes (webhooks): qué evento se envió a qué destino, con su estado, intentos, código de la última respuesta y cuándo se reintenta. Las más recientes primero, paginada por cursor.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({
    destinoId: uuidSchema.optional().describe("Solo las de este destino."),
    estado: z.enum(["pendiente", "ok", "error"]).optional(),
    // CAR-353: contrato único de listas (cursor + limite; items + siguiente).
    cursor: z.uuid().optional().describe("Id de la última entrega de la página anterior."),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({ items: z.array(entregaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    exigeSinAlcance(ctx);
    const filas = await ctx.db.webhookEntrega.findMany({
      where: {
        ...(input.destinoId ? { destinoId: input.destinoId } : {}),
        ...(input.estado ? { estado: input.estado } : {}),
      },
      select: SELECT_ENTREGA,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const { items, siguiente } = pagina(filas, input.limite);
    return { items: items.map(vista), siguiente };
  },
});

export const webhooksEntregaReenviar = defineCapability({
  id: "core.webhooks.entrega_reenviar",
  descripcion:
    "Vuelve a enviar una entrega de un evento saliente (por ejemplo, después de arreglar el sistema que lo recibe). Se envía en la próxima vuelta del envío, al mismo destino y con la firma vigente.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({ id: uuidSchema.describe("Id de la entrega.") }),
  output: entregaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeSinAlcance(ctx);
    const actual = await ctx.db.webhookEntrega.findUnique({
      where: { id: input.id },
      select: SELECT_ENTREGA,
    });
    if (!actual) throw noEncontrado("La entrega");
    const ahora = new Date();
    const cambios = { estado: "pendiente", proximoIntentoEn: ahora, ultimoError: null };
    if (dryRun) return vista({ ...actual, ...cambios });
    const e = await ctx.db.webhookEntrega.update({
      where: { id: actual.id },
      data: cambios,
      select: SELECT_ENTREGA,
    });
    await encolarEnvio(ctx, ahora, `reenvio:${e.id}:${ahora.toISOString()}`);
    return vista(e);
  },
});
