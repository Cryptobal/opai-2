import { describe, expect, it } from "vitest";

import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import { xmlParaEnvioSii } from "../src/finanzas/ventas-xml";
import { adaptadorSiiSimulado } from "@opai/integrations";

describe("ventas XML DTE (C1)", () => {
  it("simulado sigue usando XML de prueba; real exige archivo guardado", async () => {
    const sim = adaptadorSiiSimulado();
    const xmlSim = await xmlParaEnvioSii(
      { servicios: { almacenamiento: almacenamientoEnMemoria().almacenamiento } } as never,
      { folio: 10, xmlStorageKey: null },
      sim,
    );
    expect(xmlSim).toBe('<DTE folio="10"/>');
    const { almacenamiento } = almacenamientoEnMemoria();
    const fake = { nombre: "simpleapi", disponible: true } as never;
    await expect(
      xmlParaEnvioSii(
        { servicios: { almacenamiento } } as never,
        { folio: 10, xmlStorageKey: "dte/x.xml" },
        fake,
      ),
    ).rejects.toMatchObject({ code: "UNPROCESSABLE" });
  });
});
