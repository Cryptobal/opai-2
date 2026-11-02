import { autorizador, executeCapability, registrarCapacidades } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { ACTIVOS, CON_COSTOS, CONTACTO_1, GESTOR, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

const USUARIO_ADMIN = {
  id: "0192f3a0-0000-7000-8000-0000000000b2",
  nombre: "Beto Admin",
  email: "admin@prueba.cl",
  platformRole: null,
};

beforeAll(() => {
  registrarCapacidades(capacidades);
});

function ctxOwner() {
  return contextoDePrueba({
    semilla: semilla(),
    modulosActivos: ACTIVOS,
    rol: "owner",
  });
}

function ctxAdmin() {
  return contextoDePrueba({
    semilla: semilla(),
    modulosActivos: ACTIVOS,
    rol: "admin",
    usuario: USUARIO_ADMIN,
  });
}

function comoAdmin(ctx: Contexto): Contexto {
  return {
    ...ctx,
    rol: "admin",
    usuario: USUARIO_ADMIN,
    actor: { tipo: "user", id: USUARIO_ADMIN.id },
    autorizar: autorizador(
      { rol: "admin", permisosRol: null, excepciones: null },
      USUARIO_ADMIN,
      null,
    ),
  };
}

function comoOwner(ctx: Contexto): Contexto {
  return {
    ...ctx,
    rol: "owner",
    usuario: USUARIO_DE_PRUEBA,
    actor: { tipo: "user", id: USUARIO_DE_PRUEBA.id },
    autorizar: autorizador({ rol: "owner", permisosRol: null, excepciones: null }, USUARIO_DE_PRUEBA, null),
  };
}

function comoGerente(ctx: Contexto): Contexto {
  return {
    ...ctx,
    rol: "gerente",
    autorizar: autorizador(
      { rol: "gerente", permisosRol: null, excepciones: null },
      ctx.usuario!,
      null,
    ),
  };
}

async function cotizacionConPuesto(ctx: ReturnType<typeof ctxOwner>["ctx"]) {
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
    negocioId: NEGOCIO_1,
    titulo: "Aprobación",
  });
  if (!c.ok) throw new Error("fixture");
  const id = (c.data as { id: string }).id;
  mockMotorLegal();
  const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
  if (!f.ok) throw new Error("ficha");
  const sec = (f.data as { secciones: { id: string }[] }).secciones[0]!;
  await executeCapability(ctx, "cpq.lineas.crear", {
    seccionId: sec.id,
    tipo: "puesto",
    nombre: "Turno",
    sueldoBaseClp: 400_000,
  });
  await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
  return id;
}

describe("cpq aprobación y envío (CAR-141)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("enviar bloquea margen bajo mínimo sin aprobación", async () => {
    const { ctx } = ctxOwner();
    const id = await cotizacionConPuesto(ctx);
    const env = await executeCapability(ctx, "cpq.cotizaciones.enviar", {
      id,
      contactoId: CONTACTO_1,
    });
    expect(env).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("solicitar aprobación y aprobar deja lista y permite enviar dry_run", async () => {
    const { ctx, eventos } = ctxOwner();
    const id = await cotizacionConPuesto(ctx);
    const pedido = await executeCapability(ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    expect(pedido.ok).toBe(true);
    const n = eventos.length;
    const apr = await executeCapability(ctx, "cpq.cotizaciones.aprobar", { id });
    expect(apr.ok).toBe(true);
    if (apr.ok) expect(apr.data).toMatchObject({ autoaprobacion: true });
    expect(eventos.slice(n)[0]?.payload).toMatchObject({ autoaprobacion: true });
    const env = await executeCapability(
      ctx,
      "cpq.cotizaciones.enviar",
      { id, contactoId: CONTACTO_1 },
      { dryRun: true },
    );
    expect(env.ok).toBe(true);
  });

  it("admin aprueba la cotización pedida por el owner", async () => {
    const owner = ctxOwner();
    const id = await cotizacionConPuesto(owner.ctx);
    await executeCapability(owner.ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    const apr = await executeCapability(comoAdmin(owner.ctx), "cpq.cotizaciones.aprobar", { id });
    expect(apr.ok).toBe(true);
    if (apr.ok) expect(apr.data).toMatchObject({ autoaprobacion: false });
  });

  it("admin creó la cotización, otro pidió aprobación y el admin decide: FORBIDDEN", async () => {
    const { ctx } = ctxAdmin();
    const id = await cotizacionConPuesto(ctx);
    await executeCapability(comoOwner(ctx), "cpq.cotizaciones.solicitar_aprobacion", { id });
    const apr = await executeCapability(ctx, "cpq.cotizaciones.aprobar", { id });
    expect(apr).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(apr.ok ? "" : apr.error.message).toMatch(/admin no puede aprobar su propia/i);
  });

  it("owner creó, otro pidió aprobación y el owner aprueba con autoaprobacion true", async () => {
    const owner = ctxOwner();
    const id = await cotizacionConPuesto(owner.ctx);
    await executeCapability(comoAdmin(owner.ctx), "cpq.cotizaciones.solicitar_aprobacion", { id });
    const apr = await executeCapability(owner.ctx, "cpq.cotizaciones.aprobar", { id });
    expect(apr.ok).toBe(true);
    if (apr.ok) expect(apr.data).toMatchObject({ autoaprobacion: true });
  });

  it("owner aprueba cotización creada por otro con autoaprobacion false", async () => {
    const { ctx } = ctxAdmin();
    const id = await cotizacionConPuesto(ctx);
    await executeCapability(ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    const apr = await executeCapability(comoOwner(ctx), "cpq.cotizaciones.aprobar", { id });
    expect(apr.ok).toBe(true);
    if (apr.ok) expect(apr.data).toMatchObject({ autoaprobacion: false });
  });

  it("gerente con excepción cpq:aprobar no puede aprobar margen", async () => {
    const owner = ctxOwner();
    const id = await cotizacionConPuesto(owner.ctx);
    await executeCapability(owner.ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    const gerenteEx = {
      ...owner.ctx,
      rol: "gerente" as const,
      autorizar: autorizador(
        {
          rol: "gerente",
          permisosRol: null,
          excepciones: [{ permiso: "cpq:aprobar", conceder: true }],
        },
        owner.ctx.usuario!,
        null,
      ),
    };
    expect(await executeCapability(gerenteEx, "cpq.cotizaciones.aprobar", { id })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("admin no puede aprobar su propia cotización", async () => {
    const { ctx } = ctxAdmin();
    const id = await cotizacionConPuesto(ctx);
    await executeCapability(ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    const apr = await executeCapability(ctx, "cpq.cotizaciones.aprobar", { id });
    expect(apr).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(apr.ok ? "" : apr.error.message).toMatch(/admin no puede aprobar su propia/i);
  });

  it("gerente no puede aprobar margen", async () => {
    const owner = ctxOwner();
    const id = await cotizacionConPuesto(owner.ctx);
    await executeCapability(owner.ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    expect(await executeCapability(comoGerente(owner.ctx), "cpq.cotizaciones.aprobar", { id })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("cotización ajena al tenant devuelve NOT_FOUND al aprobar (RLS en packages/db/test/cpq.test.ts)", async () => {
    const { ctx } = ctxOwner();
    const fake = "0192f3a0-0000-7000-8000-000000000099";
    expect(await executeCapability(ctx, "cpq.cotizaciones.aprobar", { id: fake })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });

  it("solicitar aprobación con actor agente guarda viaUserId en solicitadaPorId", async () => {
    const { ctx } = ctxOwner();
    const agentCtx = {
      ...ctx,
      actor: { tipo: "agent" as const, id: "key-cpq-aprob", viaUserId: USUARIO_DE_PRUEBA.id },
    };
    const id = await cotizacionConPuesto(agentCtx);
    const pedido = await executeCapability(agentCtx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    expect(pedido.ok).toBe(true);
    if (!pedido.ok) throw new Error("pedido");
    const aprobacionId = (pedido.data as { aprobacionId: string }).aprobacionId;
    const fila = await agentCtx.db.cpqAprobacion.findFirst({ where: { id: aprobacionId } });
    expect(fila?.solicitadaPorId).toBe(USUARIO_DE_PRUEBA.id);
    expect(fila?.solicitadaPorId).not.toBe("key-cpq-aprob");
  });

  it("un agente no aprueba margen, ni vía owner con la misma identidad", async () => {
    const { ctx } = ctxOwner();
    const id = await cotizacionConPuesto(ctx);
    await executeCapability(ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    const agent = {
      ...ctx,
      actor: { tipo: "agent" as const, id: "key-apr", viaUserId: USUARIO_DE_PRUEBA.id },
      autorizar: (p: string) => [...GESTOR, ...CON_COSTOS, "cpq:aprobar"].includes(p),
    };
    expect(await executeCapability(agent, "cpq.cotizaciones.aprobar", { id })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(
      await executeCapability(agent, "cpq.cotizaciones.rechazar_aprobacion", { id, motivo: "No cumple" }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("sin cpq:costos.ver la ficha no trae costo, huella ni costosLinea y explicar es FORBIDDEN", async () => {
    const { ctx } = ctxOwner();
    const id = await cotizacionConPuesto(ctx);
    const sinCostos = { ...ctx, autorizar: (p: string) => GESTOR.includes(p) };
    const f = await executeCapability(sinCostos, "cpq.cotizaciones.ficha", { id });
    expect(f.ok).toBe(true);
    if (!f.ok) throw new Error("ficha");
    const data = f.data as {
      meta: { costosLinea?: unknown };
      secciones: { lineas: Record<string, unknown>[] }[];
    };
    expect(data.meta.costosLinea).toBeUndefined();
    const linea = data.secciones.flatMap((s) => s.lineas)[0];
    expect(linea?.costo).toBeUndefined();
    expect(linea?.huellaJuegoValores).toBeUndefined();
    expect(await executeCapability(sinCostos, "cpq.cotizaciones.explicar", { id })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("explicar registra auditoría de lectura con el id de la cotización", async () => {
    const { ctx, eventos } = contextoDePrueba({
      semilla: semilla(),
      modulosActivos: ACTIVOS,
      rol: "owner",
    });
    const id = await cotizacionConPuesto(ctx);
    const n = eventos.length;
    const r = await executeCapability(ctx, "cpq.cotizaciones.explicar", { id });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("explicar");
    expect((r.data as { cotizacionId: string }).cotizacionId).toBe(id);
    expect(eventos.slice(n)).toEqual([
      expect.objectContaining({ capability: "cpq.cotizaciones.explicar", payload: { ids: [id] } }),
    ]);
    expect((r.data as { traza: unknown[] }).traza.length).toBeGreaterThan(0);
  });

  it("ficha trae meta de fecha de cálculo y semáforo con costos", async () => {
    const { ctx } = ctxOwner();
    const id = await cotizacionConPuesto(ctx);
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    expect(f.ok).toBe(true);
    if (!f.ok) throw new Error("ficha");
    const data = f.data as {
      meta: { fechaCalculo: string; costosLinea?: Record<string, { estado: string }> };
      calculo: { semaforo?: string };
    };
    expect(data.meta.fechaCalculo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.calculo.semaforo).toBeTruthy();
    expect(Object.values(data.meta.costosLinea ?? {})[0]?.estado).toBe("ok");
  });
});
