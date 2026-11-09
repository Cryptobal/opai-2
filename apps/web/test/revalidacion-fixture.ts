import type { Identidad } from "../lib/actor";

export function identidad(): Identidad {
  const actual = {
    id: "m1",
    tenantId: "t1",
    rol: "supervisor",
    portales: ["erp", "trabajador"],
    estado: "activa",
    tenant: {
      id: "t1",
      slug: "fixture",
      nombre: "Fixture",
      vertical: "seguridad",
      estado: "activo",
    },
  };
  return {
    usuario: { id: "u1", nombre: "Fixture", email: "fixture@prueba.invalid", platformRole: null },
    actual,
    membresias: [actual],
    modulosActivos: ["agente", "crm", "portal_trabajador"],
    modulosSoloLectura: [],
    acceso: {
      permisosRol: ["agente:usar", "crm:read"],
      excepciones: [
        { permiso: "crm:write", conceder: false },
        { permiso: "crm:read", conceder: true },
      ],
      instalaciones: ["i1", "i2"],
    },
    mfaActiva: true,
    mfaVerificada: true,
  };
}
