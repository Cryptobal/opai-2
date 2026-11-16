import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { aplicarModulosNuevos } from "../src/core/modulos-nuevos-aplicar";
import { executeCapability } from "../src/execute";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";

const QA = "0192f3a0-0000-7000-8000-00000000e2e1";
const OTRA = "0192f3a0-0000-7000-8000-00000000e2e2";
const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const, email: "ana@qa-e2e.test" };

const modulo = (id: string, dependencias: string[] = []) =>
  defineModule({
    id,
    nombre: id,
    version: "0.1.0",
    dependencias,
    permisos: [],
    navegacion: [],
    configuracion: z.object({}),
    eventos: [],
    capacidades: [],
  });

function armar(ids: string[]) {
  registrarModulos(ids.map((id) => modulo(id)));
  return contextoDePrueba({
    usuario: owner,
    conTenant: false,
    semilla: {
      tenant: [
        {
          id: QA,
          slug: "qa-e2e",
          nombre: "QA",
          vertical: "seguridad",
          timezone: "America/Santiago",
          estado: "activo",
        },
        {
          id: OTRA,
          slug: "qa-e2e-b",
          nombre: "QA B",
          vertical: "seguridad",
          timezone: "America/Santiago",
          estado: "activo",
          activarModulosNuevosDesde: new Date("2020-01-01T00:00:00.000Z"),
        },
      ],
    },
  });
}

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("módulos nuevos por empresa (CAR-529)", () => {
  it("la primera pasada anota el catálogo y no activa nada", async () => {
    const { ctx, tabla } = armar(["alfa"]);
    const r = await aplicarModulosNuevos(ctx.plataforma!);
    expect(r.activados).toBe(0);
    expect(tabla("tenantModule")).toEqual([]);
    expect(tabla("ajustePlataforma")[0]?.["valor"]).toMatchObject({
      alfa: "1970-01-01T00:00:00.000Z",
    });
  });

  it("un módulo nuevo queda activo solo en qa-e2e-b, que ya tenía la opción", async () => {
    const { ctx, tabla } = armar(["alfa"]);
    await aplicarModulosNuevos(ctx.plataforma!);
    registrarModulos([modulo("beta")]);
    const r = await aplicarModulosNuevos(ctx.plataforma!);
    expect(r.activados).toBe(1);
    expect(tabla("tenantModule")).toEqual([
      expect.objectContaining({ tenantId: OTRA, moduloId: "beta", estado: "activo" }),
    ]);
  });

  it("encender la opción después no repone lo ya visto", async () => {
    const { ctx, tabla } = armar(["alfa"]);
    await aplicarModulosNuevos(ctx.plataforma!);
    registrarModulos([modulo("beta")]);
    await aplicarModulosNuevos(ctx.plataforma!);
    await executeCapability(ctx, "platform.tenants.set_modulos_nuevos", {
      tenantId: QA,
      activo: true,
    });
    await aplicarModulosNuevos(ctx.plataforma!);
    expect(tabla("tenantModule").filter((f) => f["tenantId"] === QA)).toEqual([]);
  });

  it("una fila suspendida no se reactiva", async () => {
    const { ctx, tabla } = armar(["alfa"]);
    await aplicarModulosNuevos(ctx.plataforma!);
    tabla("tenantModule").push({ tenantId: OTRA, moduloId: "gamma", estado: "suspendido" });
    registrarModulos([modulo("gamma")]);
    await aplicarModulosNuevos(ctx.plataforma!);
    expect(tabla("tenantModule").find((f) => f["moduloId"] === "gamma")?.["estado"]).toBe(
      "suspendido",
    );
  });

  it("si falta la dependencia, reintenta en la pasada siguiente", async () => {
    const { ctx, tabla } = armar(["alfa"]);
    await aplicarModulosNuevos(ctx.plataforma!);
    registrarModulos([modulo("alfa"), modulo("beta", ["alfa"])]);
    expect((await aplicarModulosNuevos(ctx.plataforma!)).activados).toBe(0);
    tabla("tenantModule").push({ tenantId: OTRA, moduloId: "alfa", estado: "activo" });
    expect((await aplicarModulosNuevos(ctx.plataforma!)).activados).toBe(1);
    expect(tabla("tenantModule")).toContainEqual(
      expect.objectContaining({ tenantId: OTRA, moduloId: "beta", estado: "activo" }),
    );
  });

  it("la opción se enciende, no mueve la fecha si ya estaba, y se apaga", async () => {
    const { ctx, tabla } = armar([]);
    const on = await executeCapability(ctx, "platform.tenants.set_modulos_nuevos", {
      tenantId: QA,
      activo: true,
    });
    expect(on).toMatchObject({ ok: true, data: { activarModulosNuevos: true, anterior: false } });
    const desde = tabla("tenant").find((t) => t["id"] === QA)?.["activarModulosNuevosDesde"];
    await executeCapability(ctx, "platform.tenants.set_modulos_nuevos", {
      tenantId: QA,
      activo: true,
    });
    expect(tabla("tenant").find((t) => t["id"] === QA)?.["activarModulosNuevosDesde"]).toEqual(
      desde,
    );
    const seco = await executeCapability(
      ctx,
      "platform.tenants.set_modulos_nuevos",
      { tenantId: QA, activo: false },
      { dryRun: true },
    );
    expect(seco).toMatchObject({ ok: true, data: { activarModulosNuevos: false } });
    expect(tabla("tenant").find((t) => t["id"] === QA)?.["activarModulosNuevosDesde"]).toEqual(
      desde,
    );
    await executeCapability(ctx, "platform.tenants.set_modulos_nuevos", {
      tenantId: QA,
      activo: false,
    });
    expect(tabla("tenant").find((t) => t["id"] === QA)?.["activarModulosNuevosDesde"]).toBeNull();
  });

  it("el detalle dice si la opción está encendida", async () => {
    const { ctx } = armar([]);
    const apagada = await executeCapability(ctx, "platform.tenants.get", { tenantId: QA });
    const encendida = await executeCapability(ctx, "platform.tenants.get", { tenantId: OTRA });
    expect(apagada).toMatchObject({ ok: true, data: { activarModulosNuevos: false } });
    expect(encendida).toMatchObject({ ok: true, data: { activarModulosNuevos: true } });
  });
});
