import { describe, expect, it } from "vitest";

import { alertasDocumentos } from "../src/core/maestros/resumenes";
import { contextoDePrueba } from "../src/testing";
import { cumple } from "../src/testing/db-memoria-util";
import { resolverWhereRelaciones } from "../src/testing/db-memoria-rel";

describe("relaciones en memoria del PR #53", () => {
  it("intersecta el id pedido y el alcance, también dentro de AND/OR", () => {
    const tablas = {
      cuenta: [{ id: "visible" }, { id: "ajena" }],
      instalacion: [{ id: "asignada", cuentaId: "visible" }],
    };
    const tabla = (n: string) => tablas[n as keyof typeof tablas] ?? [];
    const alcance = { instalaciones: { some: { id: { in: ["asignada"] } } } };
    for (const id of ["ajena", "inexistente", "visible"]) {
      for (const where of [
        { id, ...alcance },
        { id, AND: [{ OR: [alcance] }] },
      ]) {
        const filtro = resolverWhereRelaciones(tabla, "cuenta", where);
        expect(tablas.cuenta.filter((c) => cumple(c, filtro))).toHaveLength(
          id === "visible" ? 1 : 0,
        );
      }
    }
  });

  it("las alertas resuelven el documento propietario disponible con vencimiento", async () => {
    const { ctx } = contextoDePrueba({
      semilla: {
        documento: [
          { id: "vencido", estado: "disponible", venceEn: new Date("2000-01-01") },
          { id: "pendiente", estado: "pendiente", venceEn: new Date("2000-01-01") },
          { id: "sin-fecha", estado: "disponible", venceEn: null },
        ],
        documentoVinculo: ["vencido", "pendiente", "sin-fecha"].map((documentoId) => ({
          documentoId,
          entidadTipo: "persona",
          entidadId: "p",
          rol: "propietario",
        })),
      },
    });
    const alertas = await alertasDocumentos(ctx, "persona", ["p"]);
    expect(alertas("p")).toEqual({ vencidos: 1, porVencer: 0 });
    expect(alertas("ajena")).toEqual({ vencidos: 0, porVencer: 0 });
  });
});
