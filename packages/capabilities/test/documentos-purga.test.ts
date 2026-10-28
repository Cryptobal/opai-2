// Purga diaria de subidas pendientes (ADR-039) con las FKs RESTRICT de CAR-46: un pendiente que algo
// referencia se omite (conserva fila y objeto) en vez de hacer fallar el lote entero.
import { describe, expect, it } from "vitest";

import { trabajoPurgarSubidasPendientes } from "../src/core/documentos/trabajos";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";

const VIEJO = new Date(Date.now() - 2 * 86_400_000);

function pendiente(id: string) {
  return {
    id,
    tenantId: TENANT_DE_PRUEBA,
    nombre: `${id}.pdf`,
    mime: "application/pdf",
    tamano: 1,
    storageKey: `k-${id}`,
    estado: "pendiente",
    creadoPorTipo: "user",
    createdAt: VIEJO,
  };
}

describe("core.documentos.purgar_pendientes", () => {
  it("borra los pendientes sueltos y omite los referenciados por evidencia o reemplazo", async () => {
    const { ctx, tabla, almacen } = contextoDePrueba({
      semilla: {
        documento: [
          pendiente("suelto"),
          pendiente("evidencia-arco"),
          pendiente("evidencia-incidente"),
          pendiente("reemplazado"),
          { ...pendiente("nueva"), reemplazaAId: "reemplazado", createdAt: new Date() },
        ],
        solicitudArco: [
          { id: "s1", tenantId: TENANT_DE_PRUEBA, documentoEvidenciaId: "evidencia-arco" },
        ],
        incidente: [
          { id: "i1", tenantId: TENANT_DE_PRUEBA, evidenciaDocId: "evidencia-incidente" },
        ],
      },
    });
    for (const d of tabla("documento"))
      almacen.subir(String(d["storageKey"]), 1, "application/pdf");

    const r = await trabajoPurgarSubidasPendientes.ejecutar(ctx, { dia: "2026-10-28" });

    expect(r).toEqual({ eliminados: 1 });
    expect(
      tabla("documento")
        .map((d) => d["id"])
        .sort(),
    ).toEqual(["evidencia-arco", "evidencia-incidente", "nueva", "reemplazado"].sort());
    expect(almacen.objetos.has("k-suelto")).toBe(false);
    for (const id of ["evidencia-arco", "evidencia-incidente", "reemplazado"])
      expect(almacen.objetos.has(`k-${id}`)).toBe(true);
  });
});
