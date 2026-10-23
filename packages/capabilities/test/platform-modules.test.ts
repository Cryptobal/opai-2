import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const modulo = (id: string, dependencias: string[] = []) =>
  defineModule({
    id,
    nombre: id.toUpperCase(),
    version: "0.1.0",
    dependencias,
    permisos: [],
    navegacion: [],
    configuracion: z.object({}),
    eventos: [],
    capacidades: [],
  });

const plataforma = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const set = (moduloId: string, estado: string) => ({
  tenantId: TENANT_DE_PRUEBA,
  moduloId,
  estado,
});

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([modulo("crm"), modulo("cpq", ["crm"])]);
});

describe("platform.modules.set", () => {
  it("valida dependencias al activar y al suspender", async () => {
    const { ctx, tabla, eventos } = contextoDePrueba({
      rol: null,
      usuario: plataforma,
      conTenant: false,
      semilla: semillaTenant(),
    });
    const sinCrm = await executeCapability(ctx, "platform.modules.set", set("cpq", "activo"));
    expect(sinCrm).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE", message: "Activa antes: crm." },
    });

    expect(await executeCapability(ctx, "platform.modules.set", set("crm", "trial"))).toMatchObject(
      { ok: true },
    );
    expect(
      await executeCapability(ctx, "platform.modules.set", set("cpq", "activo")),
    ).toMatchObject({ ok: true });
    const suspendeCrm = await executeCapability(
      ctx,
      "platform.modules.set",
      set("crm", "suspendido"),
    );
    expect(suspendeCrm.ok === false && suspendeCrm.error.message).toMatch(/CPQ/);
    expect(tabla("tenantModule")).toMatchObject([
      { moduloId: "crm", estado: "trial" },
      { moduloId: "cpq", estado: "activo" },
    ]);
    expect(eventos.every((e) => e.tenantId === TENANT_DE_PRUEBA)).toBe(true);
  });

  it("core no se toca y un módulo desconocido es NOT_FOUND", async () => {
    const { ctx } = contextoDePrueba({ rol: null, usuario: plataforma, conTenant: false });
    expect(
      await executeCapability(ctx, "platform.modules.set", set("core", "suspendido")),
    ).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(
      await executeCapability(ctx, "platform.modules.set", set("nada", "activo")),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("core.modules.list muestra los manifests con su estado en el tenant", async () => {
    const { ctx } = contextoDePrueba({
      rol: "viewer",
      semilla: {
        ...semillaTenant(),
        tenantModule: [{ tenantId: TENANT_DE_PRUEBA, moduloId: "crm", estado: "activo" }],
      },
    });
    expect(await executeCapability(ctx, "core.modules.list", {})).toMatchObject({
      ok: true,
      data: [
        { id: "crm", estado: "activo" },
        { id: "cpq", estado: null },
      ],
    });
  });
});
