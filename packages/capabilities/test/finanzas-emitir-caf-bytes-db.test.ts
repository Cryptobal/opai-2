// CAR-240 · el CAF viaja en sus bytes ISO-8859-1 desde la carga hasta SimpleAPI, y un CAF dañado o de otro RUT se
// bloquea antes de llamar al proveedor (emisión y preflight). Adaptador SimpleAPI real con credenciales ficticias y
// `fetch` simulado: nada sale a la red ni se emite. CAF sintético; ningún test imprime el XML.
import { adaptadorSimpleApi, adaptadorSiiSimulado, cifrar, descifrar, type AdaptadorSii } from "@opai/integrations";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { urlPropietario } from "../../db/test/entorno";
import { dekDe } from "../src/integraciones/secretos";

import { cafXmlSintetico } from "./finanzas-caf-fixture";
import { leerMultipart } from "../../integrations/src/sii/multipart-prueba";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

const estado = vi.hoisted(() => ({ adaptador: null as AdaptadorSii | null }));
vi.mock("../src/finanzas/adaptador-sii", () => ({
  adaptadorSiiDe: async () => estado.adaptador ?? adaptadorSiiSimulado(),
}));

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
const emisor = { razonSocial: "Empresa Ficticia SpA", giro: "Servicios de prueba", calle: "Calle Ficticia 1", comuna: "Comuna Ficticia", ciudad: "Ciudad Ficticia" };
const MENSAJE_401_VACIO =
  "SimpleAPI no pudo generar ni firmar el DTE: respondió HTTP 401 sin motivo, también al repetir con token; usa «Probar conexión» en Integraciones › Emisión DTE para ver qué responde a la API key. El borrador sigue sin emitir y el folio no se usó.";

/** CAF sintético con una «ñ» en la razón social: en el archivo es el byte 0xF1, un carácter por byte en el texto. */
const cafConEne = (folioDesde: number) =>
  cafXmlSintetico({ folioDesde, folioHasta: folioDesde + 10 }).replace(/<RS>[^<]*<\/RS>/, "<RS>COMPAñIA FICTICIA</RS>");

describe.skipIf(!urlPropietario)("CAF en bytes ISO-8859-1 hasta SimpleAPI (CAR-240)", () => {
  let s: VentasDbSuite;
  let documentoId = "";
  beforeAll(async () => {
    s = await prepararVentasDb();
    estado.adaptador = adaptadorSimpleApi(credsFicticias);
    await s.e.admin.cuenta.update({ where: { id: s.cuentaId }, data: { giro: "Servicios", calle: "Calle 1", comuna: "Santiago" } });
    await s.e.admin.perfilEmpresa.create({ data: { tenantId: s.tenantId, ...emisor } });
    await s.dato("finanzas.dte_config.actualizar", { ambiente: "certificacion", acteco: 801000 });
    // El preflight revisa el CAF solo con el proveedor real.
    await s.e.admin.dteConfig.update({ where: { tenantId: s.tenantId }, data: { emisionProveedor: "simpleapi" } });
    await s.e.admin.dteFolio.updateMany({ where: { tenantId: s.tenantId }, data: { activo: false } });
    const b = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Servicio de prueba", monto: 10_000 }],
    });
    documentoId = b.id;
  }, 120_000);
  afterEach(async () => {
    vi.unstubAllGlobals();
    await s.e.admin.dteFolio.updateMany({ where: { tenantId: s.tenantId }, data: { activo: false } });
  });
  afterAll(async () => {
    estado.adaptador = null;
    await s?.e.cerrar();
  });

  const emitir = () => s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir", { documentoId });
  const preflight = async () =>
    (await s.dato<{ items: { codigo: string; ok: boolean; mensaje: string }[] }>("finanzas.ventas.preflight_emision", { documentoId })).items.find(
      (i) => i.codigo === "caf_integro",
    );
  const secretoDe = async (folioDesde: number) => {
    const f = await s.e.admin.dteFolio.findFirstOrThrow({ where: { tenantId: s.tenantId, folioDesde } });
    return { folio: f, secreto: await s.e.admin.secreto.findUniqueOrThrow({ where: { id: f.cafSecretoId! } }) };
  };

  it("cargar un CAF con U+FFFD (tildes perdidas) se rechaza al cargarlo, sin guardar nada", async () => {
    const danado = cafConEne(7000).replace("ñ", "�");
    const r = await s.mod.executeCapability(s.ctx(), "finanzas.folios.cargar_caf", { cafXml: danado });
    expect(r.ok ? null : r.error.code).toBe("UNPROCESSABLE");
    expect(r.ok ? "" : r.error.message).toMatch(/^El archivo CAF trae caracteres que no son ISO-8859-1/);
    // Un archivo que un editor guardó como UTF-8 trae los bytes de U+FFFD, cada uno ≤ 0xFF: también se rechaza.
    const reGuardado = Buffer.from(danado, "utf8").toString("latin1");
    const r2 = await s.mod.executeCapability(s.ctx(), "finanzas.folios.cargar_caf", { cafXml: reGuardado });
    expect(r2.ok ? "" : r2.error.message).toMatch(/^El archivo CAF trae caracteres que no son ISO-8859-1/);
    expect(await s.e.admin.dteFolio.count({ where: { tenantId: s.tenantId, folioDesde: 7000 } })).toBe(0);
  });

  it("un 0xF1 se guarda en latin1 y llega a SimpleAPI en los mismos bytes; un 401 vacío apunta a la key (CAR-263)", async () => {
    const caf = cafConEne(7100);
    await s.dato("finanzas.folios.cargar_caf", { cafXml: caf });
    const original = Buffer.from(caf, "latin1");
    const { secreto } = await secretoDe(7100);
    const guardado = descifrar(await dekDe(s.ctx()), { cifrado: secreto.cifrado, iv: secreto.iv, tag: secreto.tag });
    expect(guardado.equals(original)).toBe(true); // un byte por carácter: nunca los dos bytes UTF-8 de la ñ
    expect((await preflight())?.ok).toBe(true);
    const enviados: Buffer[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { headers: Record<string, string>; body: Uint8Array }) => {
        const partes = leerMultipart(init.body, String(init.headers["Content-Type"]));
        enviados.push(Buffer.from(partes[2]!.bytes));
        return new Response("", { status: 401, headers: { "x-rate-limit-remaining": "39" } });
      }),
    );
    const r = await emitir();
    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.equals(original)).toBe(true);
    expect(r.ok ? null : r.error.code).toBe("UNPROCESSABLE");
    expect(r.ok ? "" : r.error.message).toBe(MENSAJE_401_VACIO);
    expect((await secretoDe(7100)).folio.folioActual).toBe(7100);
  });

  it("un CAF guardado antes como UTF-8 con U+FFFD se bloquea antes de SimpleAPI, en la emisión y en el preflight", async () => {
    await s.dato("finanzas.folios.cargar_caf", { cafXml: cafConEne(7200) });
    const { secreto } = await secretoDe(7200);
    // Simula un CAF cargado antes de CAR-240, leído como UTF-8 en el navegador y guardado como UTF-8.
    const anterior = Buffer.from(cafConEne(7200).replace("ñ", "�"), "utf8");
    const c = cifrar(await dekDe(s.ctx()), anterior);
    await s.e.admin.secreto.update({ where: { id: secreto.id }, data: { cifrado: Uint8Array.from(c.cifrado), iv: Uint8Array.from(c.iv), tag: Uint8Array.from(c.tag) } });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const r = await emitir();
    expect(r.ok ? "" : r.error.message).toMatch(/^El CAF de este folio se guardó dañado/);
    expect(await preflight()).toMatchObject({ ok: false, mensaje: expect.stringMatching(/^El CAF de este folio se guardó dañado/) });
    expect(fetch).not.toHaveBeenCalled();
    expect((await secretoDe(7200)).folio.folioActual).toBe(7200);
  });

  it("un CAF de otro RUT que el emisor se bloquea antes de SimpleAPI y el preflight lo marca, sin mostrar el CAF", async () => {
    const caf = cafConEne(7300);
    await s.dato("finanzas.folios.cargar_caf", { cafXml: caf });
    await s.e.admin.dteConfig.update({ where: { tenantId: s.tenantId }, data: { rutEmisor: "77234567-8" } });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    try {
      const r = await emitir();
      expect(r.ok ? "" : r.error.message).toMatch(/^El CAF de este folio está autorizado para otro RUT/);
      const item = await preflight();
      expect(item).toMatchObject({ ok: false, mensaje: expect.stringMatching(/otro RUT/) });
      expect(item?.mensaje).not.toContain("<");
      expect(item?.mensaje).not.toContain("76111222-8");
    } finally {
      await s.e.admin.dteConfig.update({ where: { tenantId: s.tenantId }, data: { rutEmisor: "76111222-8" } });
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
