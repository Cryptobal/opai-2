// CAR-38: asignar y quitar instalaciones a un supervisor por pantalla, API y MCP. Con una persona
// (sesión) se ejecuta directo; un agente llega por MCP y queda en aprobación humana (irreversible).
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { herramientasMcp } from "../src/mcp";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { type OpcionesPrueba } from "../src/testing/contexto";
import { M2, semillaTenant } from "./semilla";

const INST = "0192f3a0-0000-7000-8000-0000000000c1";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

function semilla() {
  return {
    ...semillaTenant("supervisor"),
    instalacion: [{ id: INST, tenantId: TENANT_DE_PRUEBA, nombre: "Planta Alfa", cuentaId: "c" }],
  };
}
const contexto = (o: Partial<OpcionesPrueba> = {}) =>
  contextoDePrueba({ usuario: USUARIO_DE_PRUEBA, semilla: semilla(), ...o });
const input = { membershipId: M2, instalacionIds: [INST] };
const agente = {
  actor: { tipo: "agent" as const, id: "k-1", viaUserId: USUARIO_DE_PRUEBA.id },
  agente: { apiKeyId: "k-1", nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} },
  scopes: ["*"],
  claveApi: { permisos: null, servicio: false },
};

describe("core.supervisores.asignar/quitar (CAR-38)", () => {
  it("una persona owner: preview no guarda; asignar y quitar escriben y auditan", async () => {
    const { ctx, tabla, eventos } = contexto();
    const vista = await executeCapability(ctx, "core.supervisores.asignar", input, {
      dryRun: true,
    });
    expect(vista).toMatchObject({
      ok: true,
      dryRun: true,
      data: { instalaciones: [{ id: INST }] },
    });
    expect(tabla("supervisorInstalacion")).toHaveLength(0);
    expect(await executeCapability(ctx, "core.supervisores.asignar", input)).toMatchObject({
      ok: true,
      data: { instalaciones: [{ id: INST, nombre: "Planta Alfa" }] },
    });
    expect(tabla("supervisorInstalacion")).toHaveLength(1);
    expect(await executeCapability(ctx, "core.supervisores.quitar", input)).toMatchObject({
      ok: true,
      data: { instalaciones: [] },
    });
    expect(tabla("supervisorInstalacion")).toHaveLength(0);
    expect(eventos.map((e) => e.capability)).toEqual([
      "core.supervisores.asignar",
      "core.supervisores.quitar",
    ]);
  });

  it("salen por MCP con su preview_ y un agente queda en aprobación humana sin escribir", async () => {
    const { ctx, tabla } = contexto(agente);
    const nombres = herramientasMcp(ctx).map((h) => h.nombre);
    for (const n of ["core_supervisores_asignar", "core_supervisores_quitar"]) {
      expect(nombres).toContain(n);
      expect(nombres).toContain(`preview_${n}`);
    }
    expect(nombres).toContain("core_supervisores_de_instalacion");
    const vista = await executeCapability(ctx, "core.supervisores.asignar", input, {
      dryRun: true,
    });
    expect(vista).toMatchObject({ ok: true, dryRun: true });
    for (const id of ["core.supervisores.asignar", "core.supervisores.quitar"]) {
      expect(await executeCapability(ctx, id, input)).toMatchObject({
        ok: false,
        error: { code: "APPROVAL_REQUIRED" },
      });
    }
    expect(tabla("supervisorInstalacion")).toHaveLength(0);
  });

  it("sin owner o admin no se fija el alcance: un gerente con permiso queda prohibido", async () => {
    const { ctx, tabla } = contexto({ rol: "gerente", permisosRol: ["core:users.manage"] });
    expect(await executeCapability(ctx, "core.supervisores.asignar", input)).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(tabla("supervisorInstalacion")).toHaveLength(0);
  });
});
