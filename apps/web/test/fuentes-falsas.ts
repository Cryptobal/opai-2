import { generarApiKey } from "@opai/capabilities";

import type { ApiKeyFila, Fuentes, MembresiaConTenant } from "../lib/fuentes";

export const TENANT = "0192f3a0-0000-7000-8000-000000000001";
export const USUARIO = {
  id: "0192f3a0-0000-7000-8000-0000000000a1",
  name: "Carlos",
  email: "carlos@opai.cl",
  platformRole: null,
};

export function membresia(extra: Partial<MembresiaConTenant> = {}): MembresiaConTenant {
  return {
    id: "m1",
    tenantId: TENANT,
    rol: "owner",
    portales: ["erp"],
    estado: "activa",
    tenant: { id: TENANT, slug: "gard", nombre: "Gard", vertical: "seguridad", estado: "activo" },
    ...extra,
  };
}

/** Fuentes en memoria: un tenant `gard`, una key de Carlos y su membresía. */
export function fuentesFalsas(
  o: { key?: Partial<ApiKeyFila>; membresias?: MembresiaConTenant[] } = {},
) {
  const { secreto, hash } = generarApiKey("gard");
  const usos: string[] = [];
  const membresias = o.membresias ?? [membresia()];
  const fila: ApiKeyFila = {
    id: "k1",
    userId: USUARIO.id,
    scopes: ["*"],
    principalTipo: "usuario",
    principalId: null,
    revocadaEn: null,
    expiraEn: null,
    ultimoUsoEn: null,
    nombre: "Agente",
    presupuestoMensualMicro: null,
    autonomia: [],
    ...o.key,
  };
  const fuentes: Fuentes = {
    membresiasDe: async () => membresias,
    modulosActivos: async () => ["crm"],
    usuario: async (id) => (id === USUARIO.id ? USUARIO : null),
    tenantPorSlug: async (slug) => (slug === "gard" ? { id: TENANT, estado: "activo" } : null),
    keyPorHash: async (_t, h) => (h === hash ? fila : null),
    membresia: async (t, u) => membresias.find((m) => m.tenantId === t && u === USUARIO.id) ?? null,
    acceso: async () => ({ permisosRol: null, excepciones: [], instalaciones: null }),
    marcarUsoKey: async (_t, id) => void usos.push(id),
  };
  return { fuentes, secreto, usos };
}
