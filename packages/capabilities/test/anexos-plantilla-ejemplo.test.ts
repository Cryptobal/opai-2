// CAR-58 (auditoría del Núcleo §I-19): si `esEjemplo` vuelve a activarse y no hay plantilla
// publicada, ningún anexo se aprueba (tampoco en vista previa) y el borrador queda intacto.
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as PlantillaMod from "../src/core/anexos/plantilla";

vi.mock("../src/core/anexos/plantilla", async (importOriginal) => {
  const original = await importOriginal<typeof PlantillaMod>();
  return { ...original, PLANTILLA_ANEXO: { version: "ejemplo-prueba", esEjemplo: true } };
});

import { executeCapability } from "../src";
import { MENSAJE_PLANTILLA_EJEMPLO } from "../src/core/anexos/plantilla";
import { contextoDePrueba } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";
import { destinoVinculo } from "./vinculo-fixture";

beforeEach(reiniciar);

describe("core.anexos.aprobar con la plantilla de ejemplo", () => {
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
    const lista = (
      await dato<{ items: { id: string; estado: string; documentoId: string | null }[] }>(
        ctx,
        "core.anexos.list",
        { personaId: persona.id },
      )
    ).items;
    expect(lista).toEqual([
      expect.objectContaining({ id: anexo.id, estado: "borrador", documentoId: null }),
    ]);
  });
});