import { crearContexto, type Contexto, type UsuarioContexto } from "@opai/capabilities";
import { sesionDeRequest, sesionVigente } from "@opai/auth";
import { esRol, esRolPlataforma } from "@opai/domain";

import { contextoDeApiKey, keyDeCabecera } from "./api-key";
import { type AccesoFila, fuentesReales, type Fuentes, type MembresiaConTenant } from "./fuentes";
import { noAutenticado } from "./respuestas";
import { COOKIE_TENANT, elegirMembresia, leerCookie } from "./tenant-actual";
import { despacharDiferido, diferirConAfter, medidorDiferido } from "./medidor";
import { estadoMfaDe, verificarMfaDe } from "./mfa";
import { conectarRevalidacion } from "./revalidacion-transaccion";

export type UsuarioSesion = {
  id: string;
  name: string;
  email: string;
  platformRole?: string | null | undefined;
  twoFactorEnabled?: boolean | null | undefined;
  /** Tiene al menos una passkey (CAR-286): también es segundo factor. */
  passkeyEnabled?: boolean | null | undefined;
};

/** Usuario, membresías y tenant actual de una sesión. Lo comparten la API y las páginas. */
export type Identidad = {
  usuario: UsuarioContexto;
  membresias: MembresiaConTenant[];
  actual: MembresiaConTenant | null;
  modulosActivos: string[];
  /** Módulos activos en solo lectura (CAR-188): se ven, no se escribe. */
  modulosSoloLectura?: string[];
  /** Acceso efectivo en el tenant actual (rol personalizado y excepciones, ADR-022). */
  acceso: AccesoFila;
  /** Segundo factor en la cuenta: app autenticadora o passkey; `totpActiva`, solo la app (CAR-286). */
  mfaActiva: boolean;
  totpActiva?: boolean;
  mfaVerificada?: boolean;
};

const SIN_ACCESO: AccesoFila = { permisosRol: null, excepciones: [], instalaciones: null };

/** Alcance por filas del contexto (ADR-022): null = ve todo; array (quizá vacío) = acotado. */
export function alcanceDe(instalaciones: string[] | null) {
  return instalaciones ? { instalaciones } : null;
}

export async function identidadDe(
  user: UsuarioSesion,
  cookieTenant: string | undefined,
  fuentes: Fuentes = fuentesReales,
): Promise<Identidad> {
  const membresias = await fuentes.membresiasDe(user.id);
  const actual = elegirMembresia(membresias, cookieTenant);
  type Modulos = { modulosActivos: string[]; modulosSoloLectura?: string[]; acceso: AccesoFila };
  const {
    modulosActivos,
    modulosSoloLectura = [],
    acceso,
  }: Modulos = actual
    ? fuentes.accesoConModulos
      ? await fuentes.accesoConModulos(actual.tenantId, user.id)
      : await Promise.all([
          fuentes.modulosActivos(actual.tenantId),
          fuentes.acceso(actual.tenantId, user.id),
        ]).then(([modulosActivos, acceso]) => ({ modulosActivos, acceso }))
    : { modulosActivos: [], acceso: SIN_ACCESO };
  const platformRole = esRolPlataforma(user.platformRole) ? user.platformRole : null;
  return {
    usuario: { id: user.id, nombre: user.name, email: user.email, platformRole },
    membresias,
    actual,
    modulosActivos,
    modulosSoloLectura,
    acceso,
    mfaActiva: user.twoFactorEnabled === true || user.passkeyEnabled === true,
    totpActiva: user.twoFactorEnabled === true,
  };
}

/** Contexto de ejecución de un usuario con sesión, en el tenant actual (o sin tenant). */
export function contextoDeIdentidad(
  identidad: Identidad,
  portal: string | null,
  opciones: {
    fuentes?: Fuentes;
    obtenerSesion?: () => ReturnType<Sesionador>;
    portalRevalidacion?: string;
  } = {},
): Contexto {
  const { usuario, actual, acceso } = identidad;
  const ctx = crearContexto({
    tenantId: actual?.tenantId ?? null,
    actor: { tipo: "user", id: usuario.id },
    usuario,
    // `rol` es el rol base (jerarquía); si hay rol personalizado, `permisosRol` define la autorización.
    rol: actual && esRol(actual.rol) ? actual.rol : null,
    permisosRol: acceso.permisosRol,
    excepciones: acceso.excepciones,
    alcance: alcanceDe(acceso.instalaciones),
    portal,
    portalesMembresia: actual?.portales ?? [],
    modulosActivos: identidad.modulosActivos,
    modulosSoloLectura: identidad.modulosSoloLectura ?? [],
    medidor: medidorDiferido,
    diferir: diferirConAfter,
    ...(actual ? { despacharEventos: despacharDiferido(actual.tenantId) } : {}),
  });
  conectarRevalidacion(ctx, identidad, opciones.portalRevalidacion ?? portal, async () => {
    const s = await (opciones.obtenerSesion ?? sesionVigente)();
    if (!s) return null;
    const vigente = await identidadDe(s.user, actual?.tenantId, opciones.fuentes);
    vigente.mfaVerificada = s.session?.mfaVerified === true;
    return { identidad: vigente, sesionId: s.session?.id };
  });
  return ctx;
}

type Sesionador = (
  req: Request,
) => Promise<{ user: UsuarioSesion; session?: { id?: string; mfaVerified?: boolean } } | null>;

/**
 * API key o cookie; sin ambas, 401. Sesión devuelve `portal: null`: `/api/v1` fija ERP solo para
 * su lista (`lib/api-v1-sesion.ts`, CAR-37); el resto lo deniega `restriccion`. Las escrituras con
 * sesión exigen además el propio `Origin` (CAR-38).
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
  identidad.mfaVerificada = s.session?.mfaVerified === true;
  if (await verificarMfaDe(identidad)) {
    return Response.json(
      { ok: false, error: { code: "FORBIDDEN", message: "Completa el segundo factor." } },
      { status: 403 },
    );
  }
  const ctx = contextoDeIdentidad(identidad, null, {
    fuentes,
    portalRevalidacion: "erp", // Las rutas con sesión fijan ERP después; ctx.portal sigue null.
    obtenerSesion: () => sesionVigente(req.headers),
  });
  ctx.mfa = await estadoMfaDe(identidad);
  return ctx;
}
