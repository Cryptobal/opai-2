import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client";

import { ejecutarComprasQaPreview } from "../scripts/compras-qa-preview-ejecutar";
import { escribirComprasQa } from "../scripts/compras-qa-escribir";
import { metadataPreviewQa } from "./compras-qa-preview-fixture";

vi.mock("../scripts/compras-qa-escribir", () => ({ escribirComprasQa: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
});
function entorno() {
  const m = metadataPreviewQa();
  const desconectar = vi.fn();
  const conectar = vi.fn(() => ({ $disconnect: desconectar }) as unknown as PrismaClient);
  const fetchMock = vi.fn(
    async (url: string) =>
      ({
        ok: true,
        url,
        redirected: false,
        json: async () => (url.endsWith("/endpoints") ? m.endpoints : m.branch),
      }) as Response,
  );
  return {
    m,
    desconectar,
    conectar,
    fetchMock,
    deps: { fetch: fetchMock as unknown as typeof fetch, conectar },
  };
}

describe("runner preview con metadata simulada, sin red ni Prisma real", () => {
  it("valida ambas respuestas antes de construir cliente y siempre lo cierra", async () => {
    const e = entorno();
    e.conectar.mockImplementation(() => {
      expect(e.fetchMock).toHaveBeenCalledTimes(2);
      return { $disconnect: e.desconectar } as unknown as PrismaClient;
    });
    await ejecutarComprasQaPreview(e.m.env, e.m.evento, e.deps);
    expect(e.conectar).toHaveBeenCalledOnce();
    expect(escribirComprasQa).toHaveBeenCalledOnce();
    expect(e.desconectar).toHaveBeenCalledOnce();
    for (const [url, opciones] of e.fetchMock.mock.calls as unknown as [string, RequestInit][]) {
      expect(new URL(url).origin).toBe("https://console.neon.tech");
      expect(opciones).toMatchObject({ method: "GET", redirect: "error" });
    }
  });
  it("no construye cliente si el evento o la metadata no coinciden", async () => {
    const e = entorno();
    e.m.evento.number = 832;
    await expect(ejecutarComprasQaPreview(e.m.env, e.m.evento, e.deps)).rejects.toThrow();
    expect(e.fetchMock).not.toHaveBeenCalled();
    expect(e.conectar).not.toHaveBeenCalled();
    e.m.evento.number = 831;
    e.m.branch.branch.name = "main";
    await expect(ejecutarComprasQaPreview(e.m.env, e.m.evento, e.deps)).rejects.toThrow();
    expect(e.conectar).not.toHaveBeenCalled();
    expect(escribirComprasQa).not.toHaveBeenCalled();
  });
  it.each(["http", "redirect", "url", "json", "network"])(
    "falla antes del cliente ante error %s",
    async (caso) => {
      const e = entorno();
      e.fetchMock.mockImplementation(async (url) => {
        if (caso === "network") throw new Error("network ficticio");
        return {
          ok: caso !== "http",
          redirected: caso === "redirect",
          url: caso === "url" ? "https://other.invalid" : url,
          json: async () => {
            if (caso === "json") throw new Error("json ficticio");
            return e.m.branch;
          },
        } as Response;
      });
      await expect(ejecutarComprasQaPreview(e.m.env, e.m.evento, e.deps)).rejects.toThrow();
      expect(e.conectar).not.toHaveBeenCalled();
      expect(escribirComprasQa).not.toHaveBeenCalled();
    },
  );
  it("cierra cliente si la fixture aborta", async () => {
    const e = entorno();
    vi.mocked(escribirComprasQa).mockRejectedValueOnce(new Error("colisión ficticia"));
    await expect(ejecutarComprasQaPreview(e.m.env, e.m.evento, e.deps)).rejects.toThrow();
    expect(e.desconectar).toHaveBeenCalledOnce();
  });
});
