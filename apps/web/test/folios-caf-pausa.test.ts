import { describe, expect, it } from "vitest";

import { accionCaf, estadoFolio, etiquetaAmbienteCaf } from "../app/(erp)/finanzas/folios/_componentes/etiquetas-dte";

describe("pausar CAF y ambiente (CAR-240)", () => {
  const f = { activo: true, cafVenceEn: "2027-01-01", restantes: 10, alerta: false };
  it("activo se pausa; pausado con folios y vigente se reactiva; agotado o vencido no", () => {
    expect(accionCaf(f, "2026-11-10")).toBe("pausar");
    expect(accionCaf({ ...f, activo: false }, "2026-11-10")).toBe("reactivar");
    expect(accionCaf({ ...f, activo: false, restantes: 0 }, "2026-11-10")).toBeNull();
    expect(accionCaf({ ...f, activo: false, cafVenceEn: "2026-01-01" }, "2026-11-10")).toBeNull();
  });
  it("un CAF pausado se distingue de uno agotado", () => {
    expect(estadoFolio({ ...f, activo: false }, "2026-11-10").etiqueta).toBe("Pausado");
    expect(estadoFolio({ ...f, activo: false, restantes: 0 }, "2026-11-10").etiqueta).toBe("Agotado");
  });
  it("muestra el ambiente del CAF", () => {
    expect(etiquetaAmbienteCaf("produccion").etiqueta).toBe("Producción");
    expect(etiquetaAmbienteCaf("certificacion").etiqueta).toBe("Certificación");
    expect(etiquetaAmbienteCaf(null).etiqueta).toBe("Ambiente sin determinar");
  });
});
