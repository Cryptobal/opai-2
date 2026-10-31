// Piezas comunes de CRM PR 2a (CAR-26): vínculo contacto–cuenta, actividad unificada y etiquetas.
import { z } from "zod";

import { noEncontrado, prohibido } from "../../errores";
import type { Contexto } from "../../types";
import { dondeContacto, dondeCuenta, dondeInstalacion } from "../maestros/alcance";

export const ROLES_CUENTA = [
  "comercial",
  "operacional",
  "facturacion",
  "cobranza",
  "cesion",
] as const;
export const TIPOS_ACTIVIDAD = [
  "nota",
  "llamada",
  "correo",
  "whatsapp",
  "reunion",
  "visita",
  "tarea",
] as const;
export const ENTIDADES_ACTIVIDAD = ["negocio", "cuenta", "contacto", "instalacion"] as const;
export const ENTIDADES_ETIQUETA = ["negocio", "cuenta", "contacto"] as const;
export const TONOS_ETIQUETA = ["neutral", "info", "success", "warning", "danger"] as const;

export type EntidadActividad = (typeof ENTIDADES_ACTIVIDAD)[number];

export const rolesCuentaSchema = z.array(z.enum(ROLES_CUENTA)).max(ROLES_CUENTA.length);
export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** Columna de la tabla de vínculos o asignaciones que corresponde a cada tipo de entidad. */
export const columnaDe = (tipo: EntidadActividad) => `${tipo}Id` as const;

/** Las cuatro columnas de entidad de un vínculo, con solo la del `tipo` llena (CHECK: exactamente una). */
export const refDe = (tipo: EntidadActividad, id: string) => ({
  negocioId: tipo === "negocio" ? id : null,
  cuentaId: tipo === "cuenta" ? id : null,
  contactoId: tipo === "contacto" ? id : null,
  instalacionId: tipo === "instalacion" ? id : null,
});

/**
 * Exige que la entidad exista en la empresa y esté en el alcance del actor (ADR-022). Fuera de
 * alcance responde igual que inexistente: no confirma que exista.
 */
export async function exigirEntidad(ctx: Contexto, tipo: EntidadActividad, id: string) {
  // Un negocio es información de Comercial: sin su permiso de lectura no se acepta ni se devuelve.
  if (tipo === "negocio" && !ctx.autorizar("comercial:negocios.read"))
    throw prohibido("Sin permiso para ver negocios.");
  const dondeId = { id };
  const n =
    tipo === "negocio"
      ? await ctx.db.negocio.count({ where: dondeId })
      : tipo === "cuenta"
        ? await ctx.db.cuenta.count({ where: { ...dondeId, AND: [dondeCuenta(ctx)] } })
        : tipo === "contacto"
          ? await ctx.db.contacto.count({ where: { ...dondeId, AND: [dondeContacto(ctx)] } })
          : await ctx.db.instalacion.count({ where: { ...dondeId, AND: [dondeInstalacion(ctx)] } });
  if (!n) throw noEncontrado(`La entidad (${tipo})`);
}

/** Los responsables son usuarios con membresía activa en esta empresa (core.users es global). */
export async function exigirResponsables(ctx: Contexto, ids: readonly string[]) {
  if (!ids.length) return;
  const m = await ctx.db.membership.findMany({
    where: { userId: { in: [...ids] }, estado: "activa" },
    select: { userId: true },
  });
  if (new Set(m.map((x) => x.userId)).size !== new Set(ids).size)
    throw noEncontrado("El responsable");
}
