import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { Actor } from "../src/types";
import type { ValorIndicador } from "@opai/domain";

describe.skipIf(!urlPropietario)("remuneraciones en base real: RLS y mutual", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { a: "", b: "" };
  let userId = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const slug = () => randomUUID().slice(0, 8);
    t.a = (await e.admin.tenant.create({ data: { slug: `rem-a-${slug()}`, nombre: "A", vertical: "seguridad" } })).id;
    t.b = (await e.admin.tenant.create({ data: { slug: `rem-b-${slug()}`, nombre: "B", vertical: "seguridad" } })).id;
    userId = (
      await e.admin.user.create({
        data: { name: "Rem", email: `rem-${slug()}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({ data: { tenantId: t.a, userId, rol: "owner", portales: ["erp"] } });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string, actor: Actor = { tipo: "system" }) =>
    mod.crearContexto({
      tenantId,
      actor,
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

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

  it("un agente con rol owner no confirma mutual ni indicador (soloPersonas)", async () => {
    const agente = ctx(t.a, { tipo: "agent", id: randomUUID(), viaUserId: userId });
    const mutual = await mod.executeCapability(agente, "core.remuneraciones.confirmar_mutual", { tasaEscalada: 100 });
    expect(!mutual.ok && mutual.error.code).toBe("FORBIDDEN");
    const uf = await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave: "uf" } });
    const rechazado = await e.admin.valorTenant.create({
      data: {
        tenantId: t.a,
        indicadorId: uf.id,
        valorJson: 1,
        vigenteDesde: new Date("2026-01-01"),
        estado: "rechazado",
        origen: "propio",
      },
    });
    const conf = await mod.executeCapability(agente, "core.remuneraciones.confirmar", {
      valorTenantId: rechazado.id,
    });
    expect(!conf.ok && conf.error.code).toBe("FORBIDDEN");
  });

  it("confirmar un valor rechazado falla", async () => {
    const uf = await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave: "uf" } });
    const rechazado = await e.admin.valorTenant.create({
      data: {
        tenantId: t.a,
        indicadorId: uf.id,
        valorJson: 2,
        vigenteDesde: new Date("2026-02-01"),
        estado: "rechazado",
        origen: "propio",
      },
    });
    const r = await mod.executeCapability(ctx(t.a), "core.remuneraciones.confirmar", {
      valorTenantId: rechazado.id,
    });
    expect(!r.ok && r.error.code).toBe("UNPROCESSABLE");
  });

  it("publicacionesParaFecha respeta vigencia, excluye retenidos de plataforma y elige tenant más reciente", async () => {
    const uf = await e.admin.indicadorLegal.findFirstOrThrow({ where: { clave: "uf" } });
    await e.admin.valorTenant.createMany({
      data: [
        {
          tenantId: t.a,
          indicadorId: uf.id,
          valorJson: 100,
          vigenteDesde: new Date("2026-01-01"),
          vigenteHasta: new Date("2026-06-30"),
          estado: "vigente",
          origen: "propio",
        },
        {
          tenantId: t.a,
          indicadorId: uf.id,
          valorJson: 200,
          vigenteDesde: new Date("2026-07-01"),
          estado: "vigente",
          origen: "propio",
        },
        {
          tenantId: t.a,
          indicadorId: uf.id,
          valorJson: 50,
          vigenteDesde: new Date("2026-05-01"),
          estado: "vigente",
          origen: "propio",
        },
      ],
    });
    await e.admin.valorPublicado.create({
      data: {
        indicadorId: uf.id,
        valorJson: 999,
        vigenteDesde: new Date("2026-01-01"),
        estado: "retenido",
        fuente: "prueba",
      },
    });
    const c = ctx(t.a);
    const fuera = await mod.publicacionesParaFecha(c, "2026-03-15");
    const ufFuera = fuera.find((p: ValorIndicador) => p.indicador === "uf");
    expect(ufFuera?.valor).toBe(100);
    const dentro = await mod.publicacionesParaFecha(c, "2026-08-01");
    const ufDentro = dentro.find((p: ValorIndicador) => p.indicador === "uf");
    expect(ufDentro?.valor).toBe(200);
  });
});
