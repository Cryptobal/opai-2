// CAR-242 · «Confirmar emisión» con SimpleAPI: un fallo de generar/HTTP llega como UNPROCESSABLE con motivo claro
// (no INTERNAL), el dry-run nunca firma y un fallo de firma no consume el folio ni deja track ID.
// Adaptador SimpleAPI real con credenciales ficticias y `fetch` simulado: nada sale a la red ni se emite.
import { adaptadorSimpleApi, adaptadorSiiSimulado, type AdaptadorSii } from "@opai/integrations";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

const estado = vi.hoisted(() => ({ adaptador: null as AdaptadorSii | null }));
vi.mock("../src/finanzas/adaptador-sii", () => ({
  adaptadorSiiDe: async () => estado.adaptador ?? adaptadorSiiSimulado(),
}));

/** Mensaje exacto que ve la persona; `apps/web/test/mensajes-error.test.ts` comprueba que la UI lo muestra tal cual. */
const MENSAJE_HTTP_400 =
  "SimpleAPI no pudo generar ni firmar el DTE: respondió HTTP 400 (Rut receptor no valido). El borrador sigue sin emitir y el folio no se usó.";

const tributarios = { giro: "Servicios de prueba", calle: "Calle Ficticia 123", comuna: "Comuna Ficticia" };

const credsFicticias = {
  apiKey: "clave-api-ficticia-de-prueba-0000000000",
  certificadoPfxBase64: Buffer.from("pfx-ficticio").toString("base64"),
  certificadoClave: "clave-ficticia",
  certificadoRut: "11111111-1",
  rutEmpresa: "76111222-8",
  resolucionNumero: 0,
  resolucionFecha: "2024-01-01",
};

describe.skipIf(!urlPropietario)("emitir con SimpleAPI: fallo de firma (CAR-242)", () => {
  let s: VentasDbSuite;
  let documentoId = "";
  const firmar = vi.fn<AdaptadorSii["firmar"]>();
  beforeAll(async () => {
    s = await prepararVentasDb();
    const real = adaptadorSimpleApi(credsFicticias);
    firmar.mockImplementation((p) => real.firmar(p));
    estado.adaptador = { ...real, firmar };
    // Datos tributarios del receptor (CAR-240): sin ellos la emisión real se bloquea antes de llamar a SimpleAPI.
    await s.e.admin.cuenta.update({ where: { id: s.cuentaId }, data: tributarios });
    const b = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Servicio de prueba", monto: 100_000 }],
    });
    documentoId = b.id;
  }, 120_000);
  afterEach(() => vi.unstubAllGlobals());
  afterAll(async () => {
    estado.adaptador = null;
    await s?.e.cerrar();
  });

  const folioActual = async () =>
    (await s.e.admin.dteFolio.findFirstOrThrow({ where: { tenantId: s.tenantId, folioDesde: 5000 } })).folioActual;

  it("la vista previa no firma ni llama a SimpleAPI, y dice proveedor y ambiente", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const r = await s.dato<{ folio: number; emisionPrevista: unknown }>(
      "finanzas.ventas.emitir",
      { documentoId },
      { dryRun: true },
    );
    expect(firmar).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(r.folio).toBe(5000);
    expect(r.emisionPrevista).toEqual({ proveedor: "simpleapi", ambiente: "certificacion" });
  });

  it("sin giro ni comuna del cliente: bloquea con lo que falta, sin llamar a SimpleAPI ni usar folio (CAR-240)", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await s.e.admin.cuenta.update({ where: { id: s.cuentaId }, data: { giro: null, comuna: " " } });
    try {
      const r = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir", { documentoId });
      expect(r.ok ? null : r.error.code).toBe("UNPROCESSABLE");
      expect(r.ok ? "" : r.error.message).toBe(
        "Al cliente le faltan datos tributarios: giro y comuna. Complétalos en la ficha del cliente antes de emitir al SII. El documento sigue sin emitir y el folio no se usó.",
      );
      const pre = await s.dato<{ items: { codigo: string; ok: boolean; bloqueante: boolean; mensaje: string }[] }>(
        "finanzas.ventas.preflight_emision",
        { documentoId },
      );
      // La config de este tenant sigue en «simulado» (el adaptador está inyectado): el preflight dice qué falta,
      // y bloquea solo con SimpleAPI configurado.
      expect(pre.items.find((i) => i.codigo === "receptor_tributario")).toMatchObject({
        ok: false,
        mensaje: "Al cliente le faltan datos tributarios: giro y comuna. Complétalos en la ficha del cliente antes de emitir al SII.",
      });
    } finally {
      await s.e.admin.cuenta.update({ where: { id: s.cuentaId }, data: tributarios });
    }
    expect(firmar).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(await folioActual()).toBe(5000);
  });

  it("HTTP 400 de generar: UNPROCESSABLE con el motivo; borrador intacto, folio sin consumir y sin track ID", async () => {
    const antes = await folioActual();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ mensaje: "Rut receptor no valido" }), { status: 400 })),
    );
    const r = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir", { documentoId });
    expect(firmar).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("UNPROCESSABLE");
    expect(r.error.message).toBe(MENSAJE_HTTP_400);
    expect(r.error.message).not.toContain(credsFicticias.apiKey);
    expect(await folioActual()).toBe(antes);
    const doc = await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: documentoId } });
    expect([doc.estadoDte, doc.folio, doc.trackIdSii, doc.xmlStorageKey]).toEqual(["borrador", null, null, null]);
    expect(await s.e.admin.dteEnvio.count({ where: { documentoId } })).toBe(0);
  });

  it("una respuesta que no es XML también llega con motivo, nunca como INTERNAL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Servicio no disponible", { status: 200 })));
    const r = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir", { documentoId });
    expect(r.ok ? null : r.error.code).toBe("UNPROCESSABLE");
    expect(r.ok ? "" : r.error.message).toContain("la respuesta no es un XML de DTE");
    expect(await folioActual()).toBe(5000);
  });
});
