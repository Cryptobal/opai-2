import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { listarModulos } from "../module";

/**
 * La empresa no activa módulos: los solicita y OPAI los activa (`platform.modules.set`). La
 * solicitud queda como evento de dominio (outbox) y en la auditoría, para que plataforma la vea.
 */
export const modulesSolicitar = defineCapability({
  id: "core.modules.solicitar",
  descripcion:
    "Solicita a OPAI activar (o reactivar) un módulo para la empresa, con un mensaje opcional. OPAI lo activa desde Plataforma; aquí solo queda registrada la solicitud.",
  permiso: PERMISOS_CORE.tenantManage,
  input: z.object({
    moduloId: z.string().trim().min(1).max(60),
    mensaje: z.string().trim().max(500).optional(),
  }),
  output: z.object({ moduloId: z.string(), nombre: z.string(), estado: z.literal("solicitado") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const m = listarModulos().find((x) => x.id === input.moduloId);
    if (!m) throw noEncontrado(`El módulo "${input.moduloId}"`);
    const actual = await ctx.db.tenantModule.findFirst({ where: { moduloId: m.id } });
    if (actual?.estado === "activo") throw reglaDeNegocio(`${m.nombre} ya está activo.`);
    const salida = { moduloId: m.id, nombre: m.nombre, estado: "solicitado" as const };
    if (dryRun) return salida;
    await ctx.transaccion((tx) =>
      ctx.eventos.emitir(tx, {
        tipo: "core.modulo.solicitado",
        entidadTipo: "modulo",
        payload: {
          moduloId: m.id,
          estadoActual: actual?.estado ?? null,
          mensaje: input.mensaje ?? null,
          solicitadoPor: ctx.usuario?.id ?? null,
        },
      }),
    );
    return salida;
  },
});
