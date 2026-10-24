import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { herramientasMcp } from "../src/mcp";
import { contextoDePrueba } from "../src/testing";

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  process.env["GOOGLE_MAPS_SERVER_KEY"] = "clave-de-plataforma";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env["GOOGLE_MAPS_SERVER_KEY"];
});

describe("core.geo.mapa: el mapa real de las fichas", () => {
  it("pide la imagen a Static Maps con la clave del servidor y mide geo.mapa por imagen", async () => {
    const fetchFalso = vi.fn(
      async (_url: URL | string) =>
        new Response(PNG, { status: 200, headers: { "content-type": "image/png" } }),
    );
    vi.stubGlobal("fetch", fetchFalso);
    const { ctx, usos } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.geo.mapa", { lat: -33.36, lng: -70.73, zoom: 17 });
    expect(r).toMatchObject({ ok: true, data: { mime: "image/png" } });
    if (r.ok)
      expect(Buffer.from((r.data as { base64: string }).base64, "base64")).toEqual(
        Buffer.from(PNG),
      );
    const url = new URL(String(fetchFalso.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/maps/api/staticmap");
    expect(url.searchParams.get("key")).toBe("clave-de-plataforma");
    expect(url.searchParams.get("zoom")).toBe("17");
    expect(url.searchParams.get("center")).toBe("-33.36,-70.73");
    const mapa = usos.filter((u) => u.recurso === "geo.mapa");
    expect(mapa).toHaveLength(1);
    expect(mapa[0]).toMatchObject({ unidad: "imagen", cantidad: 1 });
  });

  it("si Google rechaza la imagen no se consume geo.mapa y el error es claro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("denegado", { status: 403 })),
    );
    const { ctx, usos } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.geo.mapa", { lat: -33, lng: -70 });
    expect(r.ok).toBe(false);
    expect(usos.some((u) => u.recurso === "geo.mapa")).toBe(false);
  });

  it("sin clave de mapas responde que no está disponible", async () => {
    delete process.env["GOOGLE_MAPS_SERVER_KEY"];
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.geo.mapa", { lat: -33, lng: -70 });
    expect(r.ok === false && r.error.message).toMatch(/no está disponible/);
  });

  it("valida coordenadas y zoom, y no se expone a agentes (es interna)", async () => {
    const { ctx } = contextoDePrueba();
    const mala = await executeCapability(ctx, "core.geo.mapa", { lat: 120, lng: -70 });
    expect(mala).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(herramientasMcp(ctx).some((h) => h.nombre === "core_geo_mapa")).toBe(false);
  });
});
