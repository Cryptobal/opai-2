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
  });

  it("escritura cruzada: ni INSERT ni UPDATE de solicitudes de otro tenant; INSERT de incidente ajeno", async () => {
    // INSERT: el tenant B no puede crear una solicitud marcada del tenant A (WITH CHECK).
    await expect(
      e.forTenant(b).solicitudArco.create({
        data: { tenantId: a, tipo: "acceso", titularEmail: "cruzado@ejemplo.cl" },
      }),
    ).rejects.toThrow();
    // UPDATE: una solicitud real del tenant A no la toca el tenant B (USING: no la ve → 0 filas).
    const s = await e.forTenant(a).solicitudArco.create({
      data: { tenantId: a, tipo: "rectificacion", titularEmail: "propio@ejemplo.cl" },
    });
    const upd = await e
      .forTenant(b)
      .solicitudArco.updateMany({ where: { id: s.id }, data: { estado: "en_proceso" } });
    expect(upd.count).toBe(0);
    expect((await e.admin.solicitudArco.findUniqueOrThrow({ where: { id: s.id } })).estado).toBe(
      "recibida",
    );
    // INSERT: el tenant B no puede crear un incidente marcado del tenant A (WITH CHECK).
    await expect(
      e.forTenant(b).incidente.create({
        data: { tenantId: a, casoId: randomUUID(), evento: "registro", estado: "abierto" },
      }),
    ).rejects.toThrow();
  });

  it("escritura cruzada: no se cambia el tenant_id de una solicitud propia a otro tenant (WITH CHECK)", async () => {
    // Solicitud propia del tenant A.
    const s = await e.forTenant(a).solicitudArco.create({
      data: { tenantId: a, tipo: "acceso", titularEmail: "mudanza@ejemplo.cl" },
    });
    // A intenta "mudar" su solicitud al tenant B: la ve (USING por tenant A) pero el WITH CHECK
    // rechaza la fila nueva (tenant_id = B ≠ app.tenant_id); no se puede regalar una fila a otro tenant.
    await expect(
      e.forTenant(a).solicitudArco.update({ where: { id: s.id }, data: { tenantId: b } }),
    ).rejects.toThrow();
    // Sigue siendo del tenant A, intacta.
    expect((await e.admin.solicitudArco.findUniqueOrThrow({ where: { id: s.id } })).tenantId).toBe(a);
    expect(await e.forTenant(b).solicitudArco.count({ where: { id: s.id } })).toBe(0);
  });

  it("mismo_tenant: un incidente no referencia un documento REAL de otro tenant en evidencia_doc_id", async () => {
    // Documento real del tenant B (existe, pero es ajeno a A).
    const docAjeno = await e.admin.documento.create({
      data: {
        tenantId: b,
        nombre: "evidencia-ajena.json",
        mime: "application/json",
        tamano: 1,
        storageKey: `k-${randomUUID()}`,
        creadoPorTipo: "system",
        estado: "disponible",
      },
    });
    const caso = randomUUID();
    await e.forTenant(a).incidente.create({
      data: { tenantId: a, casoId: caso, evento: "registro", estado: "abierto", descripcion: "brecha" },
    });
    // El trigger mismo_tenant (BEFORE INSERT sobre incidentes) rechaza: para A ese documento no
    // existe (RLS lo oculta), aunque el UUID sea real en B. Vale para el aviso con evidencia.
    await expect(
      e.forTenant(a).incidente.create({
        data: {
          tenantId: a,
          casoId: caso,
          evento: "aviso",
          estado: "abierto",
          destinatario: "agencia",
          evidenciaDocId: docAjeno.id,
        },
      }),
    ).rejects.toThrow();
    // El documento ajeno sigue invisible y sin usar desde A; el caso solo tiene su registro.
    expect(await e.forTenant(a).documento.count({ where: { id: docAjeno.id } })).toBe(0);
    expect(await e.admin.incidente.count({ where: { tenantId: a, casoId: caso } })).toBe(1);
  });

  it("mismo_tenant: una solicitud no referencia un documento REAL de otro tenant", async () => {
    // Documento real del tenant B (existe, pero es ajeno a A).
    const docAjeno = await e.admin.documento.create({
      data: {
        tenantId: b,
        nombre: "ajeno.json",
        mime: "application/json",
        tamano: 1,
        storageKey: `k-${randomUUID()}`,
        creadoPorTipo: "system",
        estado: "disponible",
      },
    });
    const s = await e.forTenant(a).solicitudArco.create({
      data: { tenantId: a, tipo: "acceso", titularEmail: "evidencia@ejemplo.cl" },
    });
    // El trigger mismo_tenant rechaza: para A, ese documento no existe (RLS lo oculta), aunque el
    // UUID sea real en B. Antes esto se probaba con un UUID inexistente; ahora con un documento real.
    await expect(
      e.forTenant(a).solicitudArco.update({
        where: { id: s.id },
        data: { documentoEvidenciaId: docAjeno.id },
      }),
    ).rejects.toThrow();
    // El documento ajeno sigue siendo invisible y sin usar desde A.
    expect(await e.forTenant(a).documento.count({ where: { id: docAjeno.id } })).toBe(0);
    expect(
      (await e.admin.solicitudArco.findUniqueOrThrow({ where: { id: s.id } })).documentoEvidenciaId,
    ).toBeNull();
  });
});
