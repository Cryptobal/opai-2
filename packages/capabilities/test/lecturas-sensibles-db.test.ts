import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Mod from "../src";
import { casosLecturas, type FixtureLecturas, sembrarLecturas } from "./lecturas-sensibles-fixture";

describe.skipIf(!urlPropietario)("inventario NÚCLEO-H: accesos sensibles en Postgres", () => {
  let e: Entorno, mod: typeof Mod, a: FixtureLecturas, b: FixtureLecturas;
  beforeAll(async () => {
    e = await prepararEntorno();
    // Versión alta: `rotar-kek` en secretos-db.test.ts recorre todos los tenants con KEK v1→v2.
    Object.assign(process.env, {
      OPAI_SECRETS_KEY: randomBytes(32).toString("base64"),
      OPAI_SECRETS_KEY_VERSION: "98",
    });
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    a = await sembrarLecturas(e, mod as Parameters<typeof sembrarLecturas>[1]);
    b = await sembrarLecturas(e, mod as Parameters<typeof sembrarLecturas>[1]);
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  const contexto = (f = a) => {
    const ctx = mod.crearContexto({
      tenantId: f.tenantId,
      actor: { tipo: "user", id: f.userId },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });
    ctx.servicios.almacenamiento.urlDescarga = async () =>
      "https://archivo.example.test/firmado?secreto";
    return ctx;
  };

  it("cada lectura del inventario confirma un evento mínimo, encadenado y sin datos personales", async () => {
    for (const [id, input, ids] of casosLecturas(a)) {
      const r = await mod.executeCapability(contexto(), id, input);
      expect(r.ok, `${id}: ${JSON.stringify(r)}`).toBe(true);
      const eventos = await e.admin.auditEvent.findMany({
        where: { tenantId: a.tenantId, capability: id },
      });
      expect(eventos, id).toHaveLength(1);
      expect(eventos[0]).toMatchObject({
        actorType: "user",
        actorId: a.userId,
        tenantId: a.tenantId,
      });
      const payload = eventos[0]?.payload;
      expect(payload, id).toEqual({ ids: expect.arrayContaining(ids) });
      expect(
        payload && typeof payload === "object" && "ids" in payload && payload.ids,
      ).toHaveLength(ids.length);
      expect(eventos[0]?.hash).toHaveLength(64);
      expect(JSON.stringify(payload)).not.toMatch(/NO COPIAR|example|secreto|12345678/);
      expect(JSON.stringify(r)).not.toContain(b.tenantId);
    }
  });

  it("la matriz de vencimientos no incluye personas ni documentos de otro tenant", async () => {
    const antes = await mod.executeCapability(contexto(), "core.documentos.matriz", {});
    const pendientesAntes = await mod.executeCapability(contexto(), "core.inicio.pendientes", {});
    const tipo = await e.admin.documentoTipo.create({
      data: {
        tenantId: b.tenantId,
        codigo: "vencido-ajeno",
        nombre: "Ficticio",
        capa: "persona",
        tieneVencimiento: true,
      },
    });
    const doc = await e.admin.documento.create({
      data: {
        tenantId: b.tenantId,
        tipoId: tipo.id,
        nombre: "ficticio.pdf",
        mime: "application/pdf",
        tamano: 1,
        storageKey: randomUUID(),
        creadoPorTipo: "user",
        estado: "disponible",
        venceEn: new Date("2020-01-01"),
      },
    });
    await e.admin.documentoVinculo.create({
      data: {
        tenantId: b.tenantId,
        documentoId: doc.id,
        entidadTipo: "persona",
        entidadId: b.personaId,
      },
    });
    const r = await mod.executeCapability(contexto(), "core.documentos.matriz", {});
    expect(r).toEqual(antes);
    expect(await mod.executeCapability(contexto(), "core.inicio.pendientes", {})).toEqual(
      pendientesAntes,
    );
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).not.toContain(b.personaId);
    expect(JSON.stringify(r)).not.toContain(b.documentoId);
    const sinAlcance = contexto();
    sinAlcance.alcance = { instalaciones: [] };
    const limitado = await mod.executeCapability(sinAlcance, "core.documentos.matriz", {});
    expect(limitado).toMatchObject({ ok: true, data: { filas: [], resumen: { personas: 0 } } });
  });

  it("falla cerrado y revierte el insert para cada capacidad, sin revelar datos", async () => {
    for (const [id, input] of casosLecturas(a)) {
      const ctx = contexto();
      const registrar = ctx.auditoria.registrar;
      const antes = await e.admin.auditEvent.count({ where: { tenantId: a.tenantId } });
      ctx.auditoria.registrar = async (tx, evento) => {
        await registrar(tx, evento);
        throw new Error("Fallo simulado tras insertar");
      };
      expect(await mod.executeCapability(ctx, id, input), id).toMatchObject({
        ok: false,
        error: { code: "INTERNAL" },
      });
      expect(await e.admin.auditEvent.count({ where: { tenantId: a.tenantId } })).toBe(antes);
    }
  });

  it("historial y auditoría registran solo los IDs de la página; sin duplicar read_sensible", async () => {
    for (const [id, campo] of [
      ["core.audit.list", "eventos"],
      ["core.actividad.list", "items"],
    ] as const) {
      const r = await mod.executeCapability(contexto(), id, { limite: 2 });
      expect(r.ok).toBe(true);
      const evento = await e.admin.auditEvent.findFirstOrThrow({
        where: { tenantId: a.tenantId, capability: id },
        orderBy: { seq: "desc" },
      });
      const data = r.ok ? (r.data as Record<string, { id: string }[]>) : {};
      expect(evento.payload).toEqual({ ids: data[campo]?.map((f) => f.id) });
    }
  });

  it("otro tenant o id inexistente no permite enumerar persona, contacto, documento ni consentimiento", async () => {
    for (const [id, campo, ajeno] of [
      ["core.personas.get", "id", b.personaId],
      ["core.contactos.get", "id", b.contactoId],
      ["core.documentos.get", "id", b.documentoId],
      ["core.documentos.url_descarga", "id", b.documentoId],
    ]) {
      const resultados = await Promise.all(
        [ajeno, randomUUID()].map((v) => mod.executeCapability(contexto(), id!, { [campo!]: v })),
      );
      expect(resultados[0]).toEqual(resultados[1]);
      expect(resultados[0]).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    }
    const r = await mod.executeCapability(contexto(), "core.cumplimiento.consentimientos_listar", {
      titular: { tipo: "contacto", id: b.contactoId },
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("sin permiso no revela; sin alcance no revela titulares, incidentes ni documentos", async () => {
    for (const [id, input] of casosLecturas(a).filter(
      ([id]) => !["core.buscar", "core.notificaciones.list", "core.inicio.pendientes"].includes(id),
    )) {
      const ctx = contexto();
      ctx.autorizar = () => false;
      expect(await mod.executeCapability(ctx, id, input), id).toMatchObject({ ok: false });
    }
    const ctx = contexto();
    ctx.alcance = { instalaciones: [] };
    for (const id of [
      "core.personas.get",
      "core.contactos.get",
      "core.documentos.get",
      "core.documentos.url_descarga",
    ])
      expect(
        await mod.executeCapability(ctx, id, {
          id: id.includes("personas")
            ? a.personaId
            : id.includes("contactos")
              ? a.contactoId
              : a.documentoId,
        }),
      ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      await mod.executeCapability(ctx, "core.cumplimiento.incidentes_listar", {}),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await mod.executeCapability(ctx, "core.personas.list", {})).toMatchObject({
      ok: true,
      data: { items: [] },
    });
  });

  it("documentos de cumplimiento tampoco se filtran por versiones, vencimientos o URL", async () => {
    const ctx = contexto();
    ctx.autorizar = (p) => p === "core:documentos.read";
    for (const id of ["core.documentos.list", "core.documentos.vencimientos"]) {
      const r = await mod.executeCapability(ctx, id, {});
      expect(r.ok).toBe(true);
      expect(JSON.stringify(r)).not.toContain(a.sensibleId);
    }
    for (const id of ["core.documentos.get", "core.documentos.url_descarga"])
      expect(await mod.executeCapability(ctx, id, { id: a.sensibleId })).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" },
      });
  });

  it("conserva el perfil legal del propio tenant para Inspector con alcance, sin nuevos permisos", async () => {
    const ctx = contexto();
    ctx.alcance = { instalaciones: [] };
    ctx.autorizar = (p) => p === "core:tenant.read";
    expect(await mod.executeCapability(ctx, "core.empresa.get", {})).toMatchObject({ ok: true });
    ctx.autorizar = () => false;
    expect(await mod.executeCapability(ctx, "core.empresa.get", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});
