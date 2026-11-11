// CAR-273: RCV de compras de SimpleAPI. `fetch` se simula y nunca sale a la red; key, clave y certificado son ficticios.
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorProveedorSii } from "./error-proveedor";
import { leerMultipart, textoInput } from "./multipart-prueba";
import { consultarRcvCompras, normalizarDetalleRcv, rutaRcvCompras } from "./simpleapi-rcv";

const creds = {
  apiKey: "AAAA-BBBB-CCCC-DDDD-EEEE",
  certificadoPfxBase64: Buffer.from([0x30, 0x82, 0x01, 0x02]).toString("base64"),
  certificadoClave: "clave-ficticia-123",
  certificadoRut: "11111111-1",
  rutEmpresa: "76000000-0",
};
type Llamada = { url: string; init: RequestInit };

function responder(r: () => Response) {
  const llamadas: Llamada[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, init?: RequestInit) => {
      llamadas.push({ url: String(url), init: init ?? {} });
      return r();
    }),
  );
  return llamadas;
}
afterEach(() => vi.unstubAllGlobals());

const detalle = (extra: Record<string, unknown> = {}) => ({
  tipoDTE: 33,
  folio: 1234,
  fechaEmision: "2026-11-03T00:00:00",
  rutProveedor: "76.543.210-K",
  razonSocial: "Proveedor Ficticio SpA",
  montoNeto: 10000,
  montoExento: 0,
  montoIvaRecuperable: 1900,
  montoTotal: 11900,
  ...extra,
});

describe("normalizarDetalleRcv", () => {
  it("acepta camelCase y PascalCase y deja el RUT sin puntos", () => {
    const esperado = {
      rutEmisor: "76543210-K",
      razonSocial: "Proveedor Ficticio SpA",
      tipoDte: 33,
      folio: 1234,
      fechaEmision: "2026-11-03",
      montoNeto: 10000,
      montoExento: 0,
      montoIva: 1900,
      montoTotal: 11900,
    };
    expect(normalizarDetalleRcv(detalle())).toEqual(esperado);
    const pascal = Object.fromEntries(Object.entries(detalle()).map(([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), v]));
    expect(normalizarDetalleRcv(pascal)).toEqual(esperado);
  });
  it("descarta filas sin tipo, folio, fecha o RUT válidos", () => {
    for (const malo of [{ tipoDTE: null }, { folio: 0 }, { fechaEmision: "03-11-2026" }, { rutProveedor: "sin-rut" }]) {
      expect(normalizarDetalleRcv(detalle(malo))).toBeNull();
    }
  });
});

describe("consultarRcvCompras", () => {
  it("POST a servicios.simpleapi.cl con input y certificado, en producción y detallado", async () => {
    const llamadas = responder(() => Response.json({ compras: { detalleCompras: [detalle(), detalle({ folio: "x" })] } }));
    const r = await consultarRcvCompras(creds, 11, 2026);
    expect(r).toEqual({ documentos: [normalizarDetalleRcv(detalle())], descartados: 1 });
    expect(llamadas[0]?.url).toBe(rutaRcvCompras(11, 2026));
    expect(llamadas[0]?.url).toBe("https://servicios.simpleapi.cl/api/rcv/compras/11/2026");
    const headers = llamadas[0]?.init.headers as Record<string, string>;
    const partes = leerMultipart(Buffer.from(llamadas[0]?.init.body as Uint8Array), headers["Content-Type"] ?? "");
    expect(partes.map((p) => [p.nombre, p.archivo])).toEqual([
      ["input", null],
      ["certificado", "certificado.pfx"],
    ]);
    expect(JSON.parse(textoInput(partes))).toMatchObject({
      RutCertificado: "11111111-1",
      RutUsuario: "11111111-1",
      RutEmpresa: "76000000-0",
      Ambiente: 1,
      Detallado: true,
    });
    expect(partes[1]?.bytes.equals(Buffer.from(creds.certificadoPfxBase64, "base64"))).toBe(true);
  });
  it("respuesta en PascalCase o sin compras", async () => {
    responder(() => Response.json({ Compras: { DetalleCompras: [detalle()] } }));
    expect((await consultarRcvCompras(creds, 10, 2026)).documentos).toHaveLength(1);
    responder(() => Response.json({ ventas: {} }));
    expect(await consultarRcvCompras(creds, 10, 2026)).toEqual({ documentos: [], descartados: 0 });
  });
  it("un HTTP no 2xx o un cuerpo que no es JSON es un error tipado, sin secretos", async () => {
    responder(() => new Response(`Apikey ${creds.apiKey} sin RCV clave ${creds.certificadoClave}`, { status: 403 }));
    const e = await consultarRcvCompras(creds, 11, 2026).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorProveedorSii);
    expect(e).toMatchObject({ status: 403, motivo: "RCV de compras: respondió HTTP 403" });
    expect(JSON.stringify(e)).not.toContain(creds.apiKey);
    expect(JSON.stringify(e)).not.toContain(creds.certificadoClave);
    responder(() => new Response("<html>caído</html>", { status: 200 }));
    await expect(consultarRcvCompras(creds, 11, 2026)).rejects.toMatchObject({ motivo: "RCV de compras: la respuesta no es un JSON válido" });
  });
});
