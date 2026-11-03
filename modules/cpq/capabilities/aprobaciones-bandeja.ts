import { z } from "zod";

import { defineCapability, noEncontrado, prohibido, type Contexto } from "@opai/capabilities";

import { PERMISOS_CORE } from "@opai/domain";

import { parseIdBandejaCpq } from "../persistencia/aprobaciones-bandeja-id";
import { listarBandejaCpq, obtenerBandejaCpq } from "../persistencia/aprobaciones-bandeja";
import { uuidSchema } from "./esquemas";

const itemSchema = z.object({
  id: z.string(),
  tipo: z.enum(["margen", "envio_propuesta"]),
  estado: z.string(),
  resumen: z.string(),
  cotizacionId: uuidSchema,
  codigo: z.string(),
  titulo: z.string(),
  cuentaNombre: z.string(),
  ventaMensualClp: z.number().nullable(),
  margenEfectivoPct: z.number().nullable(),
  margenMinimoPct: z.number(),
  solicitanteId: uuidSchema,
  solicitanteNombre: z.string(),
  comentario: z.string().nullable(),
  creadaEn: z.string(),
  resueltaEn: z.string().nullable(),
  motivo: z.string().nullable(),
  enlaceCotizacion: z.string(),
  enlaceBandeja: z.string(),
});

function exigirLectorCpq(ctx: Contexto) {
  if (
    !ctx.autorizar("cpq:aprobar") &&
    !ctx.autorizar("cpq:envios.aprobar") &&
    !ctx.autorizar(PERMISOS_CORE.aprobacionesManage)
  ) {
    throw prohibido("No tienes acceso a las aprobaciones de CPQ.");
  }
}

export const cpqAprobacionesList = defineCapability({
  id: "cpq.aprobaciones.list",
  descripcion:
    "Pendientes de aprobación de margen y envíos conjuntos de CPQ para la bandeja de Configuración.",
  permiso: null,
  auditarLectura: (s) => s.map((i) => i.cotizacionId),
  input: z.object({
    historial: z.boolean().optional(),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.array(itemSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    exigirLectorCpq(ctx);
    const items = await listarBandejaCpq(ctx, input.historial ?? false);
    return items.slice(0, input.limite);
  },
});

export const cpqAprobacionesGet = defineCapability({
  id: "cpq.aprobaciones.get",
  descripcion: "Detalle de una aprobación CPQ en la bandeja (margen o envío conjunto).",
  permiso: null,
  auditarLectura: (s) => [s.cotizacionId],
  input: z.object({ id: z.string().min(1) }),
  output: itemSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    exigirLectorCpq(ctx);
    if (!parseIdBandejaCpq(input.id)) throw noEncontrado("La aprobación");
    const item = await obtenerBandejaCpq(ctx, input.id);
    if (!item) throw noEncontrado("La aprobación");
    return item;
  },
});

export const cpqAprobacionesContar = defineCapability({
  id: "cpq.aprobaciones.contar",
  descripcion: "Conteo de pendientes CPQ para la campana y la bandeja.",
  permiso: null,
  auditarLectura: () => [],
  input: z.object({}),
  output: z.object({ pendientes: z.number() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    exigirLectorCpq(ctx);
    const { contarPendientesBandejaCpq } = await import("../persistencia/aprobaciones-bandeja");
    return { pendientes: await contarPendientesBandejaCpq(ctx) };
  },
});
