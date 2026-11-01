import { TENANT_DE_PRUEBA } from "@opai/capabilities/testing";

// Fixtures compartidos por los tests de capacidades de CPQ. Datos ficticios.
export const ACTIVOS = ["comercial", "cpq"];
export const NEGOCIO_1 = "0192f3a0-0000-7000-8000-0000000000d1";
export const NEGOCIO_2 = "0192f3a0-0000-7000-8000-0000000000d2";
export const NEGOCIO_CERRADO = "0192f3a0-0000-7000-8000-0000000000d3";
export const NEGOCIO_AJENO = "0192f3a0-0000-7000-8000-0000000000dd";

const negocio = (id: string, estado: string) => ({
  id,
  tenantId: TENANT_DE_PRUEBA,
  estado,
  archivadoEn: null,
  titulo: "Negocio de prueba",
});

export function semilla() {
  return {
    negocio: [
      negocio(NEGOCIO_1, "abierto"),
      negocio(NEGOCIO_2, "abierto"),
      negocio(NEGOCIO_CERRADO, "ganado"),
    ],
  };
}

export const SOLO_LECTURA = ["cpq:cotizaciones.read"];
export const CON_COSTOS = ["cpq:cotizaciones.read", "cpq:costos.ver"];
export const GESTOR = ["cpq:cotizaciones.read", "cpq:cotizaciones.manage"];
