// CAR-406: la búsqueda global trae los períodos de Remuneraciones de la propia empresa, nunca los de otra.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Mod from "../src";

describe.skipIf(!urlPropietario)("core.buscar · Remuneraciones (CAR-406)", () => {
  let e: Entorno, mod: typeof Mod;
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId: string) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["nomina"], medidor });
  const empresa = async (mes: number) => {
    const t = await e.admin.tenant.create({ data: { slug: `bn-${randomUUID().slice(0, 8)}`, nombre: "E", vertical: "seguridad" } });
    const p = await e.admin.nominaPeriodo.create({
      data: { tenantId: t.id, anio: 2026, mes, inicio: new Date("2026-01-01"), fin: new Date("2026-01-31"), cierrePrevisto: new Date("2026-01-31") },
    });
    return { tenantId: t.id, periodoId: p.id };
  };
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarBuscadores(mod.buscadoresNomina);
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada empresa encuentra solo sus períodos", async () => {
    const a = await empresa(3);
    const b = await empresa(3);
    const r = await mod.executeCapability(ctx(a.tenantId), "core.buscar", { q: "marzo 2026" }, {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const otros = (r.data as { otros: { grupo: string; items: { id: string }[] }[] }).otros;
    const ids = otros.find((g) => g.grupo === "remuneraciones")?.items.map((i) => i.id) ?? [];
    expect(ids).toEqual([a.periodoId]);
    expect(ids).not.toContain(b.periodoId);
  });
});
