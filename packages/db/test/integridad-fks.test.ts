// CAR-46 (A), migración 20261028234500: referencias que solo tenían el trigger mismo_tenant ahora
// tienen FK. Borrar la fila referida falla (RESTRICT), salvo los logos de la marca (SET NULL).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("FKs del núcleo (CAR-46)", () => {
  let e: Entorno;
  let t = "";
  let usuario = "";

  const documento = () =>
    e.forTenant(t).documento.create({
      data: {
        tenantId: t,
        nombre: "doc.pdf",
        mime: "application/pdf",
        tamano: 1,
        storageKey: `k-${randomUUID()}`,
        creadoPorTipo: "system",
      },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    const slug = `fks-${randomUUID().slice(0, 8)}`;
    t = (await e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } })).id;
    usuario = (await e.admin.user.create({ data: { name: "u", email: `${slug}@test.opai.cl` } }))
      .id;
    await e.admin.membership.create({
      data: { tenantId: t, userId: usuario, rol: "admin", portales: ["erp"] },
    });
  });

  afterAll(async () => {
    if (!e) return;
    const w = { where: { tenantId: t } };
    await e.admin.notificacion.deleteMany(w);
    await e.admin.envio.deleteMany(w);
    await e.admin.evento.deleteMany(w);
    await e.admin.perfilEmpresa.deleteMany(w);
    await e.admin.documento.updateMany({ ...w, data: { reemplazaAId: null } });
    await e.admin.documento.deleteMany(w);
    await e.admin.membership.deleteMany(w);
    await e.admin.user.deleteMany({ where: { id: usuario } });
    await e.cerrar();
  });

  it("un documento reemplazado no se puede borrar mientras su versión nueva lo apunte", async () => {
    const anterior = await documento();
    const nueva = await documento();
    await e.forTenant(t).documento.update({
      where: { id: nueva.id },
      data: { reemplazaAId: anterior.id },
    });
    await expect(e.forTenant(t).documento.delete({ where: { id: anterior.id } })).rejects.toThrow();
    // El que apunta sí se puede borrar (la purga de subidas pendientes borra estos).
    await expect(
      e.forTenant(t).documento.delete({ where: { id: nueva.id } }),
    ).resolves.toBeTruthy();
  });

  it("borrar el archivo de un logo deja la marca sin ese logo (SET NULL) con la app", async () => {
    const logo = await documento();
    const isotipo = await documento();
    await e.forTenant(t).perfilEmpresa.create({
      data: { tenantId: t, logoPrincipalId: logo.id, isotipoId: isotipo.id },
    });
    await e.forTenant(t).documento.delete({ where: { id: logo.id } });
    const perfil = await e.forTenant(t).perfilEmpresa.findUniqueOrThrow({ where: { tenantId: t } });
    expect(perfil.logoPrincipalId).toBeNull();
    expect(perfil.isotipoId).toBe(isotipo.id);
  });

  it("un evento con notificaciones o envíos no se puede borrar", async () => {
    const evento = await e.forTenant(t).evento.create({
      data: { tenantId: t, tipo: "core.prueba", payload: {}, actorTipo: "system" },
    });
    await e.forTenant(t).notificacion.create({
      data: { tenantId: t, usuarioId: usuario, titulo: "Aviso", eventoId: evento.id },
    });
    await expect(e.admin.evento.delete({ where: { id: evento.id } })).rejects.toThrow();
  });

  it("las FKs nuevas quedan validadas en el catálogo", async () => {
    const filas = await e.admin.$queryRaw<{ conname: string; convalidated: boolean }[]>`
      SELECT conname, convalidated FROM pg_constraint
      WHERE conname IN ('memberships_user_id_fkey', 'envios_evento_id_fkey',
        'notificaciones_evento_id_fkey', 'documentos_reemplaza_a_id_fkey',
        'perfil_empresa_logo_principal_id_fkey', 'perfil_empresa_logo_claro_id_fkey',
        'perfil_empresa_logo_oscuro_id_fkey', 'perfil_empresa_isotipo_id_fkey',
        'perfil_empresa_favicon_id_fkey', 'solicitudes_arco_documento_evidencia_id_fkey',
        'incidentes_evidencia_doc_id_fkey', 'retencion_ejecuciones_solicitud_id_fkey')`;
    expect(filas).toHaveLength(12);
    expect(filas.every((f) => f.convalidated)).toBe(true);
  });
});
