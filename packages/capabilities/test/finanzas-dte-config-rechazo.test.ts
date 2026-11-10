import { describe, expect, it } from "vitest";

import { mensajeRechazoDteConfig } from "../src/finanzas/dte-config-vista";

describe("rechazo de la base en la configuración DTE (CAR-240)", () => {
  it("un CHECK conocido se traduce a un mensaje de negocio que dice el campo", () => {
    const err = { meta: { code: "23514", message: 'violates check constraint "dte_config_resolucion_sii_numero_chk"' } };
    expect(mensajeRechazoDteConfig(err)).toMatch(/N° de resolución SII/);
    expect(mensajeRechazoDteConfig(new Error('new row violates check constraint "dte_config_aviso_caf_dias_chk"'))).toMatch(
      /vencimiento del CAF/,
    );
  });
  it("un error que no es de CHECK no se traduce", () => {
    expect(mensajeRechazoDteConfig(new Error("connection reset"))).toBeNull();
    expect(mensajeRechazoDteConfig(new Error('violates check constraint "eventos_outbox_tipo_chk"'))).toBeNull();
  });
});
