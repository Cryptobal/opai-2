// CAR-252 · seguridad de las reglas de aprobación: un aprobador de regla no gana acceso a las
// solicitudes de agentes sin regla, la regla se vuelve a evaluar al aprobar, y rechazar y consultar
// siguen el mismo criterio que aprobar.
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src/execute";
import { TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { emitir, mundo, registrar, REGLA } from "./reglas-aprobacion-mundo";

beforeEach(registrar);

const pedir = async (m: ReturnType<typeof mundo>, monto = 2_000_000) => {
  await executeCapability(m.ceci, emitir.id, { monto });
  return String(m.tabla("aprobacion").at(-1)?.["id"]);
};

describe("reglas de aprobación · seguridad (CAR-252)", () => {
  it("un aprobador de regla no ve ni resuelve la solicitud de un agente sin regla", async () => {
    const m = mundo();
    const id = "0192f3a0-0000-7000-8000-0000000000e1";
    m.tabla("aprobacion").push({
      id, tenantId: TENANT_DE_PRUEBA, apiKeyId: "k1", agenteInternoId: null, reglaId: null,
      viaUserId: USUARIO_DE_PRUEBA.id, capability: emitir.id, input: { monto: 1 }, resumen: "x",
      estado: "pendiente", venceEn: new Date(Date.now() + 3_600_000), createdAt: new Date(),
    });
    expect(await executeCapability(m.beto, "core.aprobaciones.list", {})).toMatchObject({ ok: true, data: [] });
    expect(await executeCapability(m.beto, "core.aprobaciones.get", { id })).toMatchObject({
      ok: false, error: { code: "NOT_FOUND" },
    });
    for (const [cap, extra] of [["aprobar", {}], ["rechazar", { motivo: "no corresponde" }]] as const)
      expect(await executeCapability(m.beto, `core.aprobaciones.${cap}`, { id, ...extra })).toMatchObject({
        ok: false, error: { code: "FORBIDDEN" },
      });
    expect(await executeCapability(m.ana, "core.aprobaciones.aprobar", { id })).toMatchObject({ ok: true });
  });

  it("si la regla vigente cambió desde que se pidió, el aprobador de la regla vieja no basta", async () => {
    const m = mundo();
    const id = await pedir(m);
    // Aparece una regla más exigente para ese monto (equivale a que el monto subió tras pedir).
    m.tabla("reglaAprobacion").push({
      id: "0192f3a0-0000-7000-8000-0000000000d2", tenantId: TENANT_DE_PRUEBA, accion: "emitir_dte",
      montoMinimo: 1_500_000n, aprobadorRol: "admin", aprobadorGrupoId: null, activa: true,
    });
    expect(await executeCapability(m.beto, "core.aprobaciones.aprobar", { id })).toMatchObject({
      ok: false, error: { code: "CONFLICT" },
    });
    expect(m.tabla("aprobacion")[0]).toMatchObject({ estado: "pendiente", reglaId: REGLA });
    expect(await executeCapability(m.ana, "core.aprobaciones.aprobar", { id })).toMatchObject({
      ok: true, data: { estado: "aprobada" },
    });
  });

  it("rechazar: el aprobador sí, un tercero no", async () => {
    const m = mundo();
    const id = await pedir(m);
    expect(await executeCapability(m.ceci, "core.aprobaciones.rechazar", { id, motivo: "no va" })).toMatchObject({
      ok: false, error: { code: "FORBIDDEN" },
    });
    expect(await executeCapability(m.beto, "core.aprobaciones.rechazar", { id, motivo: "no va" })).toMatchObject({
      ok: true, data: { estado: "rechazada" },
    });
  });

  it("consultar: la ven quien la pidió y el aprobador; un aprobador con alcance por filas, no", async () => {
    const m = mundo();
    const id = await pedir(m);
    for (const quien of [m.ceci, m.beto])
      expect(await executeCapability(quien, "core.aprobaciones.get", { id })).toMatchObject({ ok: true });
    const acotado = { ...m.beto, alcance: { instalaciones: [] } } as typeof m.beto;
    expect(await executeCapability(acotado, "core.aprobaciones.aprobar", { id })).toMatchObject({
      ok: false, error: { code: "FORBIDDEN" },
    });
  });

  it("sin reglas en la empresa, nadie sin el permiso ve la cola", async () => {
    const m = mundo();
    m.tabla("reglaAprobacion").length = 0;
    expect(await executeCapability(m.beto, "core.aprobaciones.list", {})).toMatchObject({ ok: true, data: [] });
  });
});
