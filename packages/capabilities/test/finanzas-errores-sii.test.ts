// CAR-242 · Traducción de los fallos de SimpleAPI a una regla de negocio legible.
import { ErrorProveedorSii } from "@opai/integrations";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorCapacidad } from "../src/errores";
import { comoReglaSiProveedorSii } from "../src/finanzas/errores-sii";

afterEach(() => vi.restoreAllMocks());

describe("comoReglaSiProveedorSii", () => {
  it("un fallo del proveedor es UNPROCESSABLE con motivo; el detalle va marcado como externo y no al log", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const e = new ErrorProveedorSii("generar", "respondió HTTP 400", 400, "Rut receptor no valido");
    const r = comoReglaSiProveedorSii(e, "El folio no se usó.") as ErrorCapacidad;
    expect(r).toBeInstanceOf(ErrorCapacidad);
    expect(r.code).toBe("UNPROCESSABLE");
    expect(r.message).toBe("SimpleAPI no pudo generar ni firmar el DTE: respondió HTTP 400 (Rut receptor no valido). El folio no se usó.");
    expect(r.detalles).toEqual({
      proveedor: "simpleapi",
      paso: "generar",
      status: 400,
      detalleProveedor: { texto: "Rut receptor no valido", origen: "externo" },
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("Rut receptor");
    expect(warn.mock.calls[0]?.[1]).toMatchObject({ evento: "sii.proveedor.rechazo", paso: "generar", status: 400 });
  });
  it("un envío incierto no invita a reenviar", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const e = new ErrorProveedorSii("enviar", "respondió HTTP 502", 502, null, true);
    const r = comoReglaSiProveedorSii(e, (x) => (x.incierto ? "Consulte el estado antes de reenviar." : "Reintente.")) as Error;
    expect(r.message).toMatch(/Consulte el estado antes de reenviar\.$/);
  });
  it("cualquier otro error se relanza tal cual (sigue siendo INTERNAL)", () => {
    const otro = new Error("fallo de base");
    expect(comoReglaSiProveedorSii(otro, "x")).toBe(otro);
  });
});
