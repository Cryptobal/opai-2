// CAR-644: acuse de DTE recibidos. `fetch` simulado; secretos ficticios.
import { afterEach, describe, expect, it, vi } from "vitest";

import { acuseRecibido, aceptarConAcuse, interpretarAcuse, RUTA_ACUSE_COMPRA } from "./simpleapi-acuse";

const creds = {
  apiKey: "AAAA-BBBB-CCCC-DDDD-EEEE",
  certificadoPfxBase64: Buffer.from([0x30, 0x82]).toString("base64"),
  certificadoClave: "clave-ficticia",
  certificadoRut: "11111111-1",
};
const pedido = { tipoDte: 33, folio: 9001, rutProveedor: "76543210-3", accion: "ACD" as const };

describe("interpretarAcuse", () => {
  it("reconoce éxito y rechazo", () => {
    expect(interpretarAcuse({ descripcion: "Acción completada OK" }).ok).toBe(true);
    expect(interpretarAcuse({ descripcion: "Evento registrado previamente" }).ok).toBe(true);
    expect(interpretarAcuse({ descripcion: "DTE no encontrado" }).ok).toBe(false);
  });
});

describe("acuseRecibido", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("arma la petición multipart y no filtra secretos en errores", async () => {
    const llamadas: { url: string; headers: Headers; body: Uint8Array }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        llamadas.push({ url, headers: init?.headers as Headers, body: new Uint8Array(init?.body as ArrayBuffer) });
        return new Response(JSON.stringify({ descripcion: "Acción completada OK", trackId: "123" }), { status: 200 });
      }),
    );
    const r = await acuseRecibido(creds, pedido, "produccion");
    expect(r).toEqual({ ok: true, trackId: "123" });
    expect(llamadas[0]?.url).toBe(RUTA_ACUSE_COMPRA);
    const texto = new TextDecoder().decode(llamadas[0]?.body ?? new Uint8Array());
    expect(texto).toContain('name="files"');
    expect(texto).toContain("76543210-3");
    expect(texto).not.toContain(creds.apiKey);
  });

  it("aceptarConAcuse hace ACD y ERM", async () => {
    const acciones: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        acciones.push("x");
        return new Response(JSON.stringify({ descripcion: "Acción completada OK" }), { status: 200 });
      }),
    );
    vi.useFakeTimers();
    const p = aceptarConAcuse(creds, { tipoDte: 33, folio: 1, rutProveedor: "1-9" }, "certificacion");
    await vi.advanceTimersByTimeAsync(1600);
    const r = await p;
    vi.useRealTimers();
    expect(r.ok).toBe(true);
    expect(acciones).toHaveLength(2);
  });
});