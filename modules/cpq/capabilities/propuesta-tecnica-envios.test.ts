import {
  autorizador,
  executeCapability,
  registrarCapacidades,
  type Contexto,
} from "@opai/capabilities";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import * as ejecutarEnvio from "../persistencia/propuesta-envio-ejecutar";
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

function ctxTenant() {
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

function comoGerente(ctx: Contexto): Contexto {
  return {
    ...ctx,
    rol: "gerente",
    usuario: USUARIO_DE_PRUEBA,
    actor: { tipo: "user", id: USUARIO_DE_PRUEBA.id },
    autorizar: (p) =>
      p === "cpq:cotizaciones.read" ||
      p === "cpq:cotizaciones.manage" ||
      p === "cpq:envios.aprobar" ||
      false,
  };
}

function comoOwner(ctx: Contexto): Contexto {
  return {
    ...ctx,
    rol: "owner",
    usuario: USUARIO_DE_PRUEBA,
    actor: { tipo: "user", id: USUARIO_DE_PRUEBA.id },
    autorizar: autorizador(
      { rol: "owner", permisosRol: null, excepciones: null },
      USUARIO_DE_PRUEBA,
      null,
    ),
  };
}

function comoAdmin(ctx: Contexto, usuario = USUARIO_ADMIN): Contexto {
  return {
    ...ctx,
    rol: "admin",
    usuario,
    actor: { tipo: "user", id: usuario.id },
    autorizar: (p) =>
      p === "cpq:envios.aprobar" ||
      p === "cpq:cotizaciones.read" ||
      p === "cpq:cotizaciones.manage" ||
      p === "cpq:aprobar" ||
      false,
  };
}

async function cotizacionConAprobacionMargen(ctx: Contexto) {
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

/** Sin fila de aprobación de margen → envío «dentro de márgenes». */
async function cotizacionDentroMargenes(ctx: Contexto) {
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Dentro" });
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
  await ctx.db.cpqAprobacion.deleteMany({ where: { versionId: v!.id } });
  return id;
}

const dest = [{ email: "ana.cpq@prueba.cl", contactoId: CONTACTO_1 }] as const;

describe("cpq.envios_propuesta (CAR-144)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMotorLegal();
    vi.spyOn(ejecutarEnvio, "ejecutarEnvioPropuestaAprobado").mockResolvedValue({
      documentoCotizacionId: null,
      documentoPropuestaId: null,
      snapshot: {} as never,
    });
  });

  it("dentro de márgenes: solicitar envía en un paso (dry_run → enviado)", async () => {
    const { ctx } = ctxTenant();
    const cotizacionId = await cotizacionDentroMargenes(ctx);
    const gerente = comoGerente(ctx);
    const r = await executeCapability(
      gerente,
      "cpq.envios_propuesta.solicitar",
      { cotizacionId, incluyeCotizacion: true, incluyePropuesta: false, destinatarios: [...dest] },
      { dryRun: true },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.data as { estado: string }).estado).toBe("enviado");
  });

  it("fuera de márgenes: el solicitante no puede aprobar su propio envío", async () => {
    const { ctx } = ctxTenant();
    const cotizacionId = await cotizacionConAprobacionMargen(ctx);
    const gerente = comoGerente(ctx);
    const sol = await executeCapability(gerente, "cpq.envios_propuesta.solicitar", {
      cotizacionId,
      incluyeCotizacion: true,
      incluyePropuesta: false,
      destinatarios: [...dest],
    });
    expect(sol.ok).toBe(true);
    if (!sol.ok) return;
    expect((sol.data as { estado: string }).estado).toBe("pendiente_aprobacion");
    const envioId = (sol.data as { envioId: string }).envioId;
    const propia = await executeCapability(
      gerente,
      "cpq.envios_propuesta.aprobar",
      { envioId },
      { dryRun: true },
    );
    expect(propia.ok).toBe(false);
    if (!propia.ok) {
      expect(propia.error?.code).toBe("FORBIDDEN");
      expect(String(propia.error?.message)).toMatch(/solicitó/i);
    }
  });

  it("fuera de márgenes: otro aprobador con permiso sí puede aprobar", async () => {
    const { ctx } = ctxTenant();
    const cotizacionId = await cotizacionConAprobacionMargen(ctx);
    const gerente = comoGerente(ctx);
    const sol = await executeCapability(gerente, "cpq.envios_propuesta.solicitar", {
      cotizacionId,
      incluyeCotizacion: true,
      incluyePropuesta: false,
      destinatarios: [...dest],
    });
    expect(sol.ok).toBe(true);
    if (!sol.ok) return;
    const admin = comoAdmin(ctx);
    const ajena = await executeCapability(
      admin,
      "cpq.envios_propuesta.aprobar",
      { envioId: (sol.data as { envioId: string }).envioId },
      { dryRun: true },
    );
    expect(ajena.ok).toBe(true);
  });

  it("fuera de márgenes: owner envía en un paso al solicitar", async () => {
    const { ctx } = ctxTenant();
    const cotizacionId = await cotizacionConAprobacionMargen(ctx);
    const owner = comoOwner(ctx);
    const sol = await executeCapability(owner, "cpq.envios_propuesta.solicitar", {
      cotizacionId,
      incluyeCotizacion: true,
      incluyePropuesta: false,
      destinatarios: [...dest],
    });
    expect(sol.ok).toBe(true);
    if (sol.ok) expect((sol.data as { estado: string }).estado).toBe("enviado");
    expect(ejecutarEnvio.ejecutarEnvioPropuestaAprobado).toHaveBeenCalled();
  });

  it("solo una aprobación en paralelo reclama el envío pendiente", async () => {
    vi.mocked(ejecutarEnvio.ejecutarEnvioPropuestaAprobado).mockRestore();
    vi.spyOn(ejecutarEnvio, "ejecutarEnvioPropuestaAprobado").mockImplementation(async (ctx, row, input) => {
      await reclamarAprobacionEnvioPropuesta(ctx, row.id, input.actorId);
      return { documentoCotizacionId: null, documentoPropuestaId: null, snapshot: {} as never };
    });
    const { ctx } = ctxTenant();
    const cotizacionId = await cotizacionConAprobacionMargen(ctx);
    const gerente = comoGerente(ctx);
    const sol = await executeCapability(gerente, "cpq.envios_propuesta.solicitar", {
      cotizacionId,
      incluyeCotizacion: true,
      incluyePropuesta: false,
      destinatarios: [...dest],
    });
    if (!sol.ok) throw new Error(JSON.stringify(sol.error));
    const envioId = (sol.data as { envioId: string }).envioId;

    const admin2 = { ...USUARIO_ADMIN, id: "0192f3a0-0000-7000-8000-0000000000b3", email: "admin2@prueba.cl" };
    const ctxA = comoAdmin(ctx, USUARIO_ADMIN);
    const ctxB = comoAdmin(ctx, admin2);

    const resultados = await Promise.allSettled([
      reclamarAprobacionEnvioPropuesta(ctxA, envioId, USUARIO_ADMIN.id),
      reclamarAprobacionEnvioPropuesta(ctxB, envioId, admin2.id),
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled").length).toBe(1);
  });
});
