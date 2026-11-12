import { tokenOAuthVigente, type TokenOAuth } from "@opai/auth";
import { comoAppOAuth, crearContexto, type Contexto } from "@opai/capabilities";
import { esRol } from "@opai/domain";

import { alcanceDe, identidadDe } from "./actor";
import { fuentesReales, type Fuentes } from "./fuentes";
import { despacharDiferido, diferirConAfter, medidorDiferido } from "./medidor";
import { noAutenticado, prohibido } from "./respuestas";

/** Portales desde los que una app OAuth puede operar: los de la empresa, no cliente ni trabajador. */
const PORTALES_OAUTH = ["erp", "supervisor"] as const;

type Dependencias = { fuentes: Fuentes; token: (t: string) => Promise<TokenOAuth | null> };

/**
 * Contexto de una app que llama al MCP con un token OAuth (CAR-247, ADR-098). La empresa sale del
 * token (el consentimiento), nunca del cuerpo; la persona debe seguir con membresía activa en ella.
 * Actúa como agente vía la persona, con sus permisos y alcance; con solo `mcp:leer` no escribe.
 */
export async function contextoDeTokenOAuth(
  token: string,
  dep: Dependencias = { fuentes: fuentesReales, token: tokenOAuthVigente },
): Promise<Contexto | Response> {
  const t = await dep.token(token);
  if (!t) return noAutenticado("Token inválido o vencido.");
  const usuario = await dep.fuentes.usuario(t.userId);
  if (!usuario) return noAutenticado("Token inválido o vencido.");
  const identidad = await identidadDe(usuario, t.tenantId, dep.fuentes);
  const actual = identidad.actual;
  // `elegirMembresia` cae a otra empresa si la del token ya no es usable: eso es un token sin acceso.
  if (!actual || actual.tenantId !== t.tenantId || !esRol(actual.rol))
    return noAutenticado("Token inválido o vencido.");
  const portal = PORTALES_OAUTH.find((p) => actual.portales.includes(p));
  if (!portal) return prohibido("Esta cuenta no puede conectar apps.");
  const base = crearContexto({
    tenantId: actual.tenantId,
    actor: { tipo: "user", id: usuario.id },
    usuario: { ...identidad.usuario, platformRole: null },
    rol: actual.rol,
    permisosRol: identidad.acceso.permisosRol,
    excepciones: identidad.acceso.excepciones,
    alcance: alcanceDe(identidad.acceso.instalaciones),
    portal,
    portalesMembresia: actual.portales,
    modulosActivos: identidad.modulosActivos,
    modulosSoloLectura: identidad.modulosSoloLectura ?? [],
    medidor: medidorDiferido,
    diferir: diferirConAfter,
    despacharEventos: despacharDiferido(actual.tenantId),
  });
  return comoAppOAuth(base, {
    clientId: t.clientId,
    soloLectura: !t.alcances.includes("mcp:escribir"),
  });
}
