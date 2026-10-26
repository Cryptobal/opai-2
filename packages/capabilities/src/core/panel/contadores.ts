import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";

const n = z.number().nullable();

const CAMPOS = [
  "cuentas",
  "instalaciones",
  "personas",
  "aprobacionesPendientes",
  "notificacionesNoLeidas",
] as const;

export const resumenContadores = defineCapability({
  id: "core.resumen.contadores",
  descripcion:
    "Conteos para la navegación: cuentas, instalaciones y personas activas, aprobaciones de agentes pendientes y avisos sin leer del usuario. null donde el actor no tiene permiso o donde no se pidió el conteo.",
  permiso: null,
  input: z.object({
    campos: z
      .array(z.enum(CAMPOS))
      .optional()
      .describe("Solo estos conteos (el resto va en null). Por defecto, todos."),
  }),
  output: z.object({
    cuentas: n,
    instalaciones: n,
    personas: n,
    aprobacionesPendientes: n,
    notificacionesNoLeidas: n,
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const pedido = input.campos ? new Set(input.campos) : null;
    // Solo se consulta lo pedido y permitido: una pantalla que necesita un conteo no paga los cinco.
    const si = <T>(campo: (typeof CAMPOS)[number], permiso: string | null, f: () => Promise<T>) =>
      (!pedido || pedido.has(campo)) && (permiso === null || ctx.autorizar(permiso))
        ? f()
        : Promise.resolve(null);
    const usuario = ctx.actor.tipo === "user" ? ctx.actor.id : null;
    const [cuentas, instalaciones, personas, aprobacionesPendientes, notificacionesNoLeidas] =
      await Promise.all([
        si("cuentas", PERMISOS_CORE.cuentasRead, () =>
          ctx.db.cuenta.count({ where: { archivadaEn: null } }),
        ),
        si("instalaciones", PERMISOS_CORE.instalacionesRead, () =>
          ctx.db.instalacion.count({ where: { archivadaEn: null } }),
        ),
        si("personas", PERMISOS_CORE.personasRead, () =>
          ctx.db.persona.count({ where: { archivadaEn: null } }),
        ),
        si("aprobacionesPendientes", PERMISOS_CORE.aprobacionesManage, () =>
          ctx.db.aprobacion.count({ where: { estado: "pendiente", venceEn: { gt: new Date() } } }),
        ),
        usuario
          ? si("notificacionesNoLeidas", null, () =>
              ctx.db.notificacion.count({ where: { usuarioId: usuario, leidaEn: null } }),
            )
          : Promise.resolve(null),
      ]);
    return { cuentas, instalaciones, personas, aprobacionesPendientes, notificacionesNoLeidas };
  },
});
