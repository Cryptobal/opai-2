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
    // documento_ref guarda a qué texto se aceptó: versión + hash SHA-256 del texto vigente.
    const fila = await e.admin.dpaAceptacion.findFirstOrThrow({ where: { tenantId } });
    expect(fila.documentoRef).toBe(`2026-10:sha256:${await sha256Hex(TEXTO_DPA)}`);
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
});
