// CAR-225 C-01 · aprobar o rechazar el cambio de cuenta de pago es solo de personas (ADR-032).
import { beforeAll, describe, expect, it } from "vitest";

import { executeCapability } from "../src/execute";
import { capacidadesDelNucleo } from "../src/core";
import { limpiarRegistro, obtenerCapacidad, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";

const ID = "00000000-0000-7000-8000-000000000001";
const CASOS = [
  ["core.personas.pago_aprobar_cambio", { id: ID }],
  ["core.personas.pago_rechazar_cambio", { id: ID, motivo: "Cuenta no corresponde" }],
] as const;

describe("Personas · pago · aprobar y rechazar son soloPersonas", () => {
  beforeAll(() => {
    limpiarRegistro();
    registrarCapacidades(capacidadesDelNucleo);
  });

  it.each(CASOS)("%s está marcada soloPersonas", (id) => {
    expect(obtenerCapacidad(id)?.soloPersonas).toBe(true);
  });

  it.each(CASOS)("un agente (API key con *) recibe FORBIDDEN en %s", async (id, input) => {
    const { ctx } = contextoDePrueba({
      usuario: USUARIO_DE_PRUEBA,
      actor: { tipo: "agent", id: USUARIO_DE_PRUEBA.id, viaUserId: USUARIO_DE_PRUEBA.id },
      scopes: ["*"],
    });
    const r = await executeCapability(ctx, id, input, { dryRun: true });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
