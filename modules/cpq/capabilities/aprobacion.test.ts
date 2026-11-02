import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { publicacionesReferencia } from "../../../packages/domain/src/remuneraciones/referencia.fixture";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as valoresLegales from "../persistencia/valores-legales";
import { ACTIVOS, CON_COSTOS, CONTACTO_1, GESTOR, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

function ctxOwner() {
  return contextoDePrueba({
    semilla: semilla(),
    modulosActivos: ACTIVOS,
    permisos: [...GESTOR, ...CON_COSTOS, "cpq:aprobar"],
  });
}

async function cotizacionConPuesto(ctx: ReturnType<typeof ctxOwner>["ctx"]) {
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
    negocioId: NEGOCIO_1,
    titulo: "Aprobación",
  });
  if (!c.ok) throw new Error("fixture");
  const id = (c.data as { id: string }).id;
  vi.spyOn(valoresLegales, "valoresLegalesTenant").mockResolvedValue(publicacionesReferencia());
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
    const { ctx } = ctxOwner();
    const id = await cotizacionConPuesto(ctx);
    const pedido = await executeCapability(ctx, "cpq.cotizaciones.solicitar_aprobacion", { id });
    expect(pedido.ok).toBe(true);
    const apr = await executeCapability(ctx, "cpq.cotizaciones.aprobar", { id });
    expect(apr.ok).toBe(true);
    const env = await executeCapability(
      ctx,
      "cpq.cotizaciones.enviar",
      { id, contactoId: CONTACTO_1 },
      { dryRun: true },
    );
    expect(env.ok).toBe(true);
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
