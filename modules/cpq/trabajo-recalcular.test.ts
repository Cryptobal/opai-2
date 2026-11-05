import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla } from "./capabilities/fixtures";
import { capacidades } from "./capabilities/index";
import { mockMotorLegal } from "./persistencia/mock-motor-legal";
import { trabajoCpqRecalcularAntiguos } from "./trabajo-recalcular";

beforeAll(() => registrarCapacidades(capacidades));

const ANTIGUO = JSON.stringify({ ventaMensual: 900_000, semaforo: "rojo", margenEfectivoPct: 0, noEnviable: false });

describe("trabajo cpq.cotizaciones.recalcular_antiguos (CAR-192)", () => {
  it("recalcula solo borradores con cálculo antiguo y no toca lista ni los ya completos", async () => {
    mockMotorLegal();
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: [...GESTOR, ...CON_COSTOS] });
    const nueva = async (titulo: string) => {
      const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo });
      if (!c.ok) throw new Error("fixture");
      const id = (c.data as { id: string }).id;
      const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
      if (!f.ok) throw new Error("ficha");
      const sec = (f.data as { secciones: { id: string }[] }).secciones[0]!;
      await executeCapability(ctx, "cpq.lineas.crear", { seccionId: sec.id, tipo: "puesto", nombre: "Turno", sueldoBaseClp: 650_000 });
      return (await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } }))!.id;
    };
    const antiguo = await nueva("Antiguo");
    const lista = await nueva("Lista");
    await ctx.db.cpqVersion.updateMany({ where: { id: antiguo }, data: { calculoCongeladoJson: ANTIGUO } });
    await ctx.db.cpqVersion.updateMany({ where: { id: lista }, data: { estado: "lista", calculoCongeladoJson: ANTIGUO } });

    expect(await trabajoCpqRecalcularAntiguos.ejecutar(ctx, {})).toEqual({ recalculadas: 1, fallidas: 0 });
    const a = (await ctx.db.cpqVersion.findFirst({ where: { id: antiguo } }))!;
    expect(JSON.parse(a.calculoCongeladoJson!).lineas).toBeDefined();
    expect((await ctx.db.cpqVersion.findFirst({ where: { id: lista } }))!.calculoCongeladoJson).toBe(ANTIGUO);
    // Idempotente: el borrador ya recalculado deja de ser candidato.
    expect(await trabajoCpqRecalcularAntiguos.ejecutar(ctx, {})).toEqual({ recalculadas: 0, fallidas: 0 });
    expect(trabajoCpqRecalcularAntiguos.periodicidad).toBe("diaria");
  });
});
