import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { dondeCuenta, dondeInstalacion, dondePersona } from "../maestros/alcance";
import { SIN_PLATAFORMA } from "../../agentes/plataforma";

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
          ctx.db.cuenta.count({ where: { archivadaEn: null, AND: [dondeCuenta(ctx)] } }),
        ),
        si("instalaciones", PERMISOS_CORE.instalacionesRead, () =>
          ctx.db.instalacion.count({ where: { archivadaEn: null, AND: [dondeInstalacion(ctx)] } }),
        ),
        si("personas", PERMISOS_CORE.personasRead, () =>
          ctx.db.persona.count({ where: { archivadaEn: null, AND: [dondePersona(ctx)] } }),
        ),
        si("aprobacionesPendientes", null, async () => {
          const puedeAgente = ctx.autorizar(PERMISOS_CORE.aprobacionesManage);
          const puedeMargen = ctx.autorizar("cpq:aprobar");
          const puedeEnvio = ctx.autorizar("cpq:envios.aprobar");
          if (!puedeAgente && !puedeMargen && !puedeEnvio) return null;
          const [agente, margen, envio] = await Promise.all([
            puedeAgente
              ? ctx.db.aprobacion.count({
                  where: { estado: "pendiente", venceEn: { gt: new Date() }, ...SIN_PLATAFORMA },
                })
              : Promise.resolve(0),
            puedeMargen
              ? ctx.db.cpqAprobacion.count({ where: { estado: "pendiente" } })
              : Promise.resolve(0),
            puedeEnvio
              ? ctx.db.cpqPropuestaEnvio.count({ where: { estado: "pendiente_aprobacion" } })
              : Promise.resolve(0),
          ]);
          return agente + margen + envio;
        }),
        usuario
          ? si("notificacionesNoLeidas", null, () =>
              ctx.db.notificacion.count({ where: { usuarioId: usuario, leidaEn: null } }),
            )
          : Promise.resolve(null),
      ]);
    return { cuentas, instalaciones, personas, aprobacionesPendientes, notificacionesNoLeidas };
  },
});
