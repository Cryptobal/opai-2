import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { herramientasMcp } from "../src/mcp";
import { contextoDePrueba } from "../src/testing";

beforeAll(() => {
  process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
});
beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env["GOOGLE_MAPS_SERVER_KEY"];
});

describe("integraciones y secretos (ADR-027)", () => {
  it("guarda el secreto cifrado, lo devuelve enmascarado y no lo audita", async () => {
    const { ctx, eventos, tabla } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.integraciones.set_secreto", {
      proveedor: "resend",
      nombre: "api_key",
      valor: "re_superSecreta1234",
    });
    expect(r).toMatchObject({ ok: true, data: { mascara: "••••••••1234" } });
    expect(JSON.stringify(eventos)).not.toContain("re_superSecreta1234");
    expect(JSON.stringify(tabla("secreto"))).not.toContain("re_superSecreta1234");
    const lista = await executeCapability(ctx, "core.integraciones.list", {});
    expect(JSON.stringify(lista)).not.toContain("re_superSecreta1234");
    expect(lista).toMatchObject({ ok: true });
    const resend = lista.ok
      ? (lista.data as { proveedor: string; estado: string }[]).find(
          (i) => i.proveedor === "resend",
        )
      : null;
    expect(resend).toMatchObject({ estado: "configurada" });
  });

  it("valida modalidad, disponibilidad y configuración", async () => {
    const { ctx } = contextoDePrueba();
    const malo = await executeCapability(ctx, "core.integraciones.configurar", {
      proveedor: "ia_openai",
      modalidad: "plataforma",
    });
    expect(malo).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const pronto = await executeCapability(ctx, "core.integraciones.configurar", {
      proveedor: "whatsapp",
      modalidad: "propia",
    });
    expect(pronto.ok === false && pronto.error.message).toMatch(/próximamente/);
    const ok = await executeCapability(ctx, "core.integraciones.configurar", {
      proveedor: "ia_anthropic",
      modalidad: "propia",
      config: { modelos: { economica: "claude-haiku-5-5" } },
    });
    expect(ok).toMatchObject({ ok: true, data: { modalidad: "propia", estado: "no_configurada" } });
  });

  it("solo owner y admin administran integraciones", async () => {
    const { ctx } = contextoDePrueba({ rol: "gerente" });
    expect(await executeCapability(ctx, "core.integraciones.list", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

describe("geolocalización e IA medidas", () => {
  it("geocodifica con la clave de plataforma y mide la consulta", async () => {
    process.env["GOOGLE_MAPS_SERVER_KEY"] = "k";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "OK",
          results: [
            {
              place_id: "p",
              formatted_address: "Quilicura",
              geometry: { location: { lat: -33, lng: -70 } },
              address_components: [],
            },
          ],
        }),
      ),
    );
    const { ctx, usos } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.geo.geocodificar", {
      direccion: "Las Industrias 4520",
    });
    expect(r).toMatchObject({ ok: true, data: { placeId: "p", lat: -33 } });
    expect(usos.map((u) => u.recurso)).toContain("geo.geocodificacion");
  });

  it("sin clave, la geolocalización responde un error claro", async () => {
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.geo.geocodificar", {
      direccion: "Las Industrias 4520",
    });
    expect(r.ok === false && r.error.message).toMatch(/no está disponible/);
  });

  it("IA con key propia (BYOK): mide tokens sin costo", async () => {
    const { ctx, usos } = contextoDePrueba();
    await executeCapability(ctx, "core.integraciones.configurar", {
      proveedor: "ia_anthropic",
      modalidad: "propia",
    });
    await executeCapability(ctx, "core.integraciones.set_secreto", {
      proveedor: "ia_anthropic",
      nombre: "api_key",
      valor: "sk-ant-propia-0001",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          content: [{ type: "text", text: "ok" }],
          usage: { input_tokens: 9, output_tokens: 1 },
        }),
      ),
    );
    const r = await executeCapability(ctx, "core.ia.probar", { clase: "economica" });
    expect(r).toMatchObject({
      ok: true,
      data: { proveedor: "ia_anthropic", modelo: "claude-haiku-5-5", tokensEntrada: 9 },
    });
    expect(usos.filter((u) => u.recurso.startsWith("ia."))).toMatchObject([
      { recurso: "ia.economica.entrada", cantidad: 9, sinCosto: true },
      { recurso: "ia.economica.salida", cantidad: 1, sinCosto: true },
    ]);
  });

  it("la descripción MCP anuncia los campos externos (ADR-034)", () => {
    const { ctx } = contextoDePrueba();
    const h = herramientasMcp(ctx).find((x) => x.nombre === "core_geo_geocodificar");
    expect(h?.descripcion).toMatch(/Campos externos.*direccionFormateada/);
  });
});

describe("fallas de Google Maps visibles (autocompletar)", () => {
  const sinPermiso = () =>
    vi.fn(async (url: unknown) =>
      String(url).includes("places.googleapis.com")
        ? Response.json(
            {
              error: {
                code: 403,
                status: "PERMISSION_DENIED",
                message: "Places API (New) no habilitada.",
              },
            },
            { status: 403 },
          )
        : Response.json({
            status: "OK",
            results: [
              {
                place_id: "p",
                formatted_address: "x",
                geometry: { location: { lat: 1, lng: 2 } },
                address_components: [],
              },
            ],
          }),
    );

  it("core.geo.autocompletar devuelve el mensaje de Google, no un vacío", async () => {
    process.env["GOOGLE_MAPS_SERVER_KEY"] = "SECRETA";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", sinPermiso());
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.geo.autocompletar", { texto: "Las Industrias" });
    expect(r.ok).toBe(false);
    const e = !r.ok ? r.error : null;
    expect(e?.code).toBe("UNPROCESSABLE");
    expect(e?.message).toMatch(/PERMISSION_DENIED.*Places API \(New\) no habilitada/);
    expect(e?.message).not.toContain("SECRETA");
  });

  it("probar prueba también el autocompletado y deja la integración en error con su ultimo_error", async () => {
    process.env["GOOGLE_MAPS_SERVER_KEY"] = "SECRETA";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", sinPermiso());
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.integraciones.probar", {
      proveedor: "google_maps",
    });
    expect(r).toMatchObject({ ok: true, data: { ok: false } });
    const mensaje = r.ok ? (r.data as { mensaje: string }).mensaje : "";
    expect(mensaje).toMatch(/Autocompletado: .*PERMISSION_DENIED/);
    expect(mensaje).not.toMatch(/Geocodificación/);
    expect(mensaje).not.toContain("SECRETA");
    const lista = await executeCapability(ctx, "core.integraciones.list", {});
    const fila = (
      lista.ok
        ? (lista.data as { proveedor: string; estado: string; ultimoError: string | null }[])
        : []
    ).find((i) => i.proveedor === "google_maps");
    expect(fila?.estado).toBe("error");
    expect(fila?.ultimoError).toMatch(/PERMISSION_DENIED/);
  });
});
