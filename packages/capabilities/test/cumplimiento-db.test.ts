// Brief 07d, PR 1: DPA append-only de verdad y RLS contra Postgres real (opai_app sin BYPASSRLS).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sha256Hex } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("cumplimiento (DPA/DPO) en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let otroId = "";
  let userId = "";
  const TEXTO_DPA = "Acuerdo de tratamiento de datos (DPA) OPAI ↔ tenant, versión 2026-10.";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    tenantId = (await tenant(`cmp-a-${s}`)).id;
    otroId = (await tenant(`cmp-b-${s}`)).id;
    userId = (
      await e.admin.user.create({
        data: { name: "Olivia", email: `olivia-${s}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({ data: { tenantId, userId, rol: "owner", portales: ["erp"] } });
    // Ajustes de plataforma (globales, sin tenant): versión y texto vigentes del DPA los publica OPAI.
    await e.admin.ajustePlataforma.upsert({
      where: { modulo_clave: { modulo: "core", clave: "cumplimiento_dpa_version" } },
      create: { modulo: "core", clave: "cumplimiento_dpa_version", valor: "2026-10" },
      update: { valor: "2026-10" },
    });
    await e.admin.ajustePlataforma.upsert({
      where: { modulo_clave: { modulo: "core", clave: "cumplimiento_dpa_texto" } },
      create: { modulo: "core", clave: "cumplimiento_dpa_texto", valor: TEXTO_DPA },
      update: { valor: TEXTO_DPA },
    });
  });

  afterAll(async () => {
    await e?.admin.ajustePlataforma
      .deleteMany({
        where: { modulo: "core", clave: { in: ["cumplimiento_dpa_version", "cumplimiento_dpa_texto"] } },
      })
      .catch(() => undefined);
    await e?.cerrar();
  });

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Olivia", email: "olivia@prueba.cl", platformRole: null },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  it("acepta el DPA vigente, deja auditoría y lo expone en el estado", async () => {
    const r = await mod.executeCapability(ctx(), "core.cumplimiento.dpa_aceptar", {});
    expect(r.ok).toBe(true);
    const estado = await mod.executeCapability(ctx(), "core.cumplimiento.estado", {});
    expect(estado.ok && estado.data).toMatchObject({ aceptadaVigente: true, pendiente: false });
    const audit = await e.admin.auditEvent.findMany({
      where: { tenantId, capability: "core.cumplimiento.dpa_aceptar" },
    });
    expect(audit.length).toBe(1);
    // documento_texto guarda el texto exacto aceptado (recuperable, en una fila append-only); y
    // documento_ref referencia esa misma versión + hash SHA-256. Ambos se leen y escriben en la
    // misma transacción, así que el hash de la referencia calza con el texto guardado (sin TOCTOU).
    const fila = await e.admin.dpaAceptacion.findFirstOrThrow({ where: { tenantId } });
    expect(fila.documentoTexto).toBe(TEXTO_DPA);
    expect(fila.documentoRef).toBe(`2026-10:sha256:${await sha256Hex(TEXTO_DPA)}`);
    expect(fila.documentoRef).toBe(`2026-10:sha256:${await sha256Hex(fila.documentoTexto ?? "")}`);
    // El lector (C06): el owner lee el texto y su hash, y el hash calza con el documento_ref guardado.
    const hash = await sha256Hex(TEXTO_DPA);
    const lectura = await mod.executeCapability(ctx(), "core.cumplimiento.dpa_texto", {});
    expect(lectura.ok && lectura.data).toMatchObject({ versionVigente: "2026-10", texto: TEXTO_DPA, sha256: hash });
    expect(fila.documentoRef).toBe(`2026-10:sha256:${hash}`);
  });

  it("no acepta el DPA si OPAI aún no publica el texto de la versión vigente", async () => {
    // Deja la versión vigente pero sin texto; la aceptación debe rechazarse (UNPROCESSABLE).
    await e.admin.ajustePlataforma.update({
      where: { modulo_clave: { modulo: "core", clave: "cumplimiento_dpa_texto" } },
      data: { valor: "" },
    });
    try {
      const r = await mod.executeCapability(ctx(), "core.cumplimiento.dpa_aceptar", {});
      expect(r.ok).toBe(false);
      expect(r.ok === false && r.error.code).toBe("UNPROCESSABLE");
      // No se agregó ninguna fila mientras el texto estuvo vacío (sigue solo la del primer test).
      expect(await e.admin.dpaAceptacion.count({ where: { tenantId } })).toBe(1);
    } finally {
      await e.admin.ajustePlataforma.update({
        where: { modulo_clave: { modulo: "core", clave: "cumplimiento_dpa_texto" } },
        data: { valor: TEXTO_DPA },
      });
    }
  });

  it("RLS: un tenant no puede insertar una aceptación de otro (WITH CHECK)", async () => {
    await expect(
      e
        .forTenant(tenantId)
        .dpaAceptacion.create({ data: { tenantId: otroId, version: "2026-10" } }),
    ).rejects.toThrow();
    // Y no quedó rastro en el otro tenant.
    expect(await e.forTenant(otroId).dpaAceptacion.count()).toBe(0);
  });

  it("DPA y audit_events son append-only para opai_app: UPDATE y DELETE fallan", async () => {
    const fila = await e.admin.dpaAceptacion.findFirstOrThrow({ where: { tenantId } });
    const app = e.forTenant(tenantId);
    await expect(
      app.dpaAceptacion.updateMany({ where: { id: fila.id }, data: { version: "x" } }),
    ).rejects.toThrow();
    await expect(app.dpaAceptacion.deleteMany({ where: { id: fila.id } })).rejects.toThrow();
    await expect(
      app.auditEvent.updateMany({ where: { tenantId }, data: { capability: "x" } }),
    ).rejects.toThrow();
    await expect(app.auditEvent.deleteMany({ where: { tenantId } })).rejects.toThrow();
    // Siguen ahí: la inmutabilidad no dependía solo de la aplicación.
    expect(await e.admin.dpaAceptacion.count({ where: { tenantId } })).toBe(1);
  });

  it("RLS: otro tenant no ve las aceptaciones del primero", async () => {
    expect(await e.forTenant(tenantId).dpaAceptacion.count()).toBe(1);
    expect(await e.forTenant(otroId).dpaAceptacion.count()).toBe(0);
  });

  it("fija el DPO y queda en el perfil del tenant", async () => {
    const r = await mod.executeCapability(ctx(), "core.cumplimiento.dpo_set", {
      nombre: "Paula Díaz",
      correo: "dpo@empresa.cl",
    });
    expect(r.ok).toBe(true);
    const perfil = await e.admin.perfilEmpresa.findUniqueOrThrow({ where: { tenantId } });
    expect(perfil.dpoNombre).toBe("Paula Díaz");
    expect(perfil.dpoCorreo).toBe("dpo@empresa.cl");
  });

  it("RLS: el DPO de un tenant no se ve desde otro", async () => {
    // El primero tiene DPO (test anterior); el otro no ve esa fila de perfil_empresa.
    expect(
      (await e.forTenant(tenantId).perfilEmpresa.findUniqueOrThrow({ where: { tenantId } }))
        .dpoNombre,
    ).toBe("Paula Díaz");
    expect(await e.forTenant(otroId).perfilEmpresa.findUnique({ where: { tenantId } })).toBeNull();
    expect(await e.forTenant(otroId).perfilEmpresa.count()).toBe(0);
  });

  it("RLS: un tenant no puede escribir ni modificar el DPO de otro (WITH CHECK y USING)", async () => {
    const app = e.forTenant(tenantId); // sesión fija app.tenant_id = tenantId
    // No puede CREAR el perfil de otro tenant: la política WITH CHECK rechaza el tenant_id ajeno.
    // El otro tenant aún no tiene perfil (perfil_empresa es único por tenant), así que el único
    // motivo posible del fallo es la RLS y no la restricción de unicidad.
    expect(await e.admin.perfilEmpresa.count({ where: { tenantId: otroId } })).toBe(0);
    await expect(
      app.perfilEmpresa.create({ data: { tenantId: otroId, dpoNombre: "intruso" } }),
    ).rejects.toThrow();
    // Ya probada la RLS en el create, el otro tenant crea su propio perfil (rol propietario, sin RLS).
    await e.admin.perfilEmpresa.upsert({
      where: { tenantId: otroId },
      create: { tenantId: otroId, dpoNombre: "DPO del otro", dpoCorreo: "dpo-otro@empresa.cl" },
      update: { dpoNombre: "DPO del otro", dpoCorreo: "dpo-otro@empresa.cl" },
    });
    // No puede MODIFICAR el DPO ajeno: la fila del otro no es visible (USING), el update no alcanza.
    expect(
      (await app.perfilEmpresa.updateMany({ where: { tenantId: otroId }, data: { dpoNombre: "intruso" } }))
        .count,
    ).toBe(0);
    // El DPO del otro tenant quedó intacto.
    expect(
      (await e.admin.perfilEmpresa.findUniqueOrThrow({ where: { tenantId: otroId } })).dpoNombre,
    ).toBe("DPO del otro");
  });
});
