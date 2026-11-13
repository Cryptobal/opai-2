// CAR-252 (decisión de Carlos del 12-nov-2026): reglas de aprobación por empresa. Una regla dice qué
// acción, desde qué monto y quién aprueba. Vale para personas y agentes; basta una aprobación; nadie
// aprueba lo propio salvo dueños y administradores, que aprueban todo.
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src/execute";
import { USUARIO_DE_PRUEBA } from "../src/testing";
import type { Contexto } from "../src/types";
import { emitir, mundo, registrar, REGLA, U3 } from "./reglas-aprobacion-mundo";

beforeEach(registrar);

describe("reglas de aprobación (CAR-252)", () => {
  it("bajo el monto mínimo se ejecuta; desde el monto queda pendiente con su regla", async () => {
    const { ceci, tabla } = mundo();
    expect(await executeCapability(ceci, emitir.id, { monto: 500_000 })).toMatchObject({ ok: true });
    const r = await executeCapability(ceci, emitir.id, { monto: 2_000_000 });
    expect(r).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    expect(tabla("aprobacion")).toEqual([
      expect.objectContaining({ reglaId: REGLA, viaUserId: U3, apiKeyId: null, estado: "pendiente" }),
    ]);
  });

  it("la vista previa no pide aprobación", async () => {
    const { ceci, tabla } = mundo();
    const r = await executeCapability(ceci, emitir.id, { monto: 2_000_000 }, { dryRun: true });
    expect(r).toMatchObject({ ok: true });
    expect(tabla("aprobacion")).toHaveLength(0);
  });

  it("el aprobador de la regla la ve y la aprueba; la acción se ejecuta sin volver a pedir", async () => {
    const { ceci, beto, tabla } = mundo();
    await executeCapability(ceci, emitir.id, { monto: 2_000_000 });
    const lista = await executeCapability(beto, "core.aprobaciones.list", {});
    expect(lista).toMatchObject({ ok: true, data: [expect.objectContaining({ estado: "pendiente" })] });
    const id = String(tabla("aprobacion")[0]?.["id"]);
    const r = await executeCapability(beto, "core.aprobaciones.aprobar", { id });
    expect(r).toMatchObject({ ok: true, data: { estado: "aprobada", resultado: { ok: true } } });
    expect(tabla("aprobacion")).toHaveLength(1);
  });

  it("quien no es aprobador no la ve ni la resuelve", async () => {
    const { ceci, tabla } = mundo();
    await executeCapability(ceci, emitir.id, { monto: 2_000_000 });
    const id = String(tabla("aprobacion")[0]?.["id"]);
    expect(await executeCapability(ceci, "core.aprobaciones.list", {})).toMatchObject({ ok: true, data: [] });
    expect(await executeCapability(ceci, "core.aprobaciones.aprobar", { id })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("el aprobador no aprueba lo propio; el dueño sí aprueba todo", async () => {
    const { beto, ana, tabla } = mundo();
    await executeCapability(beto, emitir.id, { monto: 2_000_000 });
    const id = String(tabla("aprobacion")[0]?.["id"]);
    expect(await executeCapability(beto, "core.aprobaciones.aprobar", { id })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(await executeCapability(ana, "core.aprobaciones.aprobar", { id })).toMatchObject({
      ok: true,
      data: { estado: "aprobada" },
    });
  });

  it("guardar reglas: valida el aprobador y es solo para dueños y administradores", async () => {
    const { ana, ceci } = mundo();
    expect(
      await executeCapability(ana, "core.aprobaciones.reglas_guardar", {
        accion: "enviar_cotizacion",
        aprobadorRol: "gerente",
      }),
    ).toMatchObject({ ok: true, data: { accion: "enviar_cotizacion", montoMinimo: null, activa: true } });
    expect(
      await executeCapability(ana, "core.aprobaciones.reglas_guardar", { accion: "emitir_dte", aprobadorRol: "inventado" }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(
      await executeCapability(ceci, "core.aprobaciones.reglas_guardar", { accion: "emitir_dte", aprobadorRol: "gerente" }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("una regla desactivada deja de pedir aprobación", async () => {
    const { ana, ceci } = mundo();
    await executeCapability(ana, "core.aprobaciones.reglas_desactivar", { id: REGLA });
    expect(await executeCapability(ceci, emitir.id, { monto: 2_000_000 })).toMatchObject({ ok: true });
  });

  it("un agente con autonomía «directo» también queda pendiente si hay regla", async () => {
    const { ana, tabla } = mundo();
    const agente: Contexto = {
      ...ana,
      actor: { tipo: "agent", id: "k1", viaUserId: USUARIO_DE_PRUEBA.id },
      agente: { apiKeyId: "k1", nombre: "Grok", presupuestoMensualMicro: null, autonomia: { [emitir.id]: "directo" } },
    };
    const r = await executeCapability(agente, emitir.id, { monto: 2_000_000 });
    expect(r).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    expect(tabla("aprobacion")[0]).toMatchObject({ reglaId: REGLA, apiKeyId: "k1" });
  });
});
