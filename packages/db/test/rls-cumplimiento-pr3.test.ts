// Brief 07d, PR 3 (bloque 10): RLS y append-only de verdad del registro de retención contra Postgres
// real (opai_app sin BYPASSRLS). Un tenant no ve ni escribe el registro de otro; el registro no se
// edita ni se borra desde la aplicación; la solicitud de origen debe ser del mismo tenant.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("cumplimiento PR3: retención en base real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  const sufijo = randomUUID().slice(0, 8);
  const fila = (tenantId: string) => ({
    tenantId,
    tabla: "envios",
    accion: "anonimizar",
    modo: "simulacion",
    filas: 3,
  });

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    a = (await nuevo(`ret-a-${sufijo}`)).id;
    b = (await nuevo(`ret-b-${sufijo}`)).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("RLS: cada tenant ve solo su registro y no inserta en otro (WITH CHECK)", async () => {
    await e.forTenant(a).retencionEjecucion.create({ data: fila(a) });
    expect(await e.forTenant(a).retencionEjecucion.count()).toBe(1);
    expect(await e.forTenant(b).retencionEjecucion.count()).toBe(0);
    await expect(e.forTenant(b).retencionEjecucion.create({ data: fila(a) })).rejects.toThrow();
  });

  it("es append-only para opai_app: UPDATE y DELETE fallan", async () => {
    const f = await e.admin.retencionEjecucion.findFirstOrThrow({ where: { tenantId: a } });
    const app = e.forTenant(a);
    await expect(
      app.retencionEjecucion.updateMany({ where: { id: f.id }, data: { filas: 0 } }),
    ).rejects.toThrow();
    await expect(app.retencionEjecucion.deleteMany({ where: { id: f.id } })).rejects.toThrow();
    expect(await e.admin.retencionEjecucion.count({ where: { tenantId: a } })).toBe(1);
  });

  it("rechaza modo, origen y filas inválidos (CHECK)", async () => {
    const app = e.forTenant(a);
    await expect(app.retencionEjecucion.create({ data: { ...fila(a), modo: "otro" } })).rejects.toThrow();
    await expect(app.retencionEjecucion.create({ data: { ...fila(a), origen: "x" } })).rejects.toThrow();
    await expect(app.retencionEjecucion.create({ data: { ...fila(a), filas: -1 } })).rejects.toThrow();
  });

  it("la solicitud de origen debe ser del mismo tenant (trigger mismo_tenant)", async () => {
    const ajena = await e.forTenant(b).solicitudArco.create({
      data: { tenantId: b, tipo: "cancelacion", titularEmail: "x@ejemplo.cl" },
    });
    await expect(
      e.forTenant(a).retencionEjecucion.create({ data: { ...fila(a), solicitudId: ajena.id } }),
    ).rejects.toThrow();
    const propia = await e.forTenant(a).solicitudArco.create({
      data: { tenantId: a, tipo: "cancelacion", titularEmail: "y@ejemplo.cl" },
    });
    await expect(
      e.forTenant(a).retencionEjecucion.create({ data: { ...fila(a), solicitudId: propia.id } }),
    ).resolves.toBeTruthy();
  });
});
