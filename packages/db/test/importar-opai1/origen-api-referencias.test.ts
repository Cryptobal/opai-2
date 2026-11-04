import { describe, expect, it } from "vitest";

import { referenciasComoArreglo } from "../../scripts/importar-opai1/origen-api-referencias";
import type { Advertencia } from "../../scripts/importar-opai1/origen-tolerante";
import { lectorContratoFixtures } from "../../scripts/importar-opai1/origen-api";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { construirReporte } from "../../scripts/importar-opai1/reporte";
import { calcularPlan } from "../../scripts/importar-opai1/plan";

const FIX = new URL("../fixtures/opai1-export-v1", import.meta.url).pathname;

describe("additionalReferences (Json? en 1.0)", () => {
  it("null, texto JSON y objeto suelto terminan como arreglo de objetos", () => {
    const av: Advertencia[] = [];
    expect(referenciasComoArreglo("r", null, av)).toEqual([]);
    expect(referenciasComoArreglo("r", '[{"folioRef":"1"}]', av)).toEqual([{ folioRef: "1" }]);
    expect(referenciasComoArreglo("r", { folioRef: "2" }, av)).toEqual([{ folioRef: "2" }]);
    expect(av).toEqual([]);
  });

  it("lo ilegible no frena: se descarta con advertencia", () => {
    const avisos: Advertencia[] = [];
    expect(referenciasComoArreglo("r1", "no es json", avisos)).toEqual([]);
    expect(referenciasComoArreglo("r1", [{ folioRef: "3" }, 5], avisos)).toEqual([{ folioRef: "3" }]);
    expect(referenciasComoArreglo("r1", "x".repeat(100_001), avisos)).toEqual([]);
    expect(avisos.map((a) => a.campo)).toEqual(["additionalReferences", "additionalReferences", "additionalReferences"]);
  });

  it("el lector acepta plantillas con null, texto JSON u objeto", async () => {
    const rec = (await lectorContratoFixtures(FIX).leer()).recurringInvoiceSchedules;
    const por = (id: string) => rec.find((r) => r.id === id);
    expect(por("recurrente-refs-null")?.additionalReferences).toEqual([]);
    expect(por("recurrente-refs-json")?.additionalReferences).toHaveLength(1);
    expect(por("recurrente-refs-obj")?.additionalReferences).toHaveLength(1);
  });
});

describe("referencias vacías o a medias no frenan el dryRun", () => {
  it("descarta la vacía, omite la incompleta con advertencia y normaliza la completa", async () => {
    const datos = await lectorContratoFixtures(FIX).leer();
    const r = datos.recurringInvoiceSchedules.find((x) => x.id === "recurrente-refs-mixtas");
    expect(r?.additionalReferences).toEqual([
      { fchRef: "2026-10-02", folioRef: "77", tipoDocRef: "HES", razonRef: "Servicio" },
    ]);
    const campos = datos.advertencias.filter((a) => a.idOpai1 === "recurrente-refs-mixtas").map((a) => a.campo);
    expect(campos.sort()).toEqual(["additionalReferences.folioRef", "additionalReferences.vacia"]);
  });

  it("las advertencias llegan agrupadas al reporte (recurso, campo y ids)", async () => {
    const datos = await lectorContratoFixtures(FIX).leer();
    const rep = construirReporte(calcularPlan(datos, estadoVacio()), "gard");
    const g = rep.advertencias.find((a) => a.campo === "additionalReferences.folioRef");
    expect(g?.recurso).toBe("recurrentes");
    expect(g?.idsOpai1).toContain("recurrente-refs-mixtas");
  });
});
