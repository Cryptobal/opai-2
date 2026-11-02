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

  it("la respuesta y auditoría no incluyen el XML del CAF", async () => {
    const xml = cafXmlSintetico({ folioDesde: 6100, folioHasta: 6102, idk: "CERT-UNICO-6100" });
    const marca = "MARCA_SECRETA_XML_NO_DEBE_FILTRAR_6100";
    const out = await s.dato<{ lectura: string }>("finanzas.folios.cargar_caf", {
      cafXml: xml.replace("c2luZ3R1cmE=", marca),
    });
    expect(JSON.stringify(out)).not.toContain(marca);
    expect(out.lectura).not.toContain("<");
    const eventos = await s.e.admin.bitacora.findMany({
      where: { tenantId: s.tenantId, tipo: "finanzas.folios.caf_cargado" },
      orderBy: { seq: "desc" },
      take: 1,
    });
    expect(eventos[0]?.payloadCanon ?? "").not.toContain(marca);
  });

  it("tenant B no ve folios del tenant A; mismo rango en B permitido", async () => {
    const xml = cafXmlSintetico({ folioDesde: 5000, folioHasta: 5002 });
    await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.dte_config.actualizar", {
      ambiente: "certificacion",
      rutEmisor: "77234567-8",
    });
    const listaB0 = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.folios.listar", {});
    expect(listaB0.ok).toBe(true);
    if (!listaB0.ok) throw new Error("listar B");
    expect((listaB0.data as { items: unknown[] }).items).toHaveLength(0);

    const cargadoB = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.folios.cargar_caf", {
      cafXml: xml.replace("76111222-8", "77234567-8"),
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
    const qaId = (
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
    await s.e.admin.tenant.delete({ where: { id: qaId } }).catch(() => undefined);
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
