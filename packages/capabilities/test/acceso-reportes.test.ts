import { describe, expect, it } from "vitest";

import { diaSemana, ventanaReporte } from "../src/acceso/reportes-periodo";

describe("ventana de reporte de accesos (CAR-632)", () => {
  const zona = "America/Santiago";

  it("diario cubre el día anterior", () => {
    const v = ventanaReporte("diario", "2026-11-10", zona, null);
    expect(v?.periodo).toBe("09-11-2026");
  });

  it("semanal solo corre los lunes", () => {
    expect(diaSemana("2026-11-08")).toBe(7); // domingo
    expect(ventanaReporte("semanal", "2026-11-08", zona, null)).toBeNull();
    expect(diaSemana("2026-11-09")).toBe(1);
    expect(ventanaReporte("semanal", "2026-11-09", zona, null)?.periodo).toContain("al");
  });

  it("no repite si el cursor ya alcanzó el hasta", () => {
    const primero = ventanaReporte("diario", "2026-11-10", zona, null);
    expect(primero).not.toBeNull();
    expect(ventanaReporte("diario", "2026-11-10", zona, primero!.hasta)).toBeNull();
  });
});