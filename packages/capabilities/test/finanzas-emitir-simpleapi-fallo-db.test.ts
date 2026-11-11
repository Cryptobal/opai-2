// CAR-242 · «Confirmar emisión» con SimpleAPI: un fallo de generar/HTTP llega como UNPROCESSABLE con motivo claro
// (no INTERNAL), el dry-run nunca firma y un fallo de firma no consume el folio ni deja track ID.
// Adaptador SimpleAPI real con credenciales ficticias y `fetch` simulado: nada sale a la red ni se emite.
import { adaptadorSimpleApi, adaptadorSiiSimulado, type AdaptadorSii } from "@opai/integrations";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { urlPropietario } from "../../db/test/entorno";
import { leerMultipart, textoInput } from "../../integrations/src/sii/multipart-prueba";

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
  actecoEmisor: 801000,
};

/** Datos tributarios del emisor (CAR-240): sin ellos, y sin ACTECO, SimpleAPI rechaza el DTE con 401. */
const emisor = { razonSocial: "Empresa Ficticia SpA", giro: "Servicios de prueba", calle: "Calle Ficticia 1", comuna: "Comuna Ficticia", ciudad: "Ciudad Ficticia" };

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
    await s.e.admin.perfilEmpresa.create({ data: { tenantId: s.tenantId, ...emisor } });
    await s.dato("finanzas.dte_config.actualizar", { ambiente: "certificacion", acteco: 801000 });
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

  it("sin ACTECO ni ciudad del emisor: bloquea con lo que falta y dónde completarlo, sin llamar a SimpleAPI ni usar folio (CAR-240)", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const falta =
      "Faltan datos tributarios de tu empresa: ACTECO y ciudad. " +
      "Complétalos en Configuración › Empresa.";
    await s.dato("finanzas.dte_config.actualizar", { ambiente: "certificacion", acteco: null });
    await s.e.admin.perfilEmpresa.update({ where: { tenantId: s.tenantId }, data: { ciudad: " " } });
    try {
      const r = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir", { documentoId });
      expect(r.ok ? null : r.error.code).toBe("UNPROCESSABLE");
      expect(r.ok ? "" : r.error.message).toBe(`${falta} El documento sigue sin emitir y el folio no se usó.`);
      expect(r.ok ? 0 : r.error.message.length).toBeLessThanOrEqual(300);
      const pre = await s.dato<{ items: { codigo: string; ok: boolean; mensaje: string }[] }>("finanzas.ventas.preflight_emision", { documentoId });
      expect(pre.items.find((i) => i.codigo === "emisor_tributario")).toMatchObject({ ok: false, mensaje: falta });
    } finally {
      await s.dato("finanzas.dte_config.actualizar", { ambiente: "certificacion", acteco: 801000 });
      await s.e.admin.perfilEmpresa.update({ where: { tenantId: s.tenantId }, data: emisor });
    }
    const pre = await s.dato<{ items: { codigo: string; ok: boolean }[] }>("finanzas.ventas.preflight_emision", { documentoId });
    expect(pre.items.find((i) => i.codigo === "emisor_tributario")?.ok).toBe(true);
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

  it("401 vacío: el mismo error por la UI y por el MCP, sin vencimiento y con log seguro (CAR-240)", async () => {
    const entradas: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { headers: Record<string, string>; body?: Uint8Array }) => {
        // «Probar conexión» reconoce la key (GET Suscripcion/status, sin cuerpo): el 401 vacío es del contenido (CAR-263b).
        if (url.endsWith("/Suscripcion/status") || !init.body) return Response.json({ mensaje: "Suscripcion activa" });
        entradas.push(JSON.parse(textoInput(leerMultipart(init.body, String(init.headers["Content-Type"])))));
        // Como el rechazo de las 20:43 del 10-nov-2026: sin cuerpo y con los headers de cupo (que SimpleAPI envía siempre; CAR-263).
        return new Response(null, { status: 401, headers: { "x-rate-limit-limit": "1m", "x-rate-limit-remaining": "39" } });
      }),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const ui = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir", { documentoId });
      // El MCP expone la misma capacidad (`finanzas_ventas_emitir`) y no arma otro cliente HTTP.
      const { ejecutarHerramienta, herramientasMcp } = await import("../src/mcp");
      const herramienta = herramientasMcp(s.ctx()).find((h) => h.nombre === "finanzas_ventas_emitir");
      expect(herramienta?.capacidad.id).toBe("finanzas.ventas.emitir");
      if (!herramienta) return;
      const mcp = await ejecutarHerramienta(s.ctx(), herramienta, { documentoId });
      expect(ui.ok || mcp.ok).toBe(false);
      if (ui.ok || mcp.ok) return;
      expect(ui.error.code).toBe("UNPROCESSABLE");
      expect(ui.error.message).toContain(
        "SimpleAPI no pudo generar ni firmar el DTE: respondió HTTP 401 sin motivo, pero sí reconoce la API key: rechazó el contenido (certificado, CAF o JSON), no la key",
      );
      expect(ui.error.message).not.toMatch(/mal copiada|cópiala/);
      expect(ui.error.message).toContain("El borrador sigue sin emitir y el folio no se usó.");
      expect({ code: mcp.error.code, message: mcp.error.message }).toEqual({ code: ui.error.code, message: ui.error.message });
      // Las dos llamadas mandaron el mismo JSON: sin vencimiento (el borrador sí lo tiene), con FormaPago y el titular.
      expect(entradas).toHaveLength(2);
      expect(entradas[1]).toEqual(entradas[0]);
      const doc = await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: documentoId } });
      expect(doc.fechaVencimiento).not.toBeNull();
      const entrada = entradas[0] as { Documento: { Encabezado: { IdentificacionDTE: Record<string, unknown> } }; Certificado: { Rut: string } };
      expect(Object.keys(entrada.Documento.Encabezado.IdentificacionDTE)).toEqual(["TipoDTE", "Folio", "FechaEmisionString", "FormaPago"]);
      expect(entrada.Documento.Encabezado.IdentificacionDTE.FormaPago).toBe(2);
      expect(entrada.Certificado.Rut).toBe("11111111-1");
      // Log del rechazo: forma de la respuesta y de la petición, nunca secretos, base64 ni XML.
      const rechazos = warn.mock.calls.filter((c) => c[0] === "[sii] rechazo_proveedor").map((c) => c[1]);
      expect(rechazos).toHaveLength(2);
      expect(rechazos[0]).toMatchObject({
        status: 401,
        cuerpo: "vacio",
        sondaKey: { estado: "reconocida", esquema: "basic" },
        limites: { "x-rate-limit-limit": "1m", "x-rate-limit-remaining": "39" },
        respuesta: { contentType: null, contentLength: null, cuerpoLargo: 0, detalleLargo: null },
        peticion: {
          pfxBytes: Buffer.from("pfx-ficticio").length,
          pfxDer: false,
          cafFormato: "ascii",
          certificadoRutValido: true,
          clavesIdentificacionDte: ["TipoDTE", "Folio", "FechaEmisionString", "FormaPago"],
        },
      });
      const log = JSON.stringify(rechazos);
      for (const secreto of [credsFicticias.apiKey, credsFicticias.certificadoClave, credsFicticias.certificadoPfxBase64, "AUTORIZACION"]) {
        expect(log).not.toContain(secreto);
      }
    } finally {
      warn.mockRestore();
    }
    expect(await folioActual()).toBe(5000);
    const doc = await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: documentoId } });
    expect([doc.estadoDte, doc.folio, doc.trackIdSii]).toEqual(["borrador", null, null]);
  });

  it("una respuesta que no es XML también llega con motivo, nunca como INTERNAL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Servicio no disponible", { status: 200 })));
    const r = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir", { documentoId });
    expect(r.ok ? null : r.error.code).toBe("UNPROCESSABLE");
    expect(r.ok ? "" : r.error.message).toContain("la respuesta no es un XML de DTE");
    expect(await folioActual()).toBe(5000);
  });
});
