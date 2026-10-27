import { crearContexto, hashApiKey, slugDeApiKey, type Contexto } from "@opai/capabilities";
import { esRol, esRolPlataforma } from "@opai/domain";

import { alcanceDe } from "./actor";
import { fuentesReales, type Fuentes } from "./fuentes";
import { noAutenticado } from "./respuestas";
import { despacharDiferido, diferirConAfter, medidorDiferido } from "./medidor";

const MINUTO = 60_000;

const principalTipo = (t: string) => (t === "cuenta" || t === "persona" ? t : "usuario");

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
    return noAutenticado("API key inválida, revocada o vencida.");
  }
  const [membresia, usuario, acceso] = await Promise.all([
    fuentes.membresia(tenant.id, fila.userId),
    fuentes.usuario(fila.userId),
    fuentes.acceso(tenant.id, fila.userId),
  ]);
  if (!membresia || membresia.estado !== "activa" || !usuario || !esRol(membresia.rol)) {
    return noAutenticado("API key inválida: su responsable ya no tiene acceso a la empresa.");
  }
  if (!fila.ultimoUsoEn || ahora - fila.ultimoUsoEn.getTime() > MINUTO) {
    await fuentes.marcarUsoKey(tenant.id, fila.id).catch(() => undefined);
  }
  // Una key hereda permisos y alcance del responsable (ADR-033): su rol personalizado y excepciones.
  return crearContexto({
    tenantId: tenant.id,
    actor: { tipo: "agent", id: fila.id, viaUserId: usuario.id },
    usuario: {
      id: usuario.id,
      nombre: usuario.name,
      email: usuario.email,
      platformRole: esRolPlataforma(usuario.platformRole) ? usuario.platformRole : null,
    },
    rol: membresia.rol,
    permisosRol: acceso.permisosRol,
    excepciones: acceso.excepciones,
    // La key hereda el alcance por filas de su responsable (ADR-033).
    alcance: alcanceDe(acceso.instalaciones),
    portal: null,
    modulosActivos: await fuentes.modulosActivos(tenant.id),
    scopes: fila.scopes,
    principal: { tipo: principalTipo(fila.principalTipo), id: fila.principalId ?? usuario.id },
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
