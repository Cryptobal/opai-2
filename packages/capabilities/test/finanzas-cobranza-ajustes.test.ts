// F4 (CAR-166) · el envío automático de cobranza lo enciende una persona, nunca un agente.
import { describe, expect, it } from "vitest";

import { registrarModuloFinanzas } from "./finanzas-modulo";
import { campoAjuste } from "../src/core/config/catalogo";

describe("Finanzas · cobranza · ajustes", () => {
  it("cobranza_recordatorios_automaticos es solo de personas y viene apagado", () => {
    registrarModuloFinanzas();
    const c = campoAjuste("finanzas", "cobranza_recordatorios_automaticos");
    expect(c).toBeDefined();
    expect(c?.meta.soloPersonas).toBe(true);
    expect(c?.schema.parse(undefined)).toBe(false);
  });
});
