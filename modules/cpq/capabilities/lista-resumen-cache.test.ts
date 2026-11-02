import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { publicacionesReferencia } from "../../../packages/domain/src/remuneraciones/referencia.fixture";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as proveedor from "../persistencia/proveedor";
import * as valoresLegales from "../persistencia/valores-legales";
import { ACTIVOS, CON_COSTOS, GESTOR, GESTOR_COSTOS, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

describe("calculoCongeladoJson en lista (C-1)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(valoresLegales, "juegoParaFecha").mockResolvedValue(publicacionesReferencia());
    vi.spyOn(proveedor, "mutualAdicionalTenant").mockResolvedValue(0.0095);
  });

  it("recalcular sin cpq:costos.ver guarda semáforo y margen; otro usuario con permiso los ve en lista", async () => {
    const h = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: GESTOR });
    const c = await executeCapability(h.ctx, "cpq.cotizaciones.create", {
      negocioId: NEGOCIO_1,
      titulo: "Cache lista",
    });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const ficha = await executeCapability(h.ctx, "cpq.cotizaciones.ficha", { id });
    if (!ficha.ok) throw new Error("ficha");
    const sec = (ficha.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(h.ctx, "cpq.lineas.crear", {
      seccionId: sec.id,
      tipo: "puesto",
      nombre: "Guardia",
      sueldoBaseClp: 700_000,
    });
    const sinCostos = { ...h.ctx, autorizar: (p: string) => GESTOR.includes(p) };
    await executeCapability(sinCostos, "cpq.cotizaciones.calcular", { id });
    const v = await h.ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id }, orderBy: { numero: "desc" } });
    const cache = JSON.parse(v!.calculoCongeladoJson!) as { semaforo?: string; margenEfectivoPct?: number };
    expect(cache.semaforo).toMatch(/verde|amarillo|rojo/);
    expect(typeof cache.margenEfectivoPct).toBe("number");

    const conCostos = { ...h.ctx, autorizar: (p: string) => GESTOR_COSTOS.includes(p) };
    const lista = await executeCapability(conCostos, "cpq.cotizaciones.list", { negocioId: NEGOCIO_1 });
    expect(lista).toMatchObject({
      ok: true,
      data: {
        items: [
          {
            id,
            resumenCalculo: {
              semaforo: cache.semaforo,
              margenEfectivoPct: cache.margenEfectivoPct,
              costoPendiente: false,
            },
          },
        ],
      },
    });

    const listaSin = await executeCapability(sinCostos, "cpq.cotizaciones.list", { negocioId: NEGOCIO_1 });
    expect((listaSin.data as { items: { resumenCalculo?: unknown }[] }).items[0]?.resumenCalculo).toBeUndefined();
  });
});
