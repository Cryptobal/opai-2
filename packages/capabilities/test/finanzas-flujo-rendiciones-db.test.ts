// CAR-178 · ADR-113 punto 3: los lotes de rendiciones aprobados o con nómina generada, y aún sin pagar, son egreso
// comprometido de la semana en curso; los pagados (los trae la cartola) y los anulados no cuentan. Otra empresa no los ve.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/finanzas/manifest";
import { FILA_RENDICIONES } from "../../../modules/finanzas/capacidades/filas-virtuales";
import { lunesHoy } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Planilla = {
  celdas: { filaId: string; semana: string; monto: number; nota: string | null; capa: string }[];
  filas: { id: string; etiqueta: string }[];
};

describe.skipIf(omitirSuiteDb())("flujo · rendiciones por pagar (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  const usuario = randomUUID();
  const ctx = (tid: string) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@rend.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const planilla = async (tid: string) => {
    const r = await mod.executeCapability(ctx(tid), "finanzas.planilla.obtener", { desde: lunesHoy(), semanas: 8 });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as Planilla;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarModulos([manifest]);
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    tenantA = (await e.admin.tenant.create({ data: { slug: `ren-a-${randomUUID().slice(0, 8)}`, nombre: "A", vertical: "seguridad" } })).id;
    tenantB = (await e.admin.tenant.create({ data: { slug: `ren-b-${randomUUID().slice(0, 8)}`, nombre: "B", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${randomUUID().slice(0, 8)}@rend.test`, name: "u" } });
    const lotes = [
      [1, "aprobado", 100_000, 2],
      [2, "generado", 50_000, 1],
      [3, "pagado", 70_000, 1],
      [4, "anulado", 30_000, 1],
      [5, "borrador", 20_000, 1],
    ] as const;
    for (const [codigo, estado, totalClp, cantidad] of lotes) {
      const pago = estado === "pagado" ? { pagadoEn: new Date(), fechaPago: new Date(), referenciaPago: "NOM-QA-1" } : {};
      await e.admin.lotePago.create({ data: { tenantId: tenantA, codigo, estado, totalClp, cantidad, creadoPorId: usuario, ...pago } });
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("solo lo aprobado o generado y sin pagar es egreso comprometido de esta semana", async () => {
    const p = await planilla(tenantA);
    const celdas = p.celdas.filter((c) => c.filaId === FILA_RENDICIONES);
    expect(celdas).toHaveLength(2);
    expect(celdas.every((c) => c.semana === lunesHoy() && c.capa === "comprometido")).toBe(true);
    expect(celdas.reduce((t, c) => t + c.monto, 0)).toBe(150_000);
    expect(celdas.map((c) => c.nota)).toEqual(["Lote LP-1 · 2 rendiciones · aprobado, por pagar", "Lote LP-2 · 1 rendición · nómina generada, por pagar"]);
    expect(p.filas.find((f) => f.id === FILA_RENDICIONES)?.etiqueta).toBe("Rendiciones por pagar");
  });

  it("otra empresa no ve la fila ni los lotes", async () => {
    const p = await planilla(tenantB);
    expect(p.celdas.filter((c) => c.filaId === FILA_RENDICIONES)).toHaveLength(0);
    expect(p.filas.some((f) => f.id === FILA_RENDICIONES)).toBe(false);
  });
});
