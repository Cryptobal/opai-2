import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mockMotorLegal } from "../persistencia/mock-motor-legal";
import { ACTIVOS, CON_COSTOS, GESTOR, NEGOCIO_1, semilla } from "./fixtures";
import { capacidades } from "./index";

beforeAll(() => {
  registrarCapacidades(capacidades);
});

type Item = {
  id: string;
  estadoFicha: { estado: string; etiqueta: string } | null;
  resumenCalculo?: { calculoConfiable: boolean; margenEfectivoPct?: number; semaforo?: string; costoPendiente: boolean };
};

async function escenario() {
  const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: [...GESTOR, ...CON_COSTOS] });
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", { negocioId: NEGOCIO_1, titulo: "Lista" });
  if (!c.ok) throw new Error("fixture");
  const id = (c.data as { id: string }).id;
  const f = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
  if (!f.ok) throw new Error("ficha");
  const sec = (f.data as { secciones: { id: string }[] }).secciones[0]!;
  await executeCapability(ctx, "cpq.lineas.crear", { seccionId: sec.id, tipo: "puesto", nombre: "Turno", sueldoBaseClp: 650_000 });
  await executeCapability(ctx, "cpq.cotizaciones.calcular", { id });
  const version = (await ctx.db.cpqVersion.findFirst({ where: { cotizacionId: id } }))!;
  const lista = async () => {
    const r = await executeCapability(ctx, "cpq.cotizaciones.list", { negocioId: NEGOCIO_1 });
    if (!r.ok) throw new Error("lista");
    return (r.data as { items: Item[] }).items.find((i) => i.id === id)!;
  };
  const fichaEstado = async () => {
    const r = await executeCapability(ctx, "cpq.cotizaciones.ficha", { id });
    if (!r.ok) throw new Error("ficha");
    return (r.data as { meta: { estadoFicha: { estado: string; etiqueta: string } } }).meta.estadoFicha;
  };
  return { ctx, id, version, lista, fichaEstado };
}

describe("estado y margen de la lista (CAR-192)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMotorLegal();
  });

  it("el estado de la lista es el mismo de la ficha en borrador, en aprobación y lista", async () => {
    const e = await escenario();
    for (const estado of ["borrador", "en_aprobacion", "lista", "enviada"]) {
      await e.ctx.db.cpqVersion.updateMany({ where: { id: e.version.id }, data: { estado } });
      const enLista = (await e.lista()).estadoFicha;
      const enFicha = await e.fichaEstado();
      expect(enLista).toEqual({ estado: enFicha.estado, etiqueta: enFicha.etiqueta });
    }
  });

  it("«Pendiente de aprobación» ya no existe: la lista dice «En aprobación» como la ficha", async () => {
    const e = await escenario();
    await e.ctx.db.cpqVersion.updateMany({ where: { id: e.version.id }, data: { estado: "en_aprobacion" } });
    expect((await e.lista()).estadoFicha?.etiqueta).toBe("En aprobación");
  });

  it("un cálculo guardado antiguo (cuatro campos, margen 0) no muestra margen ni semáforo", async () => {
    const e = await escenario();
    await e.ctx.db.cpqVersion.updateMany({
      where: { id: e.version.id },
      data: { calculoCongeladoJson: JSON.stringify({ ventaMensual: 900_000, semaforo: "rojo", margenEfectivoPct: 0, noEnviable: false }) },
    });
    const it = await e.lista();
    expect(it.resumenCalculo).toEqual({ costoPendiente: false, calculoConfiable: false });
    expect(it.estadoFicha).toBeNull();
  });

  it("recalcular corrige la fila: vuelve a ser confiable y con estado", async () => {
    const e = await escenario();
    await e.ctx.db.cpqVersion.updateMany({
      where: { id: e.version.id },
      data: { calculoCongeladoJson: JSON.stringify({ ventaMensual: 900_000, semaforo: "rojo", margenEfectivoPct: 0, noEnviable: false }) },
    });
    expect((await e.lista()).resumenCalculo?.calculoConfiable).toBe(false);
    await executeCapability(e.ctx, "cpq.cotizaciones.calcular", { id: e.id });
    const it = await e.lista();
    expect(it.resumenCalculo?.calculoConfiable).toBe(true);
    expect(it.resumenCalculo?.margenEfectivoPct).toBeGreaterThan(0);
    expect(it.estadoFicha).not.toBeNull();
  });

  it("sin mínimo configurado la lista muestra el margen pero no el semáforo", async () => {
    const e = await escenario();
    const sin = await e.lista();
    expect(sin.resumenCalculo?.margenEfectivoPct).toBeGreaterThan(0);
    expect(sin.resumenCalculo?.semaforo).toBeUndefined();
    await e.ctx.db.ajuste.create({
      data: { tenantId: e.ctx.tenantId, modulo: "cpq", clave: "margen_minimo_pct", ambito: "tenant", sujetoId: e.ctx.tenantId, valor: 10 },
    });
    expect((await e.lista()).resumenCalculo?.semaforo).toBeDefined();
  });
});
