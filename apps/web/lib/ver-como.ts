import { cookies } from "next/headers";
import { cache } from "react";

import { crearContexto, type Contexto } from "@opai/capabilities";
import { getSession } from "@opai/auth";
import { esRol, PERMISOS_CORE, puedeAsignarRol } from "@opai/domain";

import { tieneAccesoAPortal } from "./acceso-portal";
import { contextoDeIdentidad, identidadDe, type Identidad } from "./actor";
import { fuentesReales } from "./fuentes";
import { COOKIE_VER_COMO, leerVerComo, type VerComo } from "./ver-como-token";
import { despacharDiferido, medidorDiferido, diferirConAfter } from "./medidor";

/** Vista vigente con el rol actual de quien mira, para volver a comparar jerarquías en cada petición. */
export type VistaVigente = VerComo & { rolQuienMira: string };

/**
 * La vista «ver como» vigente de quien tiene la sesión (CAR-528), o null. En cada petición se vuelve
 * a comprobar: firma y vencimiento, misma persona, misma sesión (cerrar sesión la invalida), misma
 * empresa (cambiar de empresa también) y que siga teniendo el permiso.
 */
export async function verComoDe(identidad: Identidad): Promise<VistaVigente | null> {
  const v = leerVerComo((await cookies()).get(COOKIE_VER_COMO)?.value);
  if (!v || !identidad.actual) return null;
  if (identidad.usuario.id !== v.porUserId || identidad.actual.tenantId !== v.tenantId) return null;
  const sesion = await getSession();
  if (sesion?.session.id !== v.sesionId) return null;
  const propio = contextoDeIdentidad(identidad, "erp");
  return propio.autorizar(PERMISOS_CORE.verComoIniciar)
    ? { ...v, rolQuienMira: identidad.actual.rol }
    : null;
}

/**
 * Identidad de la persona vista en esa empresa, una vez por render; sin rol de plataforma. Si su rol
 * subió por sobre el de quien mira (un admin no ve como el owner), la vista deja de valer.
 */
const identidadVista = cache(
  async (userId: string, tenantId: string, rolQuienMira: string): Promise<Identidad | null> => {
    const u = await fuentesReales.usuario(userId);
    if (!u || !esRol(rolQuienMira)) return null;
    const vista = await identidadDe({ ...u, platformRole: null }, tenantId);
    const rol = vista.actual?.tenantId === tenantId ? vista.actual.rol : null;
    return rol && esRol(rol) && puedeAsignarRol(rolQuienMira, rol) ? vista : null;
  },
);

/** Identidad de la persona vista (Trabajador y Cliente), o null; para montar su shell. */
export const identidadDeLaVista = (v: VistaVigente): Promise<Identidad | null> =>
  v.userId ? identidadVista(v.userId, v.tenantId, v.rolQuienMira) : Promise.resolve(null);

/**
 * Contexto de la persona vista en ese portal, marcado `verComo`: `restriccion` rechaza toda escritura
 * y las lecturas auditadas registran a quien mira. Sin revalidación de sesión (no es la suya).
 */
export async function contextoVerComo(v: VistaVigente, portal: string): Promise<Contexto | null> {
  if (v.portal !== portal) return null;
  const verComo = {
    porUserId: v.porUserId,
    ...(v.personaId ? { personaId: v.personaId } : {}),
  };
  if (v.userId) {
    const vista = await identidadVista(v.userId, v.tenantId, v.rolQuienMira);
    if (!vista || !tieneAccesoAPortal(vista, portal)) return null;
    const ctx = contextoDeIdentidad(vista, portal, { obtenerSesion: async () => null });
    ctx.verComo = verComo;
    return ctx;
  }
  if (portal === "trabajador" && v.personaId) {
    const modulos = await fuentesReales.modulosActivos(v.tenantId);
    if (!modulos.includes("portal_trabajador")) return null;
    const ctx = crearContexto({
      tenantId: v.tenantId,
      actor: { tipo: "user", id: v.porUserId },
      usuario: null,
      rol: "viewer",
      portal,
      portalesMembresia: ["trabajador"],
      modulosActivos: modulos,
      medidor: medidorDiferido,
      diferir: diferirConAfter,
      despacharEventos: despacharDiferido(v.tenantId),
    });
    ctx.verComo = verComo;
    return ctx;
  }
  return null;
}
