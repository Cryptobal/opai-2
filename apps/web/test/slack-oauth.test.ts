// CAR-291 (Slack F1): vuelta del OAuth. Exige sesión, nunca pone el código en la URL de vuelta.
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("GET /api/integraciones/slack/oauth/callback", () => {
  const ejecutar = vi.fn();
  const identidad = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    ejecutar.mockReset().mockResolvedValue({ ok: true, data: {} });
    identidad.mockReset().mockResolvedValue({ usuario: { id: "u1" }, actual: { tenantId: "t1" } });
    vi.doMock("@/lib/servidor", () => ({
      ejecutarComoUsuario: ejecutar,
      identidadActual: identidad,
    }));
    vi.doMock("@/lib/rate-limit", () => ({ permitir: async () => true }));
  });
  const volver = async (q: string) => {
    const { GET } = await import("../app/api/integraciones/slack/oauth/callback/route");
    const r = await GET(
      new Request(`https://test.opai.cl/api/integraciones/slack/oauth/callback?${q}`),
    );
    return { status: r.status, destino: new URL(r.headers.get("location") ?? "") };
  };

  it("conecta como la persona con sesión y vuelve a la pantalla sin el código", async () => {
    const r = await volver("code=codigo-1&state=estado-1234567890");
    expect(ejecutar).toHaveBeenCalledWith("erp", "core.slack.conectar", {
      code: "codigo-1",
      estado: "estado-1234567890",
    });
    expect(r.status).toBe(303);
    expect(r.destino.pathname).toBe("/configuracion/integraciones/slack");
    expect(r.destino.searchParams.get("slack")).toBe("conectado");
    expect(r.destino.search).not.toContain("codigo-1");
  });

  it("sin sesión, cancelado o sin código no ejecuta nada", async () => {
    identidad.mockResolvedValueOnce(null);
    expect((await volver("code=c&state=s")).destino.searchParams.get("motivo")).toBe("sesion");
    expect((await volver("error=access_denied")).destino.searchParams.get("motivo")).toBe(
      "cancelado",
    );
    expect((await volver("state=s")).destino.searchParams.get("motivo")).toBe("enlace");
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it("traduce el error de la capacidad a un motivo corto", async () => {
    ejecutar.mockResolvedValue({
      ok: false,
      error: { code: "UNPROCESSABLE", message: "x", detalles: { motivo: "espacio_ocupado" } },
    });
    expect(
      (await volver("code=codigo-1&state=estado-1234567890")).destino.searchParams.get("motivo"),
    ).toBe("espacio_ocupado");
  });
});
