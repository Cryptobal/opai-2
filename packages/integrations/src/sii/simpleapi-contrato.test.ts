import { afterEach, describe, expect, it, vi } from "vitest";

import { adaptadorSimpleApi } from "./simpleapi";
import generarOk from "./fixtures/simpleapi-generar-ok.json";
import envioGenerarOk from "./fixtures/simpleapi-envio-generar-ok.json";
import envioEnviarOk from "./fixtures/simpleapi-envio-enviar-ok.json";

const CREDS = {
  apiKey: "test-api-key",
  certificadoPfxBase64: Buffer.from("pfx-fake").toString("base64"),
  certificadoClave: "clave",
  resolucionNumero: 80,
  resolucionFecha: "2014-08-22",
  razonSocialEmisor: "Emisor SpA",
};

const PAYLOAD = {
  ambiente: "certificacion" as const,
  tipoDte: 33 as const,
  folio: 100,
  fechaEmision: "2026-11-03",
  rutEmisor: "76111222-8",
  rutReceptor: "76543210-5",
  razonSocialReceptor: "Cliente SpA",
  montos: { neto: 1000, exento: 0, iva: 190, total: 1190 },
  lineas: [{ orden: 0, glosa: "Servicio", monto: 1000 }],
  cafXml: "<CAF/>",
};

describe("SimpleAPI v1 · contrato grabado (CAR-154)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("generar → envio/generar → envio/enviar en multipart con auth Basic", async () => {
    const urls: string[] = [];
    const auth: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        urls.push(String(url));
        auth.push(String(init?.headers && (init.headers as Record<string, string>).Authorization));
        if (String(url).includes("/dte/generar")) {
          return { ok: true, json: async () => generarOk };
        }
        if (String(url).includes("/envio/generar")) {
          return { ok: true, json: async () => envioGenerarOk };
        }
        if (String(url).includes("/envio/enviar")) {
          return { ok: true, json: async () => envioEnviarOk };
        }
        return { ok: false, status: 404, text: async () => "no" };
      }) as unknown as typeof fetch,
    );

    const api = adaptadorSimpleApi(CREDS);
    const firmado = await api.firmar(PAYLOAD);
    expect(firmado.timbrePdf417).toContain("PDF417");
    expect(firmado.xml).toContain("<DTE");

    const envio = await api.enviar(firmado.xml, "certificacion");
    expect(envio.trackId).toBe("TRK-CONTRATO-001");

    expect(urls[0]).toContain("/api/v1/dte/generar");
    expect(urls[1]).toContain("/api/v1/envio/generar");
    expect(urls[2]).toContain("/api/v1/envio/enviar");
    expect(auth.every((h) => h.startsWith("Basic "))).toBe(true);
  });

  it("mapea estados de consulta", async () => {
    const api = adaptadorSimpleApi(CREDS);
    const consultar = async (estado?: string) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          json: async () => ({ estado }),
        })) as unknown as typeof fetch,
      );
      return api.consultar("TRK", "certificacion");
    };
    expect((await consultar("aceptado")).estado).toBe("aceptado");
    expect((await consultar("rechazado")).estado).toBe("rechazado");
    expect((await consultar("reparo")).estado).toBe("reparo");
    expect((await consultar("en_proceso")).estado).toBe("pendiente");
  });
});
