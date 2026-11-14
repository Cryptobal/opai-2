import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { cursorDe, pagina } from "../maestros/comun";
import {
  cifrarSecreto,
  descripcionSchema,
  destinoDe,
  destinoSchema,
  eventosSchema,
  eventosValidos,
  exigeSinAlcance,
  generarSecreto,
  MAX_DESTINOS,
  SELECT_DESTINO,
  urlSchema,
  urlValida,
  vistaDestino,
} from "./comun";

export const webhooksDestinosList = defineCapability({
  id: "core.webhooks.destinos_list",
  descripcion:
    "Destinos de eventos salientes (webhooks) de la empresa: dirección, eventos suscritos, si está activo y los últimos caracteres de su secreto de firma (el secreto nunca se muestra). Paginada por cursor.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({
    // CAR-353: contrato único de listas (cursor + limite; items + siguiente).
    cursor: z.uuid().optional().describe("Id del último destino de la página anterior."),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({ items: z.array(destinoSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    exigeSinAlcance(ctx);
    const filas = await ctx.db.webhookDestino.findMany({
      select: SELECT_DESTINO,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente } = pagina(filas, input.limite, input.cursor);
    return { items: items.map(vistaDestino), siguiente };
  },
});

const creadoSchema = destinoSchema.extend({
  /** Solo en la creación real. No se puede recuperar después: si se pierde, se rota. */
  secreto: z.string().nullable(),
});

export const webhooksDestinoCreate = defineCapability({
  id: "core.webhooks.destino_crear",
  // Un destino saca eventos de la empresa hacia afuera: lo configura una persona, no un agente.
  soloPersonas: true,
  descripcion:
    "Crea un destino de eventos salientes (webhook): una dirección https pública que recibirá, firmados, los eventos elegidos del catálogo. Devuelve el secreto de firma UNA sola vez.",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({ url: urlSchema, eventos: eventosSchema, descripcion: descripcionSchema }),
  output: creadoSchema,
  // El secreto no queda guardado en la tabla de idempotencia.
  salidaIdempotente: (s) => ({ ...s, secreto: null }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeSinAlcance(ctx);
    const url = urlValida(input.url);
    const eventos = eventosValidos(input.eventos);
    const lleno = async (db: Pick<typeof ctx.db, "webhookDestino">) =>
      (await db.webhookDestino.count()) >= MAX_DESTINOS;
    const tope = () =>
      reglaDeNegocio(`La empresa ya tiene el máximo de ${MAX_DESTINOS} destinos de eventos.`);
    if (await lleno(ctx.db)) throw tope();
    const base = {
      url,
      descripcion: input.descripcion || null,
      eventos,
      activo: true,
    };
    if (dryRun) {
      const ahora = new Date();
      return {
        id: "",
        ...base,
        secretoSufijo: "",
        secretoRotadoEn: ahora,
        createdAt: ahora,
        updatedAt: ahora,
        secreto: null,
      };
    }
    const secreto = generarSecreto();
    const d = await ctx.transaccion(async (tx) => {
      // Cuenta y alta bajo el mismo candado: dos altas simultáneas no pasan el tope.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ctx.tenantId} || ':webhooks'))`;
      if (await lleno(tx)) throw tope();
      return tx.webhookDestino.create({
        data: {
          tenantId: ctx.tenantId,
          ...base,
          ...(await cifrarSecreto(ctx, tx, secreto)),
          creadoPor: ctx.usuario?.id ?? null,
        },
        select: SELECT_DESTINO,
      });
    });
    return { ...vistaDestino(d), secreto };
  },
});

export const webhooksDestinoUpdate = defineCapability({
  id: "core.webhooks.destino_actualizar",
  soloPersonas: true,
  descripcion:
    "Cambia la dirección, los eventos suscritos, la descripción de un destino de eventos salientes, o lo pausa y reactiva. El secreto de firma no cambia (para eso está rotar).",
  permiso: PERMISOS_CORE.apikeysManage,
  input: z.object({
    id: uuidSchema.describe("Id del destino."),
    url: urlSchema.optional(),
    eventos: eventosSchema.optional(),
    descripcion: descripcionSchema,
    activo: z.boolean().optional().describe("false pausa los envíos; true los reanuda."),
  }),
  output: destinoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeSinAlcance(ctx);
    const actual = await destinoDe(ctx, input.id);
    const cambios = {
      ...(input.url !== undefined ? { url: urlValida(input.url) } : {}),
      ...(input.eventos !== undefined ? { eventos: eventosValidos(input.eventos) } : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion || null } : {}),
      ...(input.activo !== undefined ? { activo: input.activo } : {}),
    };
    if (dryRun) return vistaDestino({ ...actual, ...cambios });
    const d = await ctx.db.webhookDestino.update({
      where: { id: actual.id },
      data: cambios,
      select: SELECT_DESTINO,
    });
    return vistaDestino(d);
  },
});
