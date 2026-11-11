import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearContexto, executeCapability } from "../src";
import { prepararVinculosJornada } from "./vinculos-jornada-fixture";

// CAR-127 · Plantillas laborales con Postgres real: RLS por tenant, versiones inmutables y CHECK.
describe("plantillas laborales: tenant, versiones y restricciones", () => {
  let f: Awaited<ReturnType<typeof prepararVinculosJornada>>;
  const ctx = (tenantId: string, rol: "owner" | "gerente" = "owner") =>
    crearContexto({ tenantId, rol, actor: { tipo: "system" } });
  const nueva = {
    nombre: "Contrato indefinido",
    clase: "contrato_trabajo",
    nivelFirma: "N2",
    contenido: "{persona.nombre} ingresa el {vinculo.inicio}.",
  };
  let id = "";

  beforeAll(async () => {
    f = await prepararVinculosJornada();
    const r = await executeCapability(ctx(f.tenantId), "core.documento_plantillas.create", nueva);
    expect(r.ok).toBe(true);
    id = r.ok ? (r.data as { id: string }).id : "";
  });
  afterAll(async () => {
    await f?.e.cerrar();
  });

  it("otra empresa no ve ni lee la plantilla", async () => {
    const lista = await executeCapability(ctx(f.otro), "core.documento_plantillas.list", {});
    expect(lista).toMatchObject({ ok: true, data: [] });
    const una = await executeCapability(ctx(f.otro), "core.documento_plantillas.get", { id });
    expect(una).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el gerente queda fuera; el dueño lee el texto de la versión 1", async () => {
    const g = await executeCapability(
      ctx(f.tenantId, "gerente"),
      "core.documento_plantillas.list",
      {},
    );
    expect(g).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const una = await executeCapability(ctx(f.tenantId), "core.documento_plantillas.get", { id });
    expect(una).toMatchObject({
      ok: true,
      data: { versionVigente: 1, contenido: nueva.contenido },
    });
  });

  it("la misma empresa no repite nombre, pero otra sí puede usarlo", async () => {
    const dup = await executeCapability(ctx(f.tenantId), "core.documento_plantillas.create", nueva);
    expect(dup).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    const otra = await executeCapability(ctx(f.otro), "core.documento_plantillas.create", nueva);
    expect(otra.ok).toBe(true);
  });

  it("una versión creada no se puede modificar ni borrar", async () => {
    const db = f.e.forTenant(f.tenantId);
    const v = await db.documentoPlantillaVersion.findFirstOrThrow({ where: { plantillaId: id } });
    await expect(
      db.documentoPlantillaVersion.update({ where: { id: v.id }, data: { contenido: "otro" } }),
    ).rejects.toThrow();
    await expect(db.documentoPlantillaVersion.delete({ where: { id: v.id } })).rejects.toThrow();
  });

  it("la base rechaza un nivel de firma N3 o una clase comercial", async () => {
    const db = f.e.forTenant(f.tenantId);
    const base = {
      tenantId: f.tenantId,
      nombre: "Otra",
      clase: "contrato_trabajo",
      nivelFirma: "N2",
    };
    await expect(
      db.documentoPlantilla.create({ data: { ...base, nivelFirma: "N3" } }),
    ).rejects.toThrow();
    await expect(
      db.documentoPlantilla.create({ data: { ...base, clase: "propuesta_comercial" } }),
    ).rejects.toThrow();
  });

  it("editor: borrador, publicar la versión 2 y la base rechaza firmantes fuera de la lista", async () => {
    const c = ctx(f.tenantId);
    const texto = "{persona.nombre} ingresa el {vinculo.inicio} como {vinculo.cargo}.";
    const b = await executeCapability(c, "core.documento_plantillas.guardar_borrador", {
      id,
      contenido: texto,
    });
    expect(b).toMatchObject({ ok: true, data: { versionVigente: 1, conBorrador: true } });
    const pub = { id, contenido: texto, versionEsperada: 1 };
    const r = await executeCapability(c, "core.documento_plantillas.publicar", pub);
    expect(r).toMatchObject({ ok: true, data: { versionVigente: 2, borrador: null } });
    const otra = await executeCapability(c, "core.documento_plantillas.publicar", pub);
    expect(otra).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    const db = f.e.forTenant(f.tenantId);
    const versiones = await db.documentoPlantillaVersion.findMany({
      where: { plantillaId: id },
      orderBy: { numero: "asc" },
    });
    expect(versiones.map((v) => v.numero)).toEqual([1, 2]);
    expect(versiones[1]?.contenido).toBe(texto);
    await expect(
      db.documentoPlantilla.update({ where: { id }, data: { firmantes: "notario" } }),
    ).rejects.toThrow();
    const ajena = await executeCapability(
      ctx(f.otro),
      "core.documento_plantillas.guardar_borrador",
      {
        id,
        contenido: "x",
      },
    );
    expect(ajena).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
