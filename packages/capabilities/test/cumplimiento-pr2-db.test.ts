// Brief 07d, PR 2: capacidades de consentimientos, solicitudes ARCO e incidentes contra Postgres
// real (opai_app sin BYPASSRLS). Verifica aislamiento por tenant (otro tenant recibe NOT_FOUND),
// soloPersonas (un agente es rechazado) y auditoría de las escrituras.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import { uuid7 } from "../src/core/documentos/uuid7";
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

  it("el responsable de una solicitud debe ser miembro del tenant (otro tenant se rechaza)", async () => {
    const creada = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.solicitud_crear", {
      tipo: "rectificacion",
      titular: { tipo: "persona", id: personaA },
    });
    const id = creada.ok ? (creada.data as { id: string }).id : "";
    // userB es miembro de tenantB, no de tenantA: no puede ser responsable (alcance por `forTenant`).
    const ajeno = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.solicitud_avanzar", {
      id,
      responsableId: userB,
    });
    expect(!ajeno.ok && ajeno.error.code).toBe("UNPROCESSABLE");
    // La solicitud sigue "recibida" (no se asignó ni avanzó).
    expect((await e.admin.solicitudArco.findUniqueOrThrow({ where: { id } })).estado).toBe("recibida");
    // userA sí es miembro de tenantA: el avance procede.
    const propio = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.solicitud_avanzar", {
      id,
      responsableId: userA,
    });
    expect(propio.ok).toBe(true);
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

  it("un aviso de brecha no acepta como evidencia un documento de otro tenant (no encontrado)", async () => {
    const reg = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.incidente_registrar", {
      descripcion: "Brecha con evidencia a verificar.",
    });
    const casoId = reg.ok ? (reg.data as { casoId: string }).casoId : "";
    // Documento REAL del tenant B.
    const docB = await e.admin.documento.create({
      data: {
        tenantId: tenantB,
        nombre: "evidencia-b.json",
        mime: "application/json",
        tamano: 1,
        storageKey: `k-${randomUUID()}`,
        creadoPorTipo: "system",
        estado: "disponible",
      },
    });
    // La capacidad valida que la evidencia sea del tenant actual: para A ese documento no existe
    // (RLS lo oculta), así que responde «no encontrado» sin revelar que existe en B (sin enumeración).
    const r = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.incidente_notificar", {
      casoId,
      destinatario: "agencia",
      evidenciaDocId: docB.id,
    });
    expect(!r.ok && r.error.code).toBe("NOT_FOUND");
    // No se anotó ningún aviso: el caso sigue con un solo hecho (el registro).
    expect(await e.admin.incidente.count({ where: { tenantId: tenantA, casoId } })).toBe(1);
  });

  it("dos avisos de brecha concurrentes dejan el caso «notificado» (advisory lock + orden por id)", async () => {
    const reg = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.incidente_registrar", {
      descripcion: "Brecha con dos avisos simultáneos.",
    });
    const casoId = reg.ok ? (reg.data as { casoId: string }).casoId : "";
    // Agencia y titulares a la vez: el advisory lock por caso los serializa; el caso queda
    // «notificado» cuando constan ambos, sin importar el orden del created_at (se ordena por id).
    const [r1, r2] = await Promise.all([
      mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.incidente_notificar", {
        casoId,
        destinatario: "agencia",
      }),
      mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.incidente_notificar", {
        casoId,
        destinatario: "titulares",
      }),
    ]);
    expect(r1.ok && r2.ok).toBe(true);
    // Exactamente uno (el segundo en entrar al lock) ve la brecha completa.
    const completas = [r1, r2].filter((r) => r.ok && (r.data as { notificada: boolean }).notificada);
    expect(completas.length).toBe(1);
    // La lista refleja el estado vigente: notificada y en estado «notificado».
    const lista = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.incidentes_listar", {});
    const items = lista.ok ? (lista.data as { items: { casoId: string; estado: string; notificada: boolean }[] }).items : [];
    const caso = items.find((i) => i.casoId === casoId);
    expect(caso?.notificada).toBe(true);
    expect(caso?.estado).toBe("notificado");
  });

  it("el estado vigente se ordena por id (uuid7), no por created_at (dos avisos fuera de orden)", async () => {
    // Caso sembrado a mano con el created_at FUERA de orden respecto del id (uuid7 = orden real de
    // creación tras el lock). Antes, ordenar por created_at dejaba el caso sin figurar «notificado»:
    // el último hecho por created_at era el aviso a la Agencia (estado no notificado) aunque el aviso
    // que completó la brecha (titulares, estado notificado) se creó después (id mayor).
    const t0 = Date.parse("2026-10-20T00:00:00.000Z");
    const casoId = uuid7(t0);
    await e.admin.incidente.createMany({
      data: [
        { id: casoId, tenantId: tenantA, casoId, evento: "registro", estado: "abierto", descripcion: "orden", createdAt: new Date(t0) },
        // Aviso a la Agencia: id menor (creado antes) pero created_at el MÁS TARDÍO.
        { id: uuid7(t0 + 2000), tenantId: tenantA, casoId, evento: "aviso", estado: "abierto", destinatario: "agencia", createdAt: new Date(t0 + 3000) },
        // Aviso a titulares: id mayor (creado después, completa la brecha) pero created_at anterior.
        { id: uuid7(t0 + 4000), tenantId: tenantA, casoId, evento: "aviso", estado: "notificado", destinatario: "titulares", createdAt: new Date(t0 + 1000) },
      ],
    });
    const lista = await mod.executeCapability(ctx(tenantA, userA, "ana"), "core.cumplimiento.incidentes_listar", {});
    const items = lista.ok ? (lista.data as { items: { casoId: string; estado: string; notificada: boolean }[] }).items : [];
    const caso = items.find((i) => i.casoId === casoId);
    // Orden por id: el último hecho es el aviso a titulares (notificado) → el caso figura notificado.
    expect(caso?.estado).toBe("notificado");
    expect(caso?.notificada).toBe(true);
  });
});
