import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("remuneraciones en base real: RLS y mutual", () => {
  let e: Entorno;
  let mod: ModuloCapacidades;
  const t = { a: "", b: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const slug = () => randomUUID().slice(0, 8);
    t.a = (await e.admin.tenant.create({ data: { slug: `rem-a-${slug()}`, nombre: "A", vertical: "seguridad" } })).id;
    t.b = (await e.admin.tenant.create({ data: { slug: `rem-b-${slug()}`, nombre: "B", vertical: "seguridad" } })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", medidor: { registrar: async () => undefined } });

  it("listar ve indicadores de plataforma sembrados", async () => {
    const r = await mod.executeCapability(ctx(t.a), "core.remuneraciones.listar", {});
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("listar");
    expect((r.data as { filas: unknown[] }).filas.length).toBeGreaterThanOrEqual(11);
  });

  it("perfil mutual de A no aparece en B", async () => {
    await mod.executeCapability(ctx(t.a), "core.remuneraciones.confirmar_mutual", { tasaEscalada: 2700 });
    const a = await mod.executeCapability(ctx(t.a), "core.remuneraciones.listar", {});
    const b = await mod.executeCapability(ctx(t.b), "core.remuneraciones.listar", {});
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error("listar");
    expect((a.data as { mutualAdicional: { estado: string } }).mutualAdicional.estado).toBe("vigente");
    expect((b.data as { mutualAdicional: { estado: string } }).mutualAdicional.estado).toBe("pendiente");
  });
});
