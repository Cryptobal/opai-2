import { z } from "zod";

import type { TenantTx } from "@opai/db";

/**
 * Efectos de ganar un negocio (R18 de comercial.md, R2 y R45 de cpq.md). Un solo planificador que usan
 * la vista previa de `comercial.negocios.ganar` (dryRun) y los consumidores de
 * `comercial.negocio.ganado`, para que lo que se muestra sea lo que se aplica.
 */

/** Estados de cuenta que pasan a `cliente_activo` al ganar (R18; la inactiva vuelve a activa). */
export const CUENTA_SE_ACTIVA = ["prospecto", "cliente_inactivo"] as const;
/** Estados de instalación que se activan al ganar (R18). */
export const INSTALACION_SE_ACTIVA = ["prospecto", "inactiva"] as const;
/** Versiones abiertas de CPQ (R40): las que se rechazan si no son la aceptada (R45). */
export const VERSION_ABIERTA = ["borrador", "en_aprobacion", "lista", "enviada"] as const;

export const efectosGanarSchema = z.object({
  cuenta: z
    .object({ id: z.string(), nombre: z.string(), desde: z.string(), hacia: z.literal("cliente_activo") })
    .nullable(),
  instalaciones: z.array(z.object({ id: z.string(), nombre: z.string(), desde: z.string() })),
  cotizacion: z
    .object({ id: z.string(), versionId: z.string(), codigo: z.string(), version: z.number() })
    .nullable(),
  /** Versiones abiertas del negocio que quedan rechazadas (R45). */
  rechazadas: z.number(),
  /** Posiciones de las líneas de guardias de la aceptada: se ofrecen a RRHH (R2, pendiente). */
  puestosPorOfrecer: z.number(),
});
export type EfectosGanar = z.infer<typeof efectosGanarSchema>;

type VersionFila = { id: string; numero: number; estado: string; cotizacionId: string };

/** R45: la versión que se acepta es la enviada más reciente de la cotización vigente. */
export function versionAAceptar(
  vigenteId: string | null,
  versiones: readonly VersionFila[],
): VersionFila | null {
  if (!vigenteId) return null;
  const enviadas = versiones
    .filter((v) => v.cotizacionId === vigenteId && v.estado === "enviada")
    .sort((a, b) => b.numero - a.numero);
  return enviadas[0] ?? null;
}

/** Lee el estado actual y calcula los efectos de ganar el negocio. Solo lectura; idempotente. */
export async function planGanar(db: TenantTx, negocio: { id: string; cuentaId: string }) {
  const [cuenta, vinculos, cotizaciones] = await Promise.all([
    db.cuenta.findUnique({
      where: { id: negocio.cuentaId },
      select: { id: true, nombre: true, estado: true },
    }),
    db.negocioInstalacion.findMany({
      where: { negocioId: negocio.id },
      select: { instalacionId: true },
    }),
    db.cpqCotizacion.findMany({
      where: { negocioId: negocio.id },
      select: { id: true, codigo: true, vigente: true },
    }),
  ]);
  const instalaciones = vinculos.length
    ? await db.instalacion.findMany({
        where: { id: { in: vinculos.map((v) => v.instalacionId) } },
        select: { id: true, nombre: true, estado: true, archivadaEn: true },
      })
    : [];
  const versiones = cotizaciones.length
    ? await db.cpqVersion.findMany({
        where: { cotizacionId: { in: cotizaciones.map((c) => c.id) } },
        select: { id: true, numero: true, estado: true, cotizacionId: true },
      })
    : [];
  const vigente = cotizaciones.find((c) => c.vigente) ?? null;
  const aceptar = versionAAceptar(vigente?.id ?? null, versiones);
  // R45: solo con una vigente enviada que se acepta se rechazan las demás abiertas; sin ella (ganar
  // sin cotización enviada) no se toca ninguna versión, para no perder un borrador en curso.
  const rechazar = aceptar
    ? versiones.filter(
        (v) => v.id !== aceptar.id && (VERSION_ABIERTA as readonly string[]).includes(v.estado),
      )
    : [];
  const puestosPorOfrecer = aceptar ? await posicionesDeGuardias(db, aceptar.id) : 0;
  const activaCuenta =
    cuenta && (CUENTA_SE_ACTIVA as readonly string[]).includes(cuenta.estado) ? cuenta : null;
  const efectos: EfectosGanar = {
    cuenta: activaCuenta
      ? { id: activaCuenta.id, nombre: activaCuenta.nombre, desde: activaCuenta.estado, hacia: "cliente_activo" }
      : null,
    instalaciones: instalaciones
      .filter(
        (i) => !i.archivadaEn && (INSTALACION_SE_ACTIVA as readonly string[]).includes(i.estado),
      )
      .map((i) => ({ id: i.id, nombre: i.nombre, desde: i.estado }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    cotizacion:
      aceptar && vigente
        ? { id: vigente.id, versionId: aceptar.id, codigo: vigente.codigo, version: aceptar.numero }
        : null,
    rechazadas: rechazar.length,
    puestosPorOfrecer,
  };
  return { efectos, rechazarIds: rechazar.map((v) => v.id) };
}

/** Suma de posiciones de las líneas de guardias habilitadas de una versión (R2). */
async function posicionesDeGuardias(db: TenantTx, versionId: string) {
  const secciones = await db.cpqSeccion.findMany({ where: { versionId }, select: { id: true } });
  if (!secciones.length) return 0;
  const lineas = await db.cpqLinea.findMany({
    where: { seccionId: { in: secciones.map((s) => s.id) }, tipo: "puesto", habilitada: true },
    select: { posiciones: true },
  });
  return lineas.reduce((t, l) => t + l.posiciones, 0);
}
