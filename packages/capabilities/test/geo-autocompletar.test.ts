import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

const COMPLETA = "Av. Libertador Bernardo O'Higgins 1449, Santiago, Región Metropolitana";
const SIN_REGION = "Av. Libertador Bernardo O'Higgins 1449, Santiago";

const sugerencia = {
  suggestions: [
    {
      placePrediction: {
        placeId: "p1",
        text: { text: `${SIN_REGION}, Chile` },
        structuredFormat: {
          mainText: { text: "Av. Libertador Bernardo O'Higgins 1449" },
          secondaryText: { text: "Santiago, Región Metropolitana" },
        },
      },
    },
  ],
};

/** Google responde vacío al texto con región y con sugerencias al texto sin ella. */
const googleSoloSinRegion = () =>
  vi.fn(async (_url: unknown, init?: RequestInit) => {
    const { input } = JSON.parse(String(init?.body)) as { input: string };
    return Response.json(input === SIN_REGION ? sugerencia : {});
  });

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  process.env["GOOGLE_MAPS_SERVER_KEY"] = "SECRETA";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env["GOOGLE_MAPS_SERVER_KEY"];
});

describe("core.geo.autocompletar con una dirección completa", () => {
  it("si el texto con región no devuelve sugerencias, reintenta sin la región", async () => {
    const llamada = googleSoloSinRegion();
    vi.stubGlobal("fetch", llamada);
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.geo.autocompletar", { texto: COMPLETA });
    expect(r).toMatchObject({
      ok: true,
      data: [{ placeId: "p1", texto: "Av. Libertador Bernardo O'Higgins 1449" }],
    });
    expect(llamada).toHaveBeenCalledTimes(2);
  });

  it("si la primera búsqueda ya devuelve sugerencias no reintenta", async () => {
    const llamada = vi.fn(async () => Response.json(sugerencia));
    vi.stubGlobal("fetch", llamada);
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.geo.autocompletar", { texto: COMPLETA });
    expect(r.ok && r.data).toHaveLength(1);
    expect(llamada).toHaveBeenCalledTimes(1);
  });

  it("si ninguna variante devuelve sugerencias, responde vacío (no un error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({})),
    );
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.geo.autocompletar", { texto: COMPLETA });
    expect(r).toMatchObject({ ok: true, data: [] });
  });
});
