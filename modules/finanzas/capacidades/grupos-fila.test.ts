import { describe, expect, it } from "vitest";

import { conGrupo, grupoPorVinculo } from "./esquemas";
import {
  FILA_COBROS_ESPERADOS,
  FILA_IVA,
  FILA_PPM,
  FILA_RENDICIONES,
  FILA_SIN_CONCILIAR_EGRESO,
  FILAS_VIRTUALES_VISTA,
  filaDiferenciaFactoringVista,
} from "./filas-virtuales";

const grupoDe = (id: string) => FILAS_VIRTUALES_VISTA.map(conGrupo).find((f) => f.id === id)?.grupo;

describe("grupo de egreso de las filas automáticas", () => {
  it("se deduce del vínculo de la fila", () => {
    expect(grupoPorVinculo("finanzas:impuestos")).toBe("impuestos");
    expect(grupoPorVinculo("nomina:costo_proyectado")).toBe("remuneraciones");
    expect(grupoPorVinculo("finanzas:factoring")).toBe("financiamiento");
    expect(grupoPorVinculo("rendiciones:lotes")).toBe("gastos");
    expect(grupoPorVinculo(null)).toBe("gastos");
  });

  it("IVA y PPM van en Impuestos; rendiciones y sin conciliar en Gastos; la diferencia del factoring en Financiamiento", () => {
    expect(grupoDe(FILA_IVA)).toBe("impuestos");
    expect(grupoDe(FILA_PPM)).toBe("impuestos");
    expect(grupoDe(FILA_RENDICIONES)).toBe("gastos");
    expect(grupoDe(FILA_SIN_CONCILIAR_EGRESO)).toBe("gastos");
    expect(conGrupo(filaDiferenciaFactoringVista("Diferencia")).grupo).toBe("financiamiento");
  });

  it("las filas de ingreso no llevan grupo", () => {
    expect(grupoDe(FILA_COBROS_ESPERADOS)).toBeNull();
    expect(FILAS_VIRTUALES_VISTA.map(conGrupo).filter((f) => f.seccion === "ingreso").every((f) => f.grupo === null)).toBe(true);
  });
});
