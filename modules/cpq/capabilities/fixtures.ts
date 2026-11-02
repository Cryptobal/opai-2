import { TENANT_DE_PRUEBA } from "@opai/capabilities/testing";

// Fixtures compartidos por los tests de capacidades de CPQ. Datos ficticios.
export const ACTIVOS = ["comercial", "cpq"];
export const NEGOCIO_1 = "0192f3a0-0000-7000-8000-0000000000d1";
export const NEGOCIO_2 = "0192f3a0-0000-7000-8000-0000000000d2";
export const NEGOCIO_CERRADO = "0192f3a0-0000-7000-8000-0000000000d3";
export const NEGOCIO_AJENO = "0192f3a0-0000-7000-8000-0000000000dd";
export const CUENTA_1 = "0192f3a0-0000-7000-8000-0000000000c9";
export const CONTACTO_1 = "0192f3a0-0000-7000-8000-0000000000a2";
export const EMBUDO_1 = "0192f3a0-0000-7000-8000-0000000000e9";
export const ETAPA_PROSPECTO = "0192f3a0-0000-7000-8000-0000000000e0";
export const ETAPA_PROPUESTA = "0192f3a0-0000-7000-8000-0000000000e3";

const negocio = (
  id: string,
  estado: string,
  extra?: { cuentaId?: string; embudoId?: string; etapaId?: string },
) => ({
  id,
  tenantId: TENANT_DE_PRUEBA,
  estado,
  archivadoEn: null,
  titulo: "Negocio de prueba",
  probabilidad: 10,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...extra,
});

export function semilla() {
  return {
    embudo: [
      {
        id: EMBUDO_1,
        tenantId: TENANT_DE_PRUEBA,
        nombre: "Ventas",
        porDefecto: true,
        activo: true,
      },
    ],
    etapa: [
      {
        id: ETAPA_PROSPECTO,
        tenantId: TENANT_DE_PRUEBA,
        embudoId: EMBUDO_1,
        nombre: "Prospecto",
        orden: 0,
        tipo: "abierta",
        probabilidad: 10,
        tono: "neutral",
        exige: [],
        activa: true,
      },
      {
        id: ETAPA_PROPUESTA,
        tenantId: TENANT_DE_PRUEBA,
        embudoId: EMBUDO_1,
        nombre: "Propuesta enviada",
        orden: 3,
        tipo: "abierta",
        probabilidad: 50,
        tono: "warning",
        exige: ["monto"],
        activa: true,
      },
    ],
    cuenta: [
      { id: CUENTA_1, tenantId: TENANT_DE_PRUEBA, nombre: "Cuenta CPQ", estado: "prospecto" },
    ],
    contacto: [
      {
        id: CONTACTO_1,
        tenantId: TENANT_DE_PRUEBA,
        cuentaId: CUENTA_1,
        nombres: "Ana",
        apellidos: "Prueba",
        email: "ana.cpq@prueba.cl",
        esPrincipal: true,
      },
    ],
    negocio: [
      negocio(NEGOCIO_1, "abierto", {
        cuentaId: CUENTA_1,
        embudoId: EMBUDO_1,
        etapaId: ETAPA_PROSPECTO,
      }),
      negocio(NEGOCIO_2, "abierto", {
        cuentaId: CUENTA_1,
        embudoId: EMBUDO_1,
        etapaId: ETAPA_PROSPECTO,
      }),
      negocio(NEGOCIO_CERRADO, "ganado"),
    ],
  };
}

export const SOLO_LECTURA = ["cpq:cotizaciones.read"];
export const CON_COSTOS = ["cpq:cotizaciones.read", "cpq:costos.ver"];
export const GESTOR = ["cpq:cotizaciones.read", "cpq:cotizaciones.manage"];
export const GESTOR_COSTOS = [...GESTOR, ...CON_COSTOS];
