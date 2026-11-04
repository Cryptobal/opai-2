import { TENANT_DE_PRUEBA } from "../src/testing";

/** Cargo «listo» de enero de 2026 del módulo crm, en CLP (CAR-188). */
export function cargoDePrueba(id: string, tenantId = TENANT_DE_PRUEBA) {
  return {
    id,
    tenantId,
    moduloId: "crm",
    periodo: new Date("2026-01-01T00:00:00Z"),
    moneda: "CLP",
    precioMensual: 100_000,
    descuentoPct: 0,
    diasCobrados: 31,
    diasMes: 31,
    monto: 100_000,
    ufCentavos: null,
    montoClp: 100_000,
    estado: "listo",
    motivoAnulacion: null,
    anuladoEn: null,
    createdAt: new Date("2026-02-01T03:00:00Z"),
  };
}
