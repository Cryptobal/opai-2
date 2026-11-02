import { describe, expect, it } from "vitest";

describe("finanzas.ventas.emitir_nota_credito · C2", () => {
  it("es irreversible y exige aprobación de agente", async () => {
    const { ventasEmitirNotaCredito } = await import("../src/finanzas/ventas-nota-credito");
    expect(ventasEmitirNotaCredito.efecto).toBe("irreversible");
    expect(ventasEmitirNotaCredito.exigeAprobacion?.({} as never)).toBe(true);
  });
});
