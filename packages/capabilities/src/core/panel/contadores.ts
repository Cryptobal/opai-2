import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";

const n = z.number().nullable();

export const resumenContadores = defineCapability({
  id: "core.resumen.contadores",
  descripcion:
    "Conteos para la navegación: cuentas, instalaciones y personas activas, aprobaciones de agentes pendientes y avisos sin leer del usuario. null donde el actor no tiene permiso.",
  permiso: null,
  input: z.object({}),
  output: z.object({
    cuentas: n,
    instalaciones: n,
    personas: n,
    aprobacionesPendientes: n,
    notificacionesNoLeidas: n,
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const si = <T>(permiso: string, f: () => Promise<T>) =>
      ctx.autorizar(permiso) ? f() : Promise.resolve(null);
    const usuario = ctx.actor.tipo === "user" ? ctx.actor.id : null;
    const [cuentas, instalaciones, personas, aprobacionesPendientes, notificacionesNoLeidas] =
      await Promise.all([
        si(PERMISOS_CORE.cuentasRead, () => ctx.db.cuenta.count({ where: { archivadaEn: null } })),
        si(PERMISOS_CORE.instalacionesRead, () =>
          ctx.db.instalacion.count({ where: { archivadaEn: null } }),
        ),
        si(PERMISOS_CORE.personasRead, () =>
          ctx.db.persona.count({ where: { archivadaEn: null } }),
        ),
        si(PERMISOS_CORE.aprobacionesManage, () =>
          ctx.db.aprobacion.count({ where: { estado: "pendiente", venceEn: { gt: new Date() } } }),
        ),
        usuario
          ? ctx.db.notificacion.count({ where: { usuarioId: usuario, leidaEn: null } })
          : Promise.resolve(null),
      ]);
    return { cuentas, instalaciones, personas, aprobacionesPendientes, notificacionesNoLeidas };
  },
});
