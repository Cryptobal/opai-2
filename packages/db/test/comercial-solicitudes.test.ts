// Leads PR 1 — solicitudes y canales: aislamiento por tenant (RLS sin BYPASSRLS), FORCE RLS, checks de
// estado y canal, y triggers de mismo tenant en las referencias.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("Solicitudes de Comercial (Leads · PR 1)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let solicitudA = "";
  let canalA = "";
  let negocioB = "";

  const base = (tenantId: string) => ({
    tenantId,
    canal: "manual",
    textoOriginal: "Necesitamos guardias.",
    registradaPorTipo: "usuario",
  });

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    idA = (await nuevo(`sol-a-${sufijo}`)).id;
    idB = (await nuevo(`sol-b-${sufijo}`)).id;
    solicitudA = (await e.admin.solicitud.create({ data: base(idA) })).id;
    canalA = (await e.admin.canalSolicitud.create({ data: { tenantId: idA, canal: "correo" } })).id;
    const embudo = await e.admin.embudo.create({
      data: { tenantId: idB, nombre: "E", porDefecto: true },
    });
    const etapa = await e.admin.etapa.create({
      data: { tenantId: idB, embudoId: embudo.id, nombre: "Prospecto", orden: 0 },
    });
    const cuentaB = await e.admin.cuenta.create({ data: { tenantId: idB, nombre: "Cuenta B" } });
    negocioB = (
      await e.admin.negocio.create({
        data: {
          tenantId: idB,
          cuentaId: cuentaB.id,
          embudoId: embudo.id,
          etapaId: etapa.id,
          titulo: "Negocio B",
        },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada tenant ve solo sus solicitudes y canales", async () => {
    expect(await e.forTenant(idA).solicitud.count()).toBe(1);
    expect(await e.forTenant(idB).solicitud.count()).toBe(0);
    expect(await e.forTenant(idB).canalSolicitud.count()).toBe(0);
    expect(await e.forTenant(idA).canalSolicitud.count()).toBe(1);
  });

  it("sin tenant fijado no se ve nada, y no se escribe en otro tenant", async () => {
    expect(await e.appSinTenant.solicitud.count()).toBe(0);
    await expect(e.forTenant(idB).solicitud.create({ data: base(idA) })).rejects.toThrow();
    await expect(
      e.forTenant(idB).solicitud.updateMany({ where: { id: solicitudA }, data: { asunto: "x" } }),
    ).resolves.toMatchObject({ count: 0 });
    await expect(
      e.forTenant(idB).solicitud.deleteMany({ where: { id: solicitudA } }),
    ).resolves.toMatchObject({
      count: 0,
    });
  });

  it("canal único por tenant y checks de canal y estado", async () => {
    await expect(
      e.admin.canalSolicitud.create({ data: { tenantId: idA, canal: "correo" } }),
    ).rejects.toThrow();
    expect(canalA).toBeTruthy();
    await expect(
      e.admin.solicitud.create({ data: { ...base(idA), canal: "whatsapp" } }),
    ).rejects.toThrow();
    await expect(
      e.admin.solicitud.create({ data: { ...base(idA), estado: "perdida" } }),
    ).rejects.toThrow();
  });

  it("una descartada exige motivo y fecha; una solicitud no es duplicada de sí misma", async () => {
    await expect(
      e.admin.solicitud.create({ data: { ...base(idA), estado: "descartada" } }),
    ).rejects.toThrow();
    await expect(
      e.admin.solicitud.update({ where: { id: solicitudA }, data: { duplicadaDeId: solicitudA } }),
    ).rejects.toThrow();
  });

  it("las referencias deben ser del mismo tenant", async () => {
    await expect(
      e.admin.solicitud.create({ data: { ...base(idA), negocioId: negocioB } }),
    ).rejects.toThrow(/otra empresa|Foreign key/);
    const otraB = await e.admin.solicitud.create({ data: base(idB) });
    await expect(
      e.admin.solicitud.create({ data: { ...base(idA), duplicadaDeId: otraB.id } }),
    ).rejects.toThrow(/otra empresa|Foreign key/);
  });
});
