import {
  crearContexto,
  hashApiKey,
  plataformaVigente,
  slugDeApiKey,
  type Contexto,
} from "@opai/capabilities";
import { type Acceso, esRol, esRolPlataforma } from "@opai/domain";

import { alcanceDe } from "./actor";
import { fuentesReales, type Fuentes } from "./fuentes";
import { noAutenticado } from "./respuestas";
import { despacharDiferido, diferirConAfter, medidorDiferido } from "./medidor";

const MINUTO = 60_000;

const principalTipo = (t: string) =>
  t === "cuenta" || t === "persona" || t === "servicio" ? t : "usuario";

/** Extrae la key de `Authorization: Bearer <key>`. */
export function keyDeCabecera(req: Request): string | null {
  const valor = req.headers.get("authorization") ?? "";
  const [tipo, key] = valor.split(" ");
  return tipo?.toLowerCase() === "bearer" && key ? key.trim() : null;
}

/**
 * Contexto de un agente a partir de su API key. El tenant sale del slug de la key (sin consultas
 * cross-tenant); la key debe estar vigente y su responsable tener membresía activa. El actor es
 * `{ tipo: "agent", id: <apiKeyId>, viaUserId }` con los permisos del responsable y los scopes.
 */
export async function contextoDeApiKey(
  key: string,
  fuentes: Fuentes = fuentesReales,
): Promise<Contexto | Response> {
  const slug = slugDeApiKey(key);
  if (!slug) return noAutenticado("API key inválida.");
  const tenant = await fuentes.tenantPorSlug(slug);
  if (!tenant || tenant.estado === "suspendido") return noAutenticado("API key inválida.");
  const fila = await fuentes.keyPorHash(tenant.id, hashApiKey(key));
  const ahora = Date.now();
  if (!fila || fila.revocadaEn || (fila.expiraEn && fila.expiraEn.getTime() <= ahora)) {
    return noAutenticado("API key inválida.");
  }
  const [membresia, usuario, acceso] = await Promise.all([
    fuentes.membresia(tenant.id, fila.userId),
    fuentes.usuario(fila.userId),
    fuentes.acceso(tenant.id, fila.userId),
  ]);
  if (!membresia || membresia.estado !== "activa" || !usuario || !esRol(membresia.rol)) {
    return noAutenticado("API key inválida.");
  }
  if (!fila.ultimoUsoEn || ahora - fila.ultimoUsoEn.getTime() > MINUTO) {
    await fuentes.marcarUsoKey(tenant.id, fila.id).catch(() => undefined);
  }
  // Servicio no hereda rol ni alcance, pero su lista explícita nunca supera los permisos actuales
  // del responsable. Si este pierde el alcance completo, el servicio deja de autenticarse.
  const tipo = principalTipo(fila.principalTipo);
  const servicio = tipo === "servicio";
  if (
    servicio &&
    (fila.heredaPermisos ||
      !fila.presupuestoMensualMicro ||
      fila.presupuestoMensualMicro <= 0n ||
      acceso.instalaciones !== null)
  )
    return noAutenticado("API key inválida.");
  // Key de plataforma (ADR-055): scope explícito "platform"; el permiso real sale del `platformRole`
  // vigente del responsable, que `autorizador` cruza en cada llamada (si lo pierde, la key también).
  const claveApi = {
    permisos: fila.heredaPermisos ? null : fila.permisos,
    servicio,
    // CAR-40: además vigente (vence en ≤ 7 días); una key larga o sin vencimiento no es de plataforma.
    plataforma: fila.scopes.includes("platform") && plataformaVigente(fila.expiraEn, ahora),
  };
  // Techo real del responsable (H15): rol, personalizado y excepciones VIGENTES, siempre, también
  // para `servicio` (que arriba manda `rol`/`permisosRol`/`excepciones` en null porque el principal
  // no hereda rol). Si el responsable baja de rol o recibe una excepción que deniega, la key la
  // pierde al vuelo, sea delegada o de servicio.
  const accesoResponsable: Acceso = {
    rol: acceso.permisosRol != null ? null : membresia.rol,
    permisosRol: acceso.permisosRol,
    excepciones: acceso.excepciones,
  };
  return crearContexto({
    tenantId: tenant.id,
    actor: { tipo: "agent", id: fila.id, viaUserId: usuario.id },
    usuario: {
      id: usuario.id,
      nombre: usuario.name,
      email: usuario.email,
      platformRole: esRolPlataforma(usuario.platformRole) ? usuario.platformRole : null,
    },
    rol: servicio ? null : membresia.rol,
    permisosRol: servicio ? null : acceso.permisosRol,
    excepciones: servicio ? null : acceso.excepciones,
    accesoResponsable,
    // La key hereda el alcance por filas de su responsable (ADR-033); un servicio no hereda alcance.
    alcance: servicio ? null : alcanceDe(acceso.instalaciones),
    portal: null,
    modulosActivos: await fuentes.modulosActivos(tenant.id),
    scopes: fila.scopes,
    principal: { tipo, id: servicio ? fila.id : (fila.principalId ?? usuario.id) },
    claveApi,
    agente: {
      apiKeyId: fila.id,
      nombre: fila.nombre,
      presupuestoMensualMicro: fila.presupuestoMensualMicro,
      autonomia: Object.fromEntries(fila.autonomia.map((a) => [a.capability, a.nivel])),
    },
    medidor: medidorDiferido,
    diferir: diferirConAfter,
    despacharEventos: despacharDiferido(tenant.id),
  });
}
