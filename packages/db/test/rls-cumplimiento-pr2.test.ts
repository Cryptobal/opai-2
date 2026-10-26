// Brief 07d, PR 2 (bloque 4): RLS y append-only de verdad de consentimientos, solicitudes ARCO e
// incidentes contra Postgres real (opai_app sin BYPASSRLS). Las transiciones de la solicitud son
// mutables (su estado avanza); consentimientos e incidentes NO lo son (REVOKE UPDATE, DELETE).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("cumplimiento PR2: RLS y append-only en base real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  const sufijo = randomUUID().slice(0, 8);

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    a = (await nuevo(`cmp2-a-${sufijo}`)).id;
    b = (await nuevo(`cmp2-b-${sufijo}`)).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("RLS: cada tenant ve solo sus consentimientos y no inserta en otro (WITH CHECK)", async () => {
    const titular = randomUUID();
    await e.forTenant(a).consentimiento.create({
      data: { tenantId: a, titularTipo: "contacto", titularId: titular, proposito: "comercial", versionAviso: "1", estado: "otorgado" },
    });
    expect(await e.forTenant(a).consentimiento.count()).toBe(1);
    expect(await e.forTenant(b).consentimiento.count()).toBe(0);
    await expect(
      e.forTenant(b).consentimiento.create({
        data: { tenantId: a, titularTipo: "contacto", titularId: titular, proposito: "x", versionAviso: "1", estado: "otorgado" },
      }),
    ).rejects.toThrow();
  });

  it("consentimientos son append-only para opai_app: UPDATE y DELETE fallan", async () => {
    const fila = await e.admin.consentimiento.findFirstOrThrow({ where: { tenantId: a } });
    const app = e.forTenant(a);
    await expect(
      app.consentimiento.updateMany({ where: { id: fila.id }, data: { estado: "revocado" } }),
    ).rejects.toThrow();
    await expect(app.consentimiento.deleteMany({ where: { id: fila.id } })).rejects.toThrow();
    expect(await e.admin.consentimiento.count({ where: { tenantId: a } })).toBe(1);
  });

  it("incidentes son append-only para opai_app: UPDATE y DELETE fallan", async () => {
    const caso = randomUUID();
    await e.forTenant(a).incidente.create({
      data: { tenantId: a, casoId: caso, evento: "registro", estado: "abierto", descripcion: "prueba" },
    });
    const fila = await e.admin.incidente.findFirstOrThrow({ where: { tenantId: a } });
    const app = e.forTenant(a);
    await expect(
      app.incidente.updateMany({ where: { id: fila.id }, data: { estado: "cerrado" } }),
    ).rejects.toThrow();
    await expect(app.incidente.deleteMany({ where: { id: fila.id } })).rejects.toThrow();
    expect(await e.forTenant(b).incidente.count()).toBe(0);
  });

  it("las solicitudes ARCO sí avanzan (UPDATE permitido) y aíslan por tenant", async () => {
    const s = await e.forTenant(a).solicitudArco.create({
      data: { tenantId: a, tipo: "acceso", titularEmail: "titular@ejemplo.cl" },
    });
    // Mutable: el estado avanza (a diferencia de consentimientos/incidentes).
    await e.forTenant(a).solicitudArco.update({ where: { id: s.id }, data: { estado: "en_proceso" } });
    expect((await e.admin.solicitudArco.findUniqueOrThrow({ where: { id: s.id } })).estado).toBe(
      "en_proceso",
    );
    expect(await e.forTenant(b).solicitudArco.count()).toBe(0);
    // El documento de evidencia debe ser del mismo tenant (trigger mismo_tenant).
    await expect(
      e.forTenant(a).solicitudArco.update({
        where: { id: s.id },
        data: { documentoEvidenciaId: randomUUID() },
      }),
    ).rejects.toThrow();
  });
});
