import { TENANT_DE_PRUEBA } from "@opai/capabilities/testing";

// Fixtures compartidos entre los tests de capacidades de Finanzas · Flujo de caja (datos ficticios).
export const ACTIVOS = ["finanzas"];
export const FILA_ING = "0192f3a0-0000-7000-8000-0000000000f1";
export const FILA_EGR = "0192f3a0-0000-7000-8000-0000000000f2";
export const S0 = "2026-10-26";
export const S1 = "2026-11-02";
export const S2 = "2026-11-09";
const f = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function semilla() {
  const fila = (id: string, seccion: string, etiqueta: string, arrastre: boolean) => ({
    id,
    tenantId: TENANT_DE_PRUEBA,
    seccion,
    etiqueta,
    vinculo: null,
    arrastre,
    orden: 0,
    activa: true,
  });
  const celda = (n: number, filaId: string, semana: string, monto: number, capa = "plan") => ({
    id: `0192f3a0-0000-7000-8000-00000000010${n}`,
    tenantId: TENANT_DE_PRUEBA,
    filaId,
    semana: f(semana),
    capa,
    monto,
    nota: null,
  });
  return {
    flujoFila: [
      fila(FILA_ING, "ingreso", "Cliente A", true),
      fila(FILA_EGR, "egreso", "Proveedores", false),
    ],
    flujoCelda: [
      celda(1, FILA_ING, S0, 1000),
      celda(2, FILA_ING, S1, 500, "comprometido"),
      celda(3, FILA_EGR, S0, 300),
      celda(4, FILA_EGR, S2, 200),
    ],
    flujoAjustes: [
      {
        id: "0192f3a0-0000-7000-8000-000000000199",
        tenantId: TENANT_DE_PRUEBA,
        saldoInicial: 100,
        umbral: 500,
        desde: f(S0),
        toleranciaCierre: 1000,
        horizonteSemanas: 12,
        calendarioPagos: {},
        avisoActivo: false,
        avisoUmbral: 0,
        metaCeldaMs: 100,
        metaGuardadoP95Ms: 1000,
        metaCargaInicialS: 2,
        metasVisibles: true,
      },
    ],
  };
}
