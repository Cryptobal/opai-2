// Brief 07d, PR 2: capacidades de consentimientos, solicitudes ARCO e incidentes contra Postgres
// real (opai_app sin BYPASSRLS). Verifica aislamiento por tenant (otro tenant recibe NOT_FOUND),
// soloPersonas (un agente es rechazado) y auditoría de las escrituras.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("cumplimiento PR2 (capacidades) en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  let userA = "";
  let userB = "";
  let personaA = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    tenantA = (await tenant(`arco-a-${s}`)).id;
    tenantB = (await tenant(`arco-b-${s}`)).id;
    const user = (n: string) =>
      e.admin.user.create({ data: { name: n, email: `${n}-${s}@prueba.cl`, emailVerified: true } });
    userA = (await user("ana")).id;
    userB = (await user("beto")).id;
    await e.admin.membership.create({ data: { tenantId: tenantA, userId: userA, rol: "owner", portales: ["erp"] } });
    await e.admin.membership.create({ data: { tenantId: tenantB, userId: userB, rol: "owner", portales: ["erp"] } });
    personaA = (
      await e.admin.persona.create({
        data: { tenantId: tenantA, nombres: "María", apellidos: "Soto", rut: "16234567-8" },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string, userId: string, nombre: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre, email: `${nombre}@prueba.cl`, platformRole: null },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  const agenteCtx = () =>
    mod.crearContexto({
      tenantId: tenantA,
      actor: { tipo: "agent", id: userA, viaUserId: userA },
      usuario: { id: userA, nombre: "ana", email: "ana@prueba.cl", platformRole: null },
      rol: "owner",
      scopes: ["*"],
      medidor: { registrar: async () => undefined },
    });

  it("registra un consentimiento y deja auditoría", async () => {
    const r = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.consentimiento_registrar", {
      titular: { tipo: "persona", id: personaA },
      proposito: "comunicaciones_comerciales",
      versionAviso: "2026-10",
    });
    expect(r.ok).toBe(true);
    const audit = await e.admin.auditEvent.findMany({
      where: { tenantId: tenantA, capability: "core.cumplimiento.consentimiento_registrar" },
    });
    expect(audit.length).toBe(1);
  });

  it("una solicitud de un tenant no se ve ni se obtiene desde otro (RLS/alcance)", async () => {
    const creada = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.solicitud_crear", {
      tipo: "acceso",
      titular: { tipo: "persona", id: personaA },
    });
    expect(creada.ok).toBe(true);
    const id = creada.ok ? (creada.data as { id: string }).id : "";
    // Tenant B no la ve: la capacidad devuelve NOT_FOUND, nunca la fila de otro tenant.
    const ajena = await mod.executeCapability(ctx(tenantB, userB, "beto"), "core.cumplimiento.solicitud_obtener", {
      id,
    });
    expect(ajena.ok).toBe(false);
    expect(!ajena.ok && ajena.error.code).toBe("NOT_FOUND");
    // Y su bandeja no la incluye.
    const bandejaB = await mod.executeCapability(ctx(tenantB, userB, "beto"), "core.cumplimiento.solicitudes_listar", {});
    expect(bandejaB.ok && (bandejaB.data as { items: unknown[] }).items.length).toBe(0);
  });

  it("un agente no crea solicitudes ni registra incidentes (soloPersonas)", async () => {
    const s = await mod.executeCapability(agenteCtx(), "core.cumplimiento.solicitud_crear", {
      tipo: "acceso",
      titular: { tipo: "persona", id: personaA },
    });
    expect(!s.ok && s.error.code).toBe("FORBIDDEN");
    const i = await mod.executeCapability(agenteCtx(), "core.cumplimiento.incidente_registrar", {
      descripcion: "Intento de acceso no autorizado.",
    });
    expect(!i.ok && i.error.code).toBe("FORBIDDEN");
  });

  it("registra un incidente, lo avanza y queda append-only (una fila por hecho)", async () => {
    const reg = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.incidente_registrar", {
      descripcion: "Acceso indebido a documentos.",
      datosAfectados: "identificación, contacto",
    });
    expect(reg.ok).toBe(true);
    const casoId = reg.ok ? (reg.data as { casoId: string }).casoId : "";
    const av = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.incidente_avanzar", {
      casoId,
      estado: "en_evaluacion",
    });
    expect(av.ok).toBe(true);
    const hechos = await e.admin.incidente.count({ where: { tenantId: tenantA, casoId } });
    expect(hechos).toBe(2);
  });
});
