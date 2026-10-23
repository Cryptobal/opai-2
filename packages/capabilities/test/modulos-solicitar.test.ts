import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";

const modulo = (id: string) =>
  defineModule({
    id,
    nombre: id.toUpperCase(),
    version: "1.0.0",
    dependencias: [],
    permisos: [],
    navegacion: [],
    configuracion: z.object({}),
    eventos: [],
    capacidades: [],
  });

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([modulo("remuneraciones")]);
});

describe("core.modules.solicitar (diseño 42)", () => {
  it("registra la solicitud como evento y en la auditoría", async () => {
    const { ctx, eventos, tabla } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.modules.solicitar", {
      moduloId: "remuneraciones",
      mensaje: "Queremos liquidaciones desde diciembre",
    });
    expect(r).toMatchObject({ ok: true, data: { estado: "solicitado", nombre: "REMUNERACIONES" } });
    expect(tabla("evento")).toEqual([
      expect.objectContaining({
        tipo: "core.modulo.solicitado",
        payload: expect.objectContaining({ moduloId: "remuneraciones" }),
      }),
    ]);
    expect(eventos.map((e) => e.capability)).toContain("core.modules.solicitar");
  });

  it("vista previa sin escribir; módulo inexistente y permiso", async () => {
    const { ctx, tabla } = contextoDePrueba();
    const previa = await executeCapability(
      ctx,
      "core.modules.solicitar",
      { moduloId: "remuneraciones" },
      { dryRun: true },
    );
    expect(previa.ok).toBe(true);
    expect(tabla("evento")).toEqual([]);
    const no = await executeCapability(ctx, "core.modules.solicitar", { moduloId: "nada" });
    expect(no).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const { ctx: sup } = contextoDePrueba({ rol: "supervisor" });
    const prohibido = await executeCapability(sup, "core.modules.solicitar", {
      moduloId: "remuneraciones",
    });
    expect(prohibido).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
