import { beforeEach, describe, expect, it, vi } from "vitest";

const avisos = vi.hoisted(() => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }));
const accion = vi.hoisted(() => ({ ejecutarCapacidad: vi.fn() }));
vi.mock("@opai/ds", () => ({ avisar: avisos }));
vi.mock("@/app/_acciones/capacidad", () => accion);

import { enviarAlSiiTrasEmitir, enviarLoteAlSii } from "../app/(erp)/finanzas/ventas/_componentes/enviar-sii-tras-emitir";

const OK = { ok: true, data: {} };
const falla = (message: string) => ({ ok: false, error: { code: "UNPROCESSABLE", message } });
const INCIERTO = "El SII no respondió. El resultado es incierto: el SII pudo haberlo recibido. Consulte el estado del envío antes de reenviar.";

describe("enviar al SII tras emitir (CAR-270)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envía el documento recién emitido y avisa que quedó enviado", async () => {
    accion.ejecutarCapacidad.mockResolvedValue(OK);
    expect(await enviarAlSiiTrasEmitir("doc-1", "Factura")).toBe(true);
    expect(accion.ejecutarCapacidad).toHaveBeenCalledWith("erp", "finanzas.ventas.enviar_sii", { documentoId: "doc-1" });
    expect(avisos.exito).toHaveBeenCalledWith("Factura emitida y enviada al SII");
    expect(avisos.error).not.toHaveBeenCalled();
  });

  it("si el SII rechaza, dice que quedó emitida y conserva el motivo del servidor", async () => {
    accion.ejecutarCapacidad.mockResolvedValue(falla("El documento sigue firmado y sin enviar; puede reintentar el envío."));
    expect(await enviarAlSiiTrasEmitir("doc-1", "Nota de crédito")).toBe(false);
    expect(avisos.exito).not.toHaveBeenCalled();
    expect(avisos.error.mock.calls[0]?.[0]).toMatch(/Nota de crédito emitida, pero quedó sin enviar al SII\. .*puede reintentar/);
  });

  it("si el resultado es incierto, no invita a reenviar: conserva la advertencia del servidor", async () => {
    accion.ejecutarCapacidad.mockResolvedValue(falla(INCIERTO));
    await enviarAlSiiTrasEmitir("doc-1", "Factura");
    const texto = String(avisos.error.mock.calls[0]?.[0]);
    expect(texto).toMatch(/incierto.*antes de reenviar/);
    expect(texto).not.toMatch(/usa «Enviar al SII»/);
  });

  it("un corte de red también se trata como incierto", async () => {
    accion.ejecutarCapacidad.mockRejectedValue(new Error("red"));
    await enviarAlSiiTrasEmitir("doc-1", "Factura");
    expect(avisos.error.mock.calls[0]?.[0]).toMatch(/No se pudo confirmar el envío.*antes de reenviarlo/);
  });

  it("en lote envía cada documento y, si alguno falla, pide revisar antes de reenviar", async () => {
    accion.ejecutarCapacidad.mockImplementation(async (_p: string, _id: string, input: { documentoId: string }) =>
      input.documentoId === "b" ? falla(INCIERTO) : OK,
    );
    await enviarLoteAlSii(["a", "b", "c"]);
    expect(accion.ejecutarCapacidad).toHaveBeenCalledTimes(3);
    expect(avisos.error.mock.calls[0]?.[0]).toMatch(/3 emitidos; 1 sin enviar al SII.*revisa su estado antes de reenviar/);

    vi.clearAllMocks();
    accion.ejecutarCapacidad.mockResolvedValue(OK);
    await enviarLoteAlSii(["a"]);
    expect(avisos.exito).toHaveBeenCalledWith("1 documento emitido y enviado al SII");
  });
});
