// CAR-58 (auditoría del Núcleo §I-19): mientras la plantilla base del anexo tenga texto de ejemplo,
// ningún anexo se aprueba, tampoco en vista previa, y el borrador queda intacto (se puede rechazar).
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { MENSAJE_PLANTILLA_EJEMPLO, PLANTILLA_ANEXO } from "../src/core/anexos/plantilla";
import { contextoDePrueba } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";
import { destinoVinculo } from "./vinculo-fixture";

beforeEach(reiniciar);

describe("core.anexos.aprobar con la plantilla de ejemplo", () => {
  it("la plantilla del repositorio sigue marcada como ejemplo (falta el texto legal)", () => {
    expect(PLANTILLA_ANEXO.esEjemplo).toBe(true);
  });

  it("rechaza aprobar y la vista previa con un mensaje de negocio; el borrador sigue vigente", async () => {
    const { ctx } = contextoDePrueba();
    const cargo = await dato<{ id: string }>(ctx, "core.cargos.create", { nombre: "Guardia" });
    const persona = await dato<{ id: string }>(ctx, "core.personas.create", {
      nombres: "Elena",
      apellidos: "Ríos",
      rut: "17.123.456-5",
      vinculo: {
        ...(await destinoVinculo(ctx)),
        cargoId: cargo.id,
        tipo: "indefinido",
        inicio: "2026-01-05",
      },
    });
    const anexo = await dato<{ id: string }>(ctx, "core.anexos.generar", {
      personaId: persona.id,
      motivoCambio: "monto",
      snapshotDespues: { nota: "x" },
    });
    for (const dryRun of [true, false]) {
      const r = await executeCapability(ctx, "core.anexos.aprobar", { id: anexo.id }, { dryRun });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe("UNPROCESSABLE");
      expect(r.error.message).toBe(MENSAJE_PLANTILLA_EJEMPLO);
    }
    const lista = await dato<{ id: string; estado: string; documentoId: string | null }[]>(
      ctx,
      "core.anexos.list",
      { personaId: persona.id },
    );
    expect(lista).toEqual([
      expect.objectContaining({ id: anexo.id, estado: "borrador", documentoId: null }),
    ]);
  });
});
