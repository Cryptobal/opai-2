import { forTenant, forUser, globales } from "@opai/db";
import type { Excepcion } from "@opai/domain";

/** Membresía con su tenant, tal como se lista para elegir empresa. */
export type MembresiaConTenant = {
  id: string;
  tenantId: string;
  rol: string;
  portales: string[];
  portalInicio?: string | null;
  estado: string;
  tenant: { id: string; slug: string; nombre: string; vertical: string; estado: string };
};

export type ApiKeyFila = {
  id: string;
  userId: string;
  scopes: string[];
  principalTipo: string;
  principalId: string | null;
  revocadaEn: Date | null;
  expiraEn: Date | null;
  ultimoUsoEn: Date | null;
  nombre: string;
  presupuestoMensualMicro: bigint | null;
  autonomia: { capability: string; nivel: string }[];
};

export type UsuarioFila = { id: string; name: string; email: string; platformRole: string | null };

/**
 * Acceso efectivo de una membresía: rol personalizado (null = rol base), excepciones (ADR-022) y
 * alcance por filas. `instalaciones` es null si el rol no acota (ve todo) o la lista (posiblemente
 * vacía) de instalaciones a cargo del supervisor (ADR-022 · Brief 07c B3).
 */
export type AccesoFila = {
  permisosRol: string[] | null;
  excepciones: Excepcion[];
  instalaciones: string[] | null;
};

/** Lecturas que necesita el borde para resolver al actor. Inyectables en tests. */
export type Fuentes = {
  membresiasDe(userId: string): Promise<MembresiaConTenant[]>;
  modulosActivos(tenantId: string): Promise<string[]>;
  usuario(userId: string): Promise<UsuarioFila | null>;
  tenantPorSlug(slug: string): Promise<{ id: string; estado: string } | null>;
  keyPorHash(tenantId: string, hash: string): Promise<ApiKeyFila | null>;
  membresia(tenantId: string, userId: string): Promise<{ rol: string; estado: string } | null>;
  /** Rol personalizado y excepciones de la membresía del usuario en el tenant (ADR-022). */
  acceso(tenantId: string, userId: string): Promise<AccesoFila>;
  marcarUsoKey(tenantId: string, id: string): Promise<void>;
};

const ACTIVOS = ["activo", "trial"];

export const fuentesReales: Fuentes = {
  membresiasDe: (userId) =>
    forUser(userId).membership.findMany({
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    }),
  async modulosActivos(tenantId) {
    const filas = await forTenant(tenantId).tenantModule.findMany({
      where: { estado: { in: ACTIVOS } },
    });
    return filas.map((f) => f.moduloId);
  },
  usuario: (userId) => globales().user.findUnique({ where: { id: userId } }),
  tenantPorSlug: (slug) => globales().tenant.findUnique({ where: { slug } }),
  keyPorHash: (tenantId, hash) =>
    forTenant(tenantId).apiKey.findUnique({ where: { hash }, include: { autonomia: true } }),
  membresia: (tenantId, userId) =>
    forTenant(tenantId).membership.findUnique({ where: { tenantId_userId: { tenantId, userId } } }),
  async acceso(tenantId, userId) {
    const m = await forTenant(tenantId).membership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: { rolTenant: true, excepciones: true },
    });
    const rol = m?.rolTenant;
    // Alcance por filas (ADR-022 · §16.4): hoy solo el rol base supervisor acota. Una consulta extra
    // por contexto y solo para supervisores (ADR-045); el resto ve todo (null).
    const instalaciones =
      m?.rol === "supervisor"
        ? (
            await forTenant(tenantId).supervisorInstalacion.findMany({
              where: { membershipId: m.id },
              select: { instalacionId: true },
            })
          ).map((s) => s.instalacionId)
        : null;
    return {
      // Sin rol personalizado (roleId null) manda el rol base. Con un rol personalizado archivado se
      // deniega por defecto (lista vacía): nunca se vuelve al rol base, que daría más acceso (§16.2).
      permisosRol: rol ? (rol.archivadoEn ? [] : rol.permisos) : null,
      excepciones: (m?.excepciones ?? []).map((e) => ({
        permiso: e.permiso,
        conceder: e.conceder,
      })),
      instalaciones,
    };
  },
  async marcarUsoKey(tenantId, id) {
    await forTenant(tenantId).apiKey.update({ where: { id }, data: { ultimoUsoEn: new Date() } });
  },
};
