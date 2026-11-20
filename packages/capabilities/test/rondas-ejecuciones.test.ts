import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  capacidadesRondas,
  executeCapability,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { TENANT_DE_PRUEBA, contextoDePrueba } from "../src/testing";
import { semillaTenant } from "./semilla";

const INST = "0192f3a0-0000-7000-8000-00000000c101";
const INST2 = "0192f3a0-0000-7000-8000-00000000c102";

function semilla() {
  return {
    ...semillaTenant(),
    instalacion: [
      { id: INST, tenantId: TENANT_DE_PRUEBA, nombre: "Planta Quilicura" },
      { id: INST2, tenantId: TENANT_DE_PRUEBA, nombre: "Bodega Lampa" },
    ],
  };
}

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesRondas]);
});

describe("rondas.ejecuciones.listar", () => {
  it("sin permiso devuelve FORBIDDEN", async () => {
    const { ctx } = contextoDePrueba({ permisos: [], portal: "erp", modulosActivos: ["rondas"], semilla: semilla() });
    const r = await executeCapability(ctx, "rondas.ejecuciones.listar", {});
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("supervisor fuera del alcance no ve otra instalación", async () => {
    const { ctx } = contextoDePrueba({
      permisos: ["rondas:read"],
      portal: "erp",
      modulosActivos: ["rondas"],
      alcance: { instalaciones: [INST] },
      semilla: semilla(),
    });
    const r = await executeCapability(ctx, "rondas.ejecuciones.listar", { instalacionId: INST2 });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});