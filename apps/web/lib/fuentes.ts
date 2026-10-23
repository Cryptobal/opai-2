import { forTenant, forUser, globales } from "@opai/db";

/** Membresía con su tenant, tal como se lista para elegir empresa. */
export type MembresiaConTenant = {
  id: string;
  tenantId: string;
  rol: string;
  portales: string[];
  estado: string;
  tenant: { id: string; slug: string; nombre: string; vertical: string; estado: string };
};

export type ApiKeyFila = {
  id: string;
  userId: string;
  scopes: string[];
  revocadaEn: Date | null;
  expiraEn: Date | null;
  ultimoUsoEn: Date | null;
};

export type UsuarioFila = { id: string; name: string; email: string; platformRole: string | null };

/** Lecturas que necesita el borde para resolver al actor. Inyectables en tests. */
export type Fuentes = {
  membresiasDe(userId: string): Promise<MembresiaConTenant[]>;
  modulosActivos(tenantId: string): Promise<string[]>;
  usuario(userId: string): Promise<UsuarioFila | null>;
  tenantPorSlug(slug: string): Promise<{ id: string; estado: string } | null>;
  keyPorHash(tenantId: string, hash: string): Promise<ApiKeyFila | null>;
  membresia(tenantId: string, userId: string): Promise<{ rol: string; estado: string } | null>;
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
  keyPorHash: (tenantId, hash) => forTenant(tenantId).apiKey.findUnique({ where: { hash } }),
  membresia: (tenantId, userId) =>
    forTenant(tenantId).membership.findUnique({ where: { tenantId_userId: { tenantId, userId } } }),
  async marcarUsoKey(tenantId, id) {
    await forTenant(tenantId).apiKey.update({ where: { id }, data: { ultimoUsoEn: new Date() } });
  },
};
