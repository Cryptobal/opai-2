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
  it("con un detalle largo el mensaje cabe en el tope de la UI y conserva la advertencia de envío incierto", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { MAX_MENSAJE_NEGOCIO } = await import("../src/finanzas/errores-sii");
    const e = new ErrorProveedorSii("enviar", "respondió HTTP 502", 502, "Servicio temporalmente no disponible ".repeat(4).trim().slice(0, 140), true);
    const aviso = "El resultado es incierto: el SII pudo haberlo recibido. Consulte el estado del envío antes de reenviar.";
    const r = comoReglaSiProveedorSii(e, () => aviso) as Error;
    expect(r.message.length).toBeLessThanOrEqual(MAX_MENSAJE_NEGOCIO);
    expect(r.message.endsWith(aviso)).toBe(true);
    expect(r.message).toContain("respondió HTTP 502 (Servicio");
  });
  it("cualquier otro error se relanza tal cual (sigue siendo INTERNAL)", () => {
    const otro = new Error("fallo de base");
    expect(comoReglaSiProveedorSii(otro, "x")).toBe(otro);
  });
});
