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
  "solicitudesNuevas",
  "tareasSeguimiento",
] as const;

export const resumenContadores = defineCapability({
  id: "core.resumen.contadores",
  descripcion:
    "Conteos para la navegación: cuentas, instalaciones y personas activas, aprobaciones de agentes pendientes, avisos sin leer del usuario, solicitudes nuevas por revisar y pasos de seguimiento comercial por hacer del usuario (suman al número de la Bandeja). null donde el actor no tiene permiso, el módulo no está activo o no se pidió el conteo.",
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
    solicitudesNuevas: n,
    tareasSeguimiento: n,
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
    const [
      cuentas,
      instalaciones,
      personas,
      aprobacionesPendientes,
      notificacionesNoLeidas,
      solicitudesNuevas,
      tareasSeguimiento,
    ] = await Promise.all([
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
        // Solicitudes «nuevas» (sin derivar ni convertir): lo que espera revisión en la bandeja.
        ctx.modulosActivos.includes("comercial")
          ? si("solicitudesNuevas", "comercial:solicitudes.read", () =>
              ctx.db.solicitud.count({ where: { estado: "nueva" } }),
            )
          : Promise.resolve(null),
        // Pasos de seguimiento por hacer del usuario, con su tarea creada (CAR-160, decisión de Carlos del
        // 11-nov-2026): suman al número de la Bandeja, donde aparecen como tareas asignadas.
        usuario && ctx.modulosActivos.includes("comercial")
          ? si("tareasSeguimiento", "comercial:negocios.read", () =>
              ctx.db.seguimientoPaso.count({
                where: { estado: "por_hacer", asignadoId: usuario, actividadId: { not: null } },
              }),
            )
          : Promise.resolve(null),
      ]);
    return {
      cuentas,
      instalaciones,
      personas,
      aprobacionesPendientes,
      notificacionesNoLeidas,
      solicitudesNuevas,
      tareasSeguimiento,
    };
  },
});
