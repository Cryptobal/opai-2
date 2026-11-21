import { describe, expect, it } from "vitest";

import { csvMovimientosMiDt, etiquetaPlazoMiDt, plazoMiDtHasta } from "./cumplimiento-dt";

describe("cumplimiento-dt", () => {
  it("calcula el plazo a 15 días", () => {
    expect(plazoMiDtHasta("2026-10-12")).toBe("2026-10-27");
  });

  it("etiqueta vencido y pendiente", () => {
    expect(etiquetaPlazoMiDt("2026-10-12", "2026-10-30", null)).toMatchObject({ tono: "danger" });
    expect(etiquetaPlazoMiDt("2026-10-22", "2026-10-30", null).etiqueta).toBe("Quedan 7 días");
    expect(etiquetaPlazoMiDt("2026-10-01", "2026-11-01", "2026-10-08")).toMatchObject({ tono: "success" });
  });

  it("arma CSV con cabecera", () => {
    const csv = csvMovimientosMiDt([
      { movimiento: "Alta", rut: "1-9", nombres: "A", apellidos: "B", hechoEn: "2026-10-01", plazoLimite: "2026-10-16", tipoContrato: "indefinido", referenciaId: "v1" },
    ]);
    expect(csv.split("\n")[0]).toContain("movimiento");
    expect(csv).toContain('"Alta"');
  });
});