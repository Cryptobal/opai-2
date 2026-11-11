import { beforeEach, describe, expect, it, vi } from "vitest";

const avisos = vi.hoisted(() => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@opai/ds", () => ({ avisar: avisos }));

import { enviarAlSiiTrasEmitir, enviarLoteAlSii } from "../app/(erp)/finanzas/ventas/_componentes/enviar-sii-tras-emitir";

type Ejecutar = Parameters<typeof enviarAlSiiTrasEmitir>[0];
const ejecutarCon = (fn: (id: string, input: unknown) => unknown) => vi.fn(async (id: string, input: unknown) => fn(id, input)) as unknown as Ejecutar & ReturnType<typeof vi.fn>;

describe("enviar al SII tras emitir (CAR-270)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envía el documento recién emitido y avisa que quedó enviado", async () => {
    const ejecutar = ejecutarCon(() => ({ id: "doc-1" }));
    expect(await enviarAlSiiTrasEmitir(ejecutar, "doc-1", "Factura")).toBe(true);
    expect(ejecutar).toHaveBeenCalledWith("finanzas.ventas.enviar_sii", { documentoId: "doc-1" });
    expect(avisos.exito).toHaveBeenCalledWith("Factura emitida y enviada al SII");
    expect(avisos.error).not.toHaveBeenCalled();
  });

  it("si el envío falla, la emisión no se pierde: avisa que quedó firmada y cómo reintentar", async () => {
    const ejecutar = ejecutarCon(() => null);
    expect(await enviarAlSiiTrasEmitir(ejecutar, "doc-1", "Nota de crédito")).toBe(false);
    expect(avisos.exito).not.toHaveBeenCalled();
    expect(avisos.error.mock.calls[0]?.[0]).toMatch(/Nota de crédito quedó firmada.*«Enviar al SII»/);
  });

  it("en lote envía cada documento y cuenta los que no se pudieron enviar", async () => {
    const ejecutar = ejecutarCon((_id, input) => ((input as { documentoId: string }).documentoId === "b" ? null : {}));
    await enviarLoteAlSii(ejecutar, ["a", "b", "c"]);
    expect(ejecutar).toHaveBeenCalledTimes(3);
    expect(avisos.error.mock.calls[0]?.[0]).toMatch(/3 emitidos; 1 sin enviar al SII/);

    vi.clearAllMocks();
    await enviarLoteAlSii(ejecutarCon(() => ({})), ["a"]);
    expect(avisos.exito).toHaveBeenCalledWith("1 documento emitido y enviado al SII");
  });
});
