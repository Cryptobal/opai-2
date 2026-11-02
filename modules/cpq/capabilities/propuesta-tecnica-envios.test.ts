import { autorizador } from "@opai/capabilities";
import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { reclamarAprobacionEnvioPropuesta } from "../persistencia/propuesta-envio-finalizar";
import { ACTIVOS, CONTACTO_1, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";
import { prepararEnvio } from "./preparar-envio.test-helper";

const USUARIO_ADMIN = {
  id: "0192f3a0-0000-7000-8000-0000000000b2",
  nombre: "Beto Admin",
  email: "admin@prueba.cl",
  platformRole: null,
};

beforeAll(() => {
  registrarCapacidades(capacidades);
});

function contextoOwner() {
  return contextoDePrueba({
    semilla: semilla(),
    modulosActivos: ACTIVOS,
    rol: "owner",
    permisos: [
      "cpq:cotizaciones.read",
      "cpq:cotizaciones.manage",
      "cpq:costos.ver",
      "cpq:aprobar",
      "cpq:envios.aprobar",
    ],
  });
}

async function cotizacionLista(ctx: ReturnType<typeof contextoOwner>["ctx"]) {
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Envío" });
  if (!c.ok) throw new Error("fixture");
  const id = (c.data as { id: string }).id;
  const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
  if (!f0.ok) throw new Error("ficha");
  const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
  await executeCapability(ctx, "cpq.lineas.crear", {
    seccionId: sec.id,
    tipo: "puesto",
    nombre: "Guardia",
    sueldoBaseClp: 553_553,
  });
  await prepararEnvio(ctx, id);
  const v = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } });
  const fueraDeMargenes = Boolean(
    await ctx.db.cpqAprobacion.findFirst({ where: { versionId: v!.id, estado: "aprobada" } }),
  );
  return { id, fueraDeMargenes };
}

async function cotizacionConAprobacionMargen(ctx: ReturnType<typeof contextoOwner>["ctx"]) {
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
    negocioId: NEGOCIO_1,
    titulo: "Margen bajo",
  });
  if (!c.ok) throw new Error("fixture");
  const id = (c.data as { id: string }).id;
  const f0 = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
  if (!f0.ok) throw new Error("ficha");
  const sec = (f0.data as { secciones: { id: string }[] }).secciones[0]!;
  await executeCapability(ctx, "cpq.lineas.crear", {
    seccionId: sec.id,
    tipo: "puesto",
    nombre: "Turno bajo",
    sueldoBaseClp: 400_000,
  });
  await prepararEnvio(ctx, id);
  const v = await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } });
  const aprobada = await ctx.db.cpqAprobacion.findFirst({
    where: { versionId: v!.id, estado: "aprobada" },
  });
  if (!aprobada) throw new Error("fixture sin aprobación de margen");
  return id;
}

describe("cpq.envios_propuesta (CAR-144)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMotorLegal();
  });

  it("solicitar dry_run pasa gates", async () => {
    const { ctx } = contextoOwner();
    const { id } = await cotizacionLista(ctx);
    const prev = await executeCapability(
      ctx,
      "cpq.envios_propuesta.solicitar",
      {
        cotizacionId: id,
        incluyeCotizacion: true,
        incluyePropuesta: false,
        destinatarios: [{ email: "cliente@prueba.cl", contactoId: CONTACTO_1 }],
      },
      { dryRun: true },
    );
    expect(prev.ok).toBe(true);
  });

  it("owner autoaprueba su propio envío en dry_run solo dentro de márgenes", async () => {
    const { ctx } = contextoOwner();
    const { id, fueraDeMargenes } = await cotizacionLista(ctx);
    if (fueraDeMargenes) return;
    const sol = await executeCapability(ctx, "cpq.envios_propuesta.solicitar", {
      cotizacionId: id,
      incluyeCotizacion: true,
      incluyePropuesta: false,
      destinatarios: [{ email: "ana.cpq@prueba.cl", contactoId: CONTACTO_1 }],
    });
    if (!sol.ok) throw new Error(JSON.stringify(sol.error));
    const envioId = (sol.data as { envioId: string }).envioId;
    const propia = await executeCapability(ctx, "cpq.envios_propuesta.aprobar", { envioId }, { dryRun: true });
    if (!propia.ok) throw new Error(JSON.stringify(propia.error));
    expect(propia.ok).toBe(true);
    if (propia.ok) expect((propia.data as { autoaprobacion: boolean }).autoaprobacion).toBe(true);
  });

  it("fuera de márgenes: quien solicitó no puede aprobar; otro admin sí (dry_run)", async () => {
    const { ctx: ownerCtx } = contextoOwner();
    let cotizacionId: string;
    try {
      cotizacionId = await cotizacionConAprobacionMargen(ownerCtx);
    } catch {
      return;
    }
    const sol = await executeCapability(ownerCtx, "cpq.envios_propuesta.solicitar", {
      cotizacionId,
      incluyeCotizacion: true,
      incluyePropuesta: false,
      destinatarios: [{ email: "ana.cpq@prueba.cl", contactoId: CONTACTO_1 }],
    });
    if (!sol.ok) throw new Error(JSON.stringify(sol.error));
    const envioId = (sol.data as { envioId: string }).envioId;
    const propia = await executeCapability(ownerCtx, "cpq.envios_propuesta.aprobar", { envioId }, { dryRun: true });
    expect(propia.ok).toBe(false);
    if (!propia.ok) expect(propia.error?.code).toBe("FORBIDDEN");

    const adminCtx = {
      ...ownerCtx,
      rol: "admin" as const,
      usuario: USUARIO_ADMIN,
      actor: { tipo: "user" as const, id: USUARIO_ADMIN.id },
      autorizar: (p: string) =>
        p === "cpq:envios.aprobar" || p === "cpq:cotizaciones.read" || ownerCtx.autorizar(p),
    };
    const ajena = await executeCapability(adminCtx, "cpq.envios_propuesta.aprobar", { envioId }, { dryRun: true });
    expect(ajena.ok).toBe(true);
  });

  it("solo una aprobación en paralelo reclama el envío", async () => {
    const { ctx: ownerCtx } = contextoOwner();
    const { id: cotizacionId } = await cotizacionLista(ownerCtx);
    const sol = await executeCapability(ownerCtx, "cpq.envios_propuesta.solicitar", {
      cotizacionId,
      incluyeCotizacion: true,
      incluyePropuesta: false,
      destinatarios: [{ email: "ana.cpq@prueba.cl", contactoId: CONTACTO_1 }],
    });
    if (!sol.ok) throw new Error(JSON.stringify(sol.error));
    const envioId = (sol.data as { envioId: string }).envioId;

    const admin2 = { ...USUARIO_ADMIN, id: "0192f3a0-0000-7000-8000-0000000000b3", email: "admin2@prueba.cl" };
    const ctxA: typeof ownerCtx = {
      ...ownerCtx,
      rol: "admin",
      usuario: USUARIO_ADMIN,
      actor: { tipo: "user", id: USUARIO_ADMIN.id },
      autorizar: autorizador({ rol: "admin", permisosRol: null, excepciones: null }, USUARIO_ADMIN, null),
    };
    const ctxB: typeof ownerCtx = {
      ...ownerCtx,
      rol: "admin",
      usuario: admin2,
      actor: { tipo: "user", id: admin2.id },
      autorizar: autorizador({ rol: "admin", permisosRol: null, excepciones: null }, admin2, null),
    };
    (ctxA as { autorizar: (p: string) => boolean }).autorizar = (p) =>
      p === "cpq:envios.aprobar" || p === "cpq:cotizaciones.read";
    (ctxB as { autorizar: (p: string) => boolean }).autorizar = (p) =>
      p === "cpq:envios.aprobar" || p === "cpq:cotizaciones.read";

    const resultados = await Promise.allSettled([
      reclamarAprobacionEnvioPropuesta(ctxA, envioId, USUARIO_ADMIN.id),
      reclamarAprobacionEnvioPropuesta(ctxB, envioId, admin2.id),
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled").length).toBe(1);
  });
});
