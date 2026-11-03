// CAR-143 · CAF endurecido: parser, cifrado, dryRun y aislamiento entre tenants.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SLUG_TENANT_QA_FINANZAS } from "@opai/domain";
import { urlPropietario } from "../../db/test/entorno";

import { cafXmlSintetico } from "./finanzas-caf-fixture";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

describe.skipIf(!urlPropietario)("Finanzas · folios CAF endurecido (db)", () => {
  let s: VentasDbSuite;

  beforeAll(async () => {
    s = await prepararVentasDb();
  });

  afterAll(async () => {
    if (s?.tenantId) {
      const where = { tenantId: { in: [s.tenantId, s.tenantB] } };
      await s.e.admin.secreto.deleteMany({ where }).catch(() => undefined);
      await s.e.admin.claveTenant.deleteMany({ where }).catch(() => undefined);
    }
    await s?.e.cerrar();
  });

  it("dryRun no persiste folio ni secreto", async () => {
    const antesFolios = await s.e.admin.dteFolio.count({ where: { tenantId: s.tenantId } });
    const antesSecretos = await s.e.admin.secreto.count({ where: { tenantId: s.tenantId } });
    const preview = await s.dato<{ lectura: string; id: string }>(
      "finanzas.folios.cargar_caf",
      { cafXml: cafXmlSintetico({ folioDesde: 6000, folioHasta: 6005 }) },
      { dryRun: true },
    );
    expect(preview.lectura).toContain("CAF 33");
    expect(preview.lectura).not.toContain("<CAF");
    expect(preview.id).toBe("");
    const despuesFolios = await s.e.admin.dteFolio.count({ where: { tenantId: s.tenantId } });
    const despuesSecretos = await s.e.admin.secreto.count({ where: { tenantId: s.tenantId } });
    expect(despuesFolios).toBe(antesFolios);
    expect(despuesSecretos).toBe(antesSecretos);
  });

  it("la respuesta y auditoría no incluyen el XML del CAF ni la llave", async () => {
    const xml = cafXmlSintetico({ folioDesde: 6100, folioHasta: 6102, idk: "CERT-UNICO-6100" });
    const marca = "MARCA_SECRETA_XML_NO_DEBE_FILTRAR_6100";
    const llaveMarca = "LLAVE_PRIVADA_MARCA_6100";
    const out = await s.dato<{ lectura: string }>("finanzas.folios.cargar_caf", {
      cafXml: xml.replace("c2luZ3R1cmE=", marca).replace("<FRMA", `<RSAPRIVATEKEY>${llaveMarca}</RSAPRIVATEKEY><FRMA`),
    });
    expect(JSON.stringify(out)).not.toContain(marca);
    expect(JSON.stringify(out)).not.toContain(llaveMarca);
    expect(out.lectura).not.toContain("<");
    const eventos = await s.e.admin.bitacora.findMany({
      where: { tenantId: s.tenantId, tipo: "finanzas.folios.caf_cargado" },
      orderBy: { seq: "desc" },
      take: 1,
    });
    expect(eventos[0]?.payloadCanon ?? "").not.toContain(marca);
    const audit = await s.e.admin.auditEvent.findMany({
      where: { tenantId: s.tenantId, capability: "finanzas.folios.cargar_caf" },
      orderBy: { seq: "desc" },
      take: 1,
    });
    const auditTexto = JSON.stringify(audit[0]?.payload ?? {});
    expect(auditTexto).not.toContain(marca);
    expect(auditTexto).not.toContain(llaveMarca);
    expect(auditTexto).not.toContain("<CAF");
    expect(auditTexto).toContain("[oculto]");
  });

  it("tenant B no ve folios del tenant A; mismo rango en B permitido", async () => {
    const rutB = "10000013-K";
    const xml = cafXmlSintetico({ folioDesde: 5000, folioHasta: 5002 });
    await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.dte_config.actualizar", {
      ambiente: "certificacion",
      rutEmisor: rutB,
    });
    const listaB0 = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.folios.listar", {});
    expect(listaB0.ok).toBe(true);
    if (!listaB0.ok) throw new Error("listar B");
    expect((listaB0.data as { items: unknown[] }).items).toHaveLength(0);

    const cargadoB = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.folios.cargar_caf", {
      cafXml: xml.replace("76111222-8", rutB),
    });
    expect(cargadoB.ok).toBe(true);

    const listaA = await s.mod.executeCapability(s.ctx(s.tenantId), "finanzas.folios.listar", {});
    const listaB = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.folios.listar", {});
    expect(listaA.ok && listaB.ok).toBe(true);
    const idsA = (listaA.ok ? (listaA.data as { items: { id: string }[] }).items : []).map((i) => i.id);
    const idsB = (listaB.ok ? (listaB.data as { items: { id: string }[] }).items : []).map((i) => i.id);
    for (const id of idsB) expect(idsA).not.toContain(id);
  });

  it("tenant QA rechaza CAF no sintético", async () => {
    const existente = await s.e.admin.tenant.findUnique({ where: { slug: SLUG_TENANT_QA_FINANZAS } });
    const qaId =
      existente?.id ??
      (
        await s.e.admin.tenant.create({
          data: {
            slug: SLUG_TENANT_QA_FINANZAS,
            nombre: "Vigía Austral SpA",
            vertical: "seguridad",
          },
        })
      ).id;
    await s.mod.executeCapability(s.ctx(qaId), "finanzas.dte_config.actualizar", {
      ambiente: "certificacion",
      rutEmisor: "12345678-5",
    });
    const mal = await s.mod.executeCapability(s.ctx(qaId), "finanzas.folios.cargar_caf", {
      cafXml: cafXmlSintetico({ idk: "PRODUCCION-NO-SINTETICO", rut: "12345678-5" }),
    });
    expect(mal).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const trampa = await s.mod.executeCapability(s.ctx(qaId), "finanzas.folios.cargar_caf", {
      cafXml: cafXmlSintetico({ idk: "EVIL-SINTETICO-FAKE", rut: "12345678-5" }),
    });
    expect(trampa).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("rechaza recargar un rango ya cargado aunque esté inactivo (A1)", async () => {
    const xml = cafXmlSintetico({ folioDesde: 7000, folioHasta: 7002, idk: "CERT-7000-UNICO" });
    await s.dato("finanzas.folios.cargar_caf", { cafXml: xml });
    await s.e.admin.dteFolio.updateMany({
      where: { tenantId: s.tenantId, folioDesde: 7000 },
      data: { activo: false, folioActual: 7003 },
    });
    const mal = await s.mod.executeCapability(s.ctx(), "finanzas.folios.cargar_caf", { cafXml: xml });
    expect(mal).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("dos cargas concurrentes del mismo rango: solo una persiste (A2)", async () => {
    const xml = cafXmlSintetico({ folioDesde: 7100, folioHasta: 7105, idk: "CERT-7100-RACE" });
    const cargar = () => s.mod.executeCapability(s.ctx(), "finanzas.folios.cargar_caf", { cafXml: xml });
    const r = await Promise.allSettled([cargar(), cargar()]);
    const ok = r.filter((x) => x.status === "fulfilled" && x.value.ok);
    const mal = r.filter((x) => x.status === "fulfilled" && !x.value.ok);
    expect(ok).toHaveLength(1);
    expect(mal).toHaveLength(1);
    const n = await s.e.admin.dteFolio.count({
      where: { tenantId: s.tenantId, folioDesde: 7100, folioHasta: 7105 },
    });
    expect(n).toBe(1);
  });

  it("folio inicial respeta documentos emitidos antes de fecha_corte_1_0 (M1)", async () => {
    await s.dato("finanzas.dte_config.actualizar", {
      ambiente: "certificacion",
      rutEmisor: "76111222-8",
      fechaCorte1_0: "2026-06-01",
    });
    await s.e.admin.documentoEmitido.create({
      data: {
        tenantId: s.tenantId,
        cuentaId: s.cuentaId,
        tipoDte: 33,
        folio: 7205,
        fechaEmision: new Date("2026-05-15T00:00:00.000Z"),
        montoNeto: 10_000,
        montoExento: 0,
        montoIva: 1900,
        montoTotal: 11_900,
        estadoDte: "aceptado",
      },
    });
    const out = await s.dato<{ folioActual: number }>("finanzas.folios.cargar_caf", {
      cafXml: cafXmlSintetico({ folioDesde: 7200, folioHasta: 7210, idk: "CERT-7200-CORTE" }),
    });
    expect(out.folioActual).toBe(7206);
  });

  it("rechaza CAF si el folio 1.0 queda fuera del rango (C2)", async () => {
    await s.dato("finanzas.dte_config.actualizar", {
      ambiente: "certificacion",
      rutEmisor: "76111222-8",
      fechaCorte1_0: "2026-06-01",
    });
    await s.e.admin.documentoEmitido.create({
      data: {
        tenantId: s.tenantId,
        cuentaId: s.cuentaId,
        tipoDte: 33,
        folio: 9500,
        fechaEmision: new Date("2026-05-15T00:00:00.000Z"),
        montoNeto: 10_000,
        montoExento: 0,
        montoIva: 1900,
        montoTotal: 11_900,
        estadoDte: "aceptado",
      },
    });
    const mal = await s.mod.executeCapability(s.ctx(), "finanzas.folios.cargar_caf", {
      cafXml: cafXmlSintetico({ folioDesde: 8500, folioHasta: 8510, idk: "CERT-8500-FUERA" }),
    });
    expect(mal).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    if (mal.ok) throw new Error("esperaba error");
    expect(mal.error.message).toMatch(/fuera del rango del CAF/i);
  });

  it("folio_rango incoherente con folio_desde/hasta no evade el EXCLUDE (CHECK en base)", async () => {
    const fila = await s.e.admin.dteFolio.create({
      data: {
        tenantId: s.tenantId,
        tipoDte: 33,
        folioDesde: 8300,
        folioHasta: 8350,
        folioActual: 8300,
        activo: true,
      },
    });
    await expect(
      s.e.admin.$executeRawUnsafe(
        `UPDATE finanzas.dte_folios SET folio_rango = int4range(1, 3, '[]') WHERE id = $1::uuid`,
        fila.id,
      ),
    ).rejects.toThrow(/dte_folios_folio_rango_coherente|check constraint/i);
    await expect(
      s.e.admin.dteFolio.create({
        data: {
          tenantId: s.tenantId,
          tipoDte: 33,
          folioDesde: 8340,
          folioHasta: 8400,
          folioActual: 8340,
          activo: true,
        },
      }),
    ).rejects.toThrow(/dte_folios_rango_sin_solape|exclusion constraint/i);
    await s.e.admin.dteFolio.delete({ where: { id: fila.id } }).catch(() => undefined);
  });

  it("listar avisa folios que vencerán sin usar", async () => {
    await s.e.admin.dteFolio.updateMany({
      where: { tenantId: s.tenantId, activo: true },
      data: { activo: false },
    });
    await s.e.admin.dteFolio.create({
      data: {
        tenantId: s.tenantId,
        tipoDte: 33,
        folioDesde: 1,
        folioHasta: 10,
        folioActual: 8,
        cafVenceEn: new Date("2026-11-15T00:00:00.000Z"),
        activo: true,
      },
    });
    await s.dato("finanzas.dte_config.actualizar", {
      ambiente: "certificacion",
      rutEmisor: "76111222-8",
      avisoCafDias: 365,
    });
    const lista = await s.dato<{ avisoFoliosSinUsarPorVencer: string | null }>("finanzas.folios.listar", {});
    expect(lista.avisoFoliosSinUsarPorVencer).toMatch(/vencerán sin usar/);
  });
});
