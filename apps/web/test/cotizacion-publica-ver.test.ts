import { beforeEach, describe, expect, it, vi } from "vitest";

// Orden de llamadas: `connection()` debe resolverse antes de cualquier lectura con reloj o base
// (Next 16 con Cache Components lanza «Date.now() while prerendering» y la ruta caía en «no válido»).
const orden: string[] = [];
const ctxSistema = { tenantId: "t1" };

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  connection: vi.fn(async () => void orden.push("connection")),
}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/lib/rate-limit", () => ({
  LIMITES: { verificar: { maximo: 10, ventanaMs: 60_000 } },
  ipDeCabeceras: () => "1.2.3.4",
  permitir: vi.fn(async () => {
    orden.push("permitir");
    return true;
  }),
}));
vi.mock("@/lib/fuentes", () => ({ fuentesReales: { modulosActivos: vi.fn(async () => ["cpq"]) } }));
vi.mock("@/lib/medidor", () => ({
  contextoSistema: vi.fn(() => {
    orden.push("contextoSistema");
    return ctxSistema;
  }),
}));
vi.mock("@opai/db", () => ({ tenantPorSlug: vi.fn(async () => ({ id: "t1" })) }));
vi.mock("@opai/capabilities", () => ({
  executeCapability: vi.fn(async () => ({ ok: true, data: { titulo: "Cotización" } })),
}));

import { executeCapability } from "@opai/capabilities";

import { contextoSistema } from "@/lib/medidor";

import { verCotizacionPublica } from "../app/p/[slug]/[token]/ver";

describe("verCotizacionPublica", () => {
  beforeEach(() => {
    orden.length = 0;
    vi.clearAllMocks();
  });

  it("espera connection() antes de leer reloj, rate limit o base", async () => {
    await verCotizacionPublica("gard", "a".repeat(32));
    expect(orden[0]).toBe("connection");
    expect(orden.indexOf("connection")).toBeLessThan(orden.indexOf("permitir"));
  });

  it("arma el contexto con contextoSistema (registro del proceso) y los módulos activos", async () => {
    const r = await verCotizacionPublica("gard", "a".repeat(32));
    expect(contextoSistema).toHaveBeenCalledWith("t1", ["cpq"]);
    expect(executeCapability).toHaveBeenCalledWith(ctxSistema, "cpq.compartir.ver", {
      token: "a".repeat(32),
    });
    expect(r).toEqual({ ok: true, data: { titulo: "Cotización" } });
  });
});
