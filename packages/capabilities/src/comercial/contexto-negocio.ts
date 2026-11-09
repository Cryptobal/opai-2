import { z } from "zod";

import { TIPOS_CONTEXTO, estadoInicialContexto } from "@opai/domain";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_MANAGE, PERMISO_READ, negocioDe } from "./comun";
import { contextoSchema, fecha, vista } from "./contexto-negocio-comun";

export const contextoListar = defineCapability({
  // Notas de lo que se sabe del cliente: se audita cada entrada mostrada, sin copiar su contenido.
  auditarLectura: (s) => s.map((c) => c.id),
  id: "comercial.contexto.listar",
  descripcion:
    "Contexto comercial de un negocio: lo que se sabe del cliente y de su necesidad, con su fuente y fecha, separando lo confirmado por una persona de lo inferido. Más reciente primero.",
  permiso: PERMISO_READ,
  input: z.object({ negocioId: uuidSchema, soloConfirmado: z.boolean().default(false) }),
  output: z.array(contextoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const negocio = await negocioDe(ctx, input.negocioId);
    const filas = await ctx.db.negocioContexto.findMany({
      where: {
        negocioId: negocio.id,
        archivadoEn: null,
        ...(input.soloConfirmado ? { estado: "confirmado" } : {}),
      },
      orderBy: [{ fechaFuente: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    return filas.map(vista);
  },
});

export const contextoAgregar = defineCapability({
  id: "comercial.contexto.agregar",
  descripcion:
    "Agrega una nota de contexto comercial a un negocio con su fuente y fecha. Una persona puede registrarla como confirmada; lo que registra un agente queda siempre como inferido hasta que una persona lo confirme.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    negocioId: uuidSchema,
    tipo: z.enum(TIPOS_CONTEXTO).default("nota"),
    resumen: z.string().trim().min(3).max(2000),
    fuente: z.string().trim().min(2).max(200),
    fechaFuente: fecha,
    estado: z.enum(["confirmado", "inferido"]).optional(),
  }),
  output: contextoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.negocioId);
    const hoy = new Date().toISOString().slice(0, 10);
    if (input.fechaFuente > hoy) throw reglaDeNegocio("La fecha de la fuente no puede ser futura.");
    const estado = estadoInicialContexto(ctx.actor.tipo, input.estado);
    const datos = {
      tenantId: ctx.tenantId,
      negocioId: negocio.id,
      tipo: input.tipo,
      resumen: input.resumen,
      fuente: input.fuente,
      fechaFuente: new Date(`${input.fechaFuente}T00:00:00.000Z`),
      estado,
      creadoPorTipo: ctx.actor.tipo,
      creadoPorId: ctx.actor.id ?? null,
      confirmadoPorId: estado === "confirmado" ? (ctx.actor.id ?? null) : null,
      confirmadoEn: estado === "confirmado" ? new Date() : null,
    };
    if (dryRun) return vista({ id: "", ...datos, confirmadoEn: datos.confirmadoEn });
    return ctx.transaccion(async (tx) => {
      const fila = await tx.negocioContexto.create({ data: datos });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.actualizado",
        entidadTipo: "negocio",
        entidadId: negocio.id,
        payload: { contexto: "agregado" },
      });
      return vista(fila);
    });
  },
});
