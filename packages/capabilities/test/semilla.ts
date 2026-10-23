import { TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";

export const U2 = "0192f3a0-0000-7000-8000-0000000000a2";
export const M1 = "0192f3a0-0000-7000-8000-0000000000b1";
export const M2 = "0192f3a0-0000-7000-8000-0000000000b2";

/** Tenant "gard" con Ana (owner, M1) y Beto (rol configurable, M2). */
export function semillaTenant(rolBeto = "admin") {
  return {
    tenant: [
      {
        id: TENANT_DE_PRUEBA,
        slug: "gard",
        nombre: "Gard Security",
        vertical: "seguridad",
        timezone: "America/Santiago",
        estado: "activo",
      },
    ],
    user: [
      { id: USUARIO_DE_PRUEBA.id, name: "Ana Prueba", email: "ana@prueba.cl" },
      { id: U2, name: "Beto", email: "beto@prueba.cl" },
    ],
    membership: [
      {
        id: M1,
        tenantId: TENANT_DE_PRUEBA,
        userId: USUARIO_DE_PRUEBA.id,
        rol: "owner",
        portales: ["erp"],
        estado: "activa",
        createdAt: new Date(1),
      },
      {
        id: M2,
        tenantId: TENANT_DE_PRUEBA,
        userId: U2,
        rol: rolBeto,
        portales: ["erp"],
        estado: "activa",
        createdAt: new Date(2),
      },
    ],
  };
}
