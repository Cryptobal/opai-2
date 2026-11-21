import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT } from "@opai/domain";

import { capacidadesDelNucleo } from "../src/core";
import { modulosConEstado } from "../src/core/consultas";
import { executeCapability } from "../src/execute";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const modulo = (id: string) =>
  defineModule({
    id,
    nombre: id.toUpperCase(),
    version: "0.1.0",
    dependencias: [],
    permisos: [],
    navegacion: [],
    configuracion: z.object({}),
    eventos: [],
    capacidades: [],
  });

const plataforma = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([modulo("nomina")]);
});

describe("platform.modules.set · complementos (CAR-742)", () => {
  it("activa un complemento y lo suspende en cascada con el padre", async () => {
    const { ctx, tabla } = contextoDePrueba({
      rol: null,
      usuario: plataforma,
      conTenant: false,
      semilla: {
        ...semillaTenant(),
        tenantModule: [{ tenantId: TENANT_DE_PRUEBA, moduloId: "nomina", estado: "activo" }],
      },
    });
    expect(
      await executeCapability(ctx, "platform.modules.set", {
        tenantId: TENANT_DE_PRUEBA,
        moduloId: COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT,
        estado: "activo",
      }),
    ).toMatchObject({ ok: true });
    expect(tabla("tenantModule")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduloId: COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT,
          estado: "activo",
        }),
      ]),
    );
    expect(
      await executeCapability(ctx, "platform.modules.set", {
        tenantId: TENANT_DE_PRUEBA,
        moduloId: "nomina",
        estado: "suspendido",
      }),
    ).toMatchObject({ ok: true });
    expect(tabla("tenantModule")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduloId: COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT,
          estado: "suspendido",
        }),
      ]),
    );
  });

  it("rechaza activación sin el padre contratado", async () => {
    const { ctx } = contextoDePrueba({ rol: null, usuario: plataforma, conTenant: false });
    expect(
      await executeCapability(ctx, "platform.modules.set", {
        tenantId: TENANT_DE_PRUEBA,
        moduloId: COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT,
        estado: "activo",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE", message: expect.stringMatching(/Remuneraciones/i) },
    });
  });

  it("modulosConEstado anida el complemento bajo su padre", () => {
    const filas = modulosConEstado([
      { moduloId: "nomina", estado: "activo" },
      { moduloId: COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT, estado: "trial" },
    ]);
    const idxNomina = filas.findIndex((m) => m.id === "nomina");
    const idxDt = filas.findIndex((m) => m.id === COMPLEMENTO_NOMINA_CUMPLIMIENTO_DT);
    expect(idxDt).toBe(idxNomina + 1);
    expect(filas[idxDt]).toMatchObject({
      complemento: true,
      padreId: "nomina",
      etiquetaCobro: "Pagado",
    });
  });
});