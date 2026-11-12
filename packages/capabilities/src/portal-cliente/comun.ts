import { z } from "zod";

import {
  ESTADOS_ACCESO,
  esMembresiaDeCliente,
  instalacionesVisibles,
  RUT_EN_REPORTES,
  SECCIONES_PORTAL,
  type AccesoBase,
  type Rol,
} from "@opai/domain";

import { noEncontrado, prohibido } from "../errores";
import type { Contexto } from "../types";

/** Estado de cuenta que suspende el Portal Cliente de sus contactos. */
export const ESTADO_CUENTA_INACTIVA = "cliente_inactivo";

export const PERMISO_PORTAL = "portal_cliente:read";
export const PERMISO_ACCESOS_READ = "portal_cliente:accesos.read";
export const PERMISO_ACCESOS_MANAGE = "portal_cliente:accesos.manage";
export const PERMISO_CONFIG_READ = "portal_cliente:config.read";
export const PERMISO_CONFIG_MANAGE = "portal_cliente:config.manage";

/** Nombre del rol sistema que reciben los contactos de un cliente: solo `portal_cliente:read`. */
export const ROL_CONTACTO_CLIENTE = "Contacto del cliente";

export const estadoAccesoSchema = z.enum(ESTADOS_ACCESO);
export const seccionSchema = z.enum(SECCIONES_PORTAL);
export const rutEnReportesSchema = z.enum(RUT_EN_REPORTES);

export const configSchema = z.object({
  tiposDocumentoVisibles: z.array(z.string()),
  seccionesVisibles: z.array(seccionSchema),
  muestraFotoGuardias: z.boolean(),
  muestraRutGuardias: z.boolean(),
  rutEnReportes: rutEnReportesSchema,
  gestionaListas: z.boolean(),
  destinatariosInforme: z.array(z.string()),
});

/** Una cuenta del tenant, o NOT_FOUND. */
export async function cuentaDe(ctx: Contexto, id: string) {
  const c = await ctx.db.cuenta.findFirst({
    where: { id },
    select: { id: true, nombre: true, archivadaEn: true, estado: true },
  });
  if (!c) throw noEncontrado("La cuenta");
  return c;
}

/** Instalaciones de una cuenta (id, nombre y los datos que decide la visibilidad). */
export async function instalacionesDeCuenta(ctx: Contexto, cuentaId: string) {
  return ctx.db.instalacion.findMany({
    where: { cuentaId },
    select: {
      id: true,
      nombre: true,
      estado: true,
      archivadaEn: true,
      cuentaId: true,
      direccionFormateada: true,
      comuna: true,
    },
    orderBy: { nombre: "asc" },
  });
}

export type AccesoResuelto = {
  accesoId: string;
  membershipId: string;
  cuentaId: string;
  cuentaNombre: string;
  /** «limitado» = prospecto que solo ve su propuesta (CAR-300); «completo» = el portal entero. */
  alcance: "completo" | "limitado";
  todasInstalaciones: boolean;
  /** Instalaciones que ve (ya filtradas: activas, sin archivar, de su cuenta). */
  instalacionIds: string[];
  instalaciones: Awaited<ReturnType<typeof instalacionesDeCuenta>>;
};

/**
 * Resuelve el acceso del actor al portal (FAIL-CLOSED, ADR-022): solo una persona con membresía de
 * contacto de cliente (rol viewer con «cliente» como único portal) y un acceso `activo` entra. Todo
 * lo demás (key sin usuario, membresía interna, sin fila, suspendido, revocado, cuenta inactiva) es FORBIDDEN con el
 * mismo mensaje, sin revelar cuál fue la causa. Un acceso de alcance «limitado» (prospecto) NO pasa por
 * aquí salvo que la capacidad lo permita expresamente (`permitirLimitado`): así no abre el portal completo.
 */
export async function accesoDelActor(
  ctx: Contexto,
  opciones: { permitirLimitado?: boolean } = {},
): Promise<AccesoResuelto> {
  const negado = () => prohibido("Tu usuario no tiene un perfil de contacto activo en el Portal Cliente.");
  if (ctx.actor.tipo !== "user" || !ctx.usuario) throw negado();
  const m = await ctx.db.membership.findUnique({
    where: { tenantId_userId: { tenantId: ctx.tenantId, userId: ctx.usuario.id } },
    select: { id: true, rol: true, portales: true, estado: true },
  });
  if (!m || m.estado !== "activa" || !esMembresiaDeCliente(m.rol as Rol, m.portales)) throw negado();
  const fila = await ctx.db.accesoCliente.findUnique({
    where: { tenantId_membershipId: { tenantId: ctx.tenantId, membershipId: m.id } },
    include: { instalaciones: { select: { instalacionId: true } } },
  });
  if (!fila || fila.estado !== "activo") throw negado();
  const cuenta = await ctx.db.cuenta.findFirst({
    where: { id: fila.cuentaId },
    select: { id: true, nombre: true, estado: true },
  });
  // Cuenta inactiva = portal suspendido (CAR-217). No se toca la fila de acceso: al reactivar la
  // cuenta, los contactos recuperan el acceso solos.
  if (!cuenta || cuenta.estado === ESTADO_CUENTA_INACTIVA) throw negado();
  // «Limitado» solo mientras la cuenta es prospecto: al ganarla (cliente activo) el acceso activo pasa a completo
  // sin tocar la fila (se deriva al leer); uno suspendido o revocado ya quedó fuera arriba (CAR-300).
  const alcance = fila.alcance === "limitado" && cuenta.estado === "prospecto" ? "limitado" : "completo";
  if (alcance === "limitado" && !opciones.permitirLimitado) throw negado();
  const instalaciones = await instalacionesDeCuenta(ctx, cuenta.id);
  const base: AccesoBase = {
    estado: fila.estado,
    cuentaId: fila.cuentaId,
    todasInstalaciones: fila.todasInstalaciones,
    instalaciones: fila.instalaciones.map((i) => i.instalacionId),
  };
  const ids = instalacionesVisibles(
    base,
    instalaciones.map((i) => ({
      id: i.id,
      cuentaId: i.cuentaId,
      estado: i.estado,
      archivada: i.archivadaEn !== null,
    })),
  );
  return {
    accesoId: fila.id,
    membershipId: m.id,
    cuentaId: cuenta.id,
    cuentaNombre: cuenta.nombre,
    alcance,
    todasInstalaciones: fila.todasInstalaciones,
    instalacionIds: ids,
    instalaciones: instalaciones.filter((i) => ids.includes(i.id)),
  };
}
