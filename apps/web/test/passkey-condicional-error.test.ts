import { describe, expect, it } from "vitest";

import { esCancelacionPasskey, mensajeWebAuthn } from "@/app/_components/webauthn";

// CAR-728: la mediación condicional que aborta al montar no debe traducirse en alerta roja.
describe("errores visibles tras autocompletado condicional", () => {
  it("trata AbortError y NotAllowedError como cancelación silenciosa", () => {
    for (const nombre of ["AbortError", "NotAllowedError"] as const) {
      const error = new DOMException("cancelado", nombre);
      expect(esCancelacionPasskey(error)).toBe(true);
      expect(mensajeWebAuthn(error)).toBeNull();
    }
  });

  it("sigue mostrando otros fallos de WebAuthn", () => {
    expect(mensajeWebAuthn(new DOMException("ocupada", "InvalidStateError"))).toBe(
      "Esta passkey ya está guardada en tu cuenta.",
    );
    expect(mensajeWebAuthn(new Error("fallo genérico"))).toMatch(/Tu navegador no pudo/);
  });
});