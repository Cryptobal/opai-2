import { describe, expect, it } from "vitest";

import { enriquecerDuenoNegocios, normalizarDatosExport } from "../../scripts/importar-opai1/origen-api-normalizar";
import { lectorContratoFixtures } from "../../scripts/importar-opai1/origen-api";
import { validarDatos } from "../../scripts/importar-opai1/origen-lectores";

const FIX = new URL("../fixtures/opai1-export", import.meta.url).pathname;

describe("lector opai1-export/v1", () => {
  it("deduplica filas repetidas entre páginas (sin snapshot entre páginas)", async () => {
    const datos = await lectorContratoFixtures(FIX).leer();
    expect(datos.deals).toHaveLength(1);
    expect(datos.deals[0]?.title).toBe("Servicio bodega v2");
  });

  it("copia ownerId de la cuenta al negocio cuando el export no lo trae", () => {
    const deals = enriquecerDuenoNegocios(
      [{ id: "d1", accountId: "acc-a1", stageId: "s", title: "T", createdAt: "2025-01-01T00:00:00.000Z" }],
      [
        {
          id: "acc-a1",
          name: "C",
          ownerId: "usr-owner-1",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
    );
    expect(deals[0]?.ownerId).toBe("usr-owner-1");
  });

  it("acepta cotización vigente sin validUntil (borrador activo)", () => {
    const d = validarDatos({
      cpqQuotes: [
        {
          id: "q-draft",
          code: "CPQ-2026-0001",
          status: "draft",
          createdAt: "2026-01-01T12:00:00.000Z",
        },
      ],
    });
    expect(d.cpqQuotes[0]?.validUntil).toBeUndefined();
  });

  it("acepta actividades con id estable para cursor nota|tarea|reunion:<id>", () => {
    const base = normalizarDatosExport(
      validarDatos({
        activities: [
          {
            id: "n-1",
            tipo: "nota",
            negocioId: "deal-1",
            cuentaId: "acc-a1",
            autor: "usr-1",
            fecha: "2026-01-02T12:00:00.000Z",
            texto: "Primera",
            estado: "ok",
          },
          {
            id: "n-1",
            tipo: "nota",
            negocioId: "deal-1",
            cuentaId: "acc-a1",
            autor: "usr-1",
            fecha: "2026-01-03T12:00:00.000Z",
            texto: "Segunda página",
            estado: "ok",
          },
        ],
      }),
    );
    expect(base.activities).toHaveLength(1);
    expect(base.activities[0]?.texto).toBe("Segunda página");
  });

  it("enriquece dueño del negocio desde la cuenta del fixture export", async () => {
    const datos = await lectorContratoFixtures(FIX).leer();
    expect(datos.deals[0]?.ownerId).toBe("usr-owner-1");
  });
});
