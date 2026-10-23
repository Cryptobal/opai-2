import { crearContexto, type Contexto, type UsuarioContexto } from "@opai/capabilities";
import { sesionDeRequest } from "@opai/auth";
import { esRol, esRolPlataforma } from "@opai/domain";

import { contextoDeApiKey, keyDeCabecera } from "./api-key";
import { fuentesReales, type Fuentes, type MembresiaConTenant } from "./fuentes";
import { noAutenticado } from "./respuestas";
import { COOKIE_TENANT, elegirMembresia, leerCookie } from "./tenant-actual";
import { despacharDiferido, diferirConAfter, medidorDiferido } from "./medidor";

export type UsuarioSesion = {
  id: string;
  name: string;
  email: string;
  platformRole?: string | null | undefined;
};

/** Usuario, membresías y tenant actual de una sesión. Lo comparten la API y las páginas. */
export type Identidad = {
  usuario: UsuarioContexto;
  membresias: MembresiaConTenant[];
  actual: MembresiaConTenant | null;
  modulosActivos: string[];
};

export async function identidadDe(
  user: UsuarioSesion,
  cookieTenant: string | undefined,
  fuentes: Fuentes = fuentesReales,
): Promise<Identidad> {
  const membresias = await fuentes.membresiasDe(user.id);
  const actual = elegirMembresia(membresias, cookieTenant);
  const modulosActivos = actual ? await fuentes.modulosActivos(actual.tenantId) : [];
  const platformRole = esRolPlataforma(user.platformRole) ? user.platformRole : null;
  return {
    usuario: { id: user.id, nombre: user.name, email: user.email, platformRole },
    membresias,
    actual,
    modulosActivos,
  };
}

/** Contexto de ejecución de un usuario con sesión, en el tenant actual (o sin tenant). */
export function contextoDeIdentidad(identidad: Identidad, portal: string | null): Contexto {
  const { usuario, actual } = identidad;
  return crearContexto({
    tenantId: actual?.tenantId ?? null,
    actor: { tipo: "user", id: usuario.id },
    usuario,
    rol: actual && esRol(actual.rol) ? actual.rol : null,
    portal,
    modulosActivos: identidad.modulosActivos,
    medidor: medidorDiferido,
    diferir: diferirConAfter,
    ...(actual ? { despacharEventos: despacharDiferido(actual.tenantId) } : {}),
  });
}

type Sesionador = (req: Request) => Promise<{ user: UsuarioSesion } | null>;

/**
 * Resuelve el actor de un request a la API: API key (`Authorization: Bearer`) o sesión
 * (cookie de Better Auth). Sin ninguna de las dos responde 401.
 */
export async function resolverActor(
  req: Request,
  fuentes: Fuentes = fuentesReales,
  sesion: Sesionador = sesionDeRequest,
): Promise<Contexto | Response> {
  const key = keyDeCabecera(req);
  if (key) return contextoDeApiKey(key, fuentes);
  const s = await sesion(req);
  if (!s) return noAutenticado();
  const identidad = await identidadDe(s.user, leerCookie(req, COOKIE_TENANT), fuentes);
  return contextoDeIdentidad(identidad, null);
}
