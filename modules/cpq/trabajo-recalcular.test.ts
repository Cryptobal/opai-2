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
    // Deja una traza de auditoría con solo los conteos.
    const traza = await ctx.db.auditEvent.findMany({ where: { capability: "cpq.cotizaciones.recalcular_antiguos" } });
    expect(traza).toHaveLength(1);
    expect(traza[0]!.payload).toEqual({ recalculadas: 1, fallidas: 0, errores: {}, versionIds: [antiguo] });
    // Idempotente: el borrador ya recalculado deja de ser candidato.
    expect(await trabajoCpqRecalcularAntiguos.ejecutar(ctx, {})).toEqual({ recalculadas: 0, fallidas: 0 });
    expect(trabajoCpqRecalcularAntiguos.periodicidad).toBe("diaria");
  });
});

describe("recálculo condicionado al estado (CAR-192)", () => {
  it("una versión que dejó de ser borrador durante el cálculo conserva su cálculo congelado", async () => {
    mockMotorLegal();
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: [...GESTOR, ...CON_COSTOS] });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Carrera" });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f.ok) throw new Error("ficha");
    const sec = (f.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", { seccionId: sec.id, tipo: "puesto", nombre: "Turno", sueldoBaseClp: 650_000 });
    const v = (await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } }))!;
    await ctx.db.cpqVersion.updateMany({ where: { id: v.id }, data: { calculoCongeladoJson: ANTIGUO } });
    // Simula que la dejan lista entre la lectura de las filas y la escritura del cálculo.
    const original = ctx.db.cpqVersion.updateMany.bind(ctx.db.cpqVersion);
    let primera = true;
    ctx.db.cpqVersion.updateMany = (async (args: Parameters<typeof original>[0]) => {
      if (primera) {
        primera = false;
        await original({ where: { id: v.id }, data: { estado: "lista" } });
      }
      return original(args);
    }) as typeof ctx.db.cpqVersion.updateMany;
    // La versión salió de borrador durante el cálculo: no se escribió, así que no cuenta como recalculada.
    expect(await trabajoCpqRecalcularAntiguos.ejecutar(ctx, {})).toEqual({ recalculadas: 0, fallidas: 0 });
    const despues = (await ctx.db.cpqVersion.findFirst({ where: { id: v.id } }))!;
    expect(despues.estado).toBe("lista");
    expect(despues.calculoCongeladoJson).toBe(ANTIGUO);
  });

  it("una versión reabierta (revisión distinta) durante el cálculo conserva su cálculo", async () => {
    mockMotorLegal();
    const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: [...GESTOR, ...CON_COSTOS] });
    const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Carrera revisión" });
    if (!c.ok) throw new Error("fixture");
    const id = (c.data as { id: string }).id;
    const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!f.ok) throw new Error("ficha");
    const sec = (f.data as { secciones: { id: string }[] }).secciones[0]!;
    await executeCapability(ctx, "cpq.lineas.crear", { seccionId: sec.id, tipo: "puesto", nombre: "Turno", sueldoBaseClp: 650_000 });
    const v = (await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } }))!;
    await ctx.db.cpqVersion.updateMany({ where: { id: v.id }, data: { calculoCongeladoJson: ANTIGUO } });
    // Simula que la dejan lista entre la lectura de las filas y la escritura del cálculo.
    const original = ctx.db.cpqVersion.updateMany.bind(ctx.db.cpqVersion);
    let primera = true;
    ctx.db.cpqVersion.updateMany = (async (args: Parameters<typeof original>[0]) => {
      if (primera) {
        primera = false;
        await original({ where: { id: v.id }, data: { revision: v.revision + 1 } });
      }
      return original(args);
    }) as typeof ctx.db.cpqVersion.updateMany;
    // La versión salió de borrador durante el cálculo: no se escribió, así que no cuenta como recalculada.
    expect(await trabajoCpqRecalcularAntiguos.ejecutar(ctx, {})).toEqual({ recalculadas: 0, fallidas: 0 });
    const despues = (await ctx.db.cpqVersion.findFirst({ where: { id: v.id } }))!;
    expect(despues.revision).toBe(v.revision + 1);
    expect(despues.calculoCongeladoJson).toBe(ANTIGUO);
  });
});
