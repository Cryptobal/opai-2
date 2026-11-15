import { cookies } from "next/headers";
import { cache } from "react";

import type { Contexto } from "@opai/capabilities";
import { getSession } from "@opai/auth";
import { PERMISOS_CORE } from "@opai/domain";

import { tieneAccesoAPortal } from "./acceso-portal";
import { contextoDeIdentidad, identidadDe, type Identidad } from "./actor";
import { fuentesReales } from "./fuentes";
import { COOKIE_VER_COMO, leerVerComo, type VerComo } from "./ver-como-token";

/**
 * La vista «ver como» vigente de quien tiene la sesión (CAR-528), o null. En cada petición se vuelve
 * a comprobar: firma y vencimiento, misma persona, misma sesión (cerrar sesión la invalida), misma
 * empresa (cambiar de empresa también) y que siga teniendo el permiso.
 */
export async function verComoDe(identidad: Identidad): Promise<VerComo | null> {
  const v = leerVerComo((await cookies()).get(COOKIE_VER_COMO)?.value);
  if (!v || !identidad.actual) return null;
  if (identidad.usuario.id !== v.porUserId || identidad.actual.tenantId !== v.tenantId) return null;
  const sesion = await getSession();
  if (sesion?.session.id !== v.sesionId) return null;
  const propio = contextoDeIdentidad(identidad, "erp");
  return propio.autorizar(PERMISOS_CORE.verComoIniciar) ? v : null;
}

/** Identidad de la persona vista en esa empresa, una vez por render; sin rol de plataforma. */
const identidadVista = cache(
  async (userId: string, tenantId: string): Promise<Identidad | null> => {
    const u = await fuentesReales.usuario(userId);
    if (!u) return null;
    const vista = await identidadDe({ ...u, platformRole: null }, tenantId);
    return vista.actual?.tenantId === tenantId ? vista : null;
  },
);

/**
 * Contexto de la persona vista en ese portal, marcado `verComo`: `restriccion` rechaza toda escritura
 * y las lecturas auditadas registran a quien mira. Sin revalidación de sesión (no es la suya).
 */
export async function contextoVerComo(v: VerComo, portal: string): Promise<Contexto | null> {
  if (!v.userId || v.portal !== portal) return null;
  const vista = await identidadVista(v.userId, v.tenantId);
  if (!vista || !tieneAccesoAPortal(vista, portal)) return null;
  const ctx = contextoDeIdentidad(vista, portal, { obtenerSesion: async () => null });
  ctx.verComo = { porUserId: v.porUserId };
  return ctx;
}
