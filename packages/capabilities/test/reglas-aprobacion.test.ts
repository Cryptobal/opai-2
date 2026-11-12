// CAR-252 (decisión de Carlos del 12-nov-2026): reglas de aprobación por empresa. Una regla dice qué
// acción, desde qué monto y quién aprueba. Vale para personas y agentes; basta una aprobación; nadie
// aprueba lo propio salvo dueños y administradores, que aprueban todo.
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { defineCapability } from "../src/define";
import { executeCapability } from "../src/execute";
import { limpiarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import type { Contexto } from "../src/types";
import { semillaTenant, U2 } from "./semilla";

const U3 = "0192f3a0-0000-7000-8000-0000000000a3";
const REGLA = "0192f3a0-0000-7000-8000-0000000000d1";

const emitir = defineCapability({
  id: "core.prueba_dte.emitir",
  descripcion: "Emite un documento de prueba al SII (capacidad de prueba de reglas de aprobación).",
  permiso: null,
  input: z.object({ monto: z.number().int() }),
  output: z.object({ ok: z.boolean() }),
  efecto: "irreversible",
  dryRun: true,
  aprobable: { accion: "emitir_dte", monto: async (_ctx, i) => i.monto },
  async handler() {
    return { ok: true };
  },
});

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, emitir]);
});

function mundo() {
  const s = semillaTenant("gerente");
  const semilla = {
    ...s,
    user: [...s.user, { id: U3, name: "Ceci", email: "ceci@prueba.cl" }],
    membership: [
      ...s.membership,
      { id: "m3", tenantId: TENANT_DE_PRUEBA, userId: U3, rol: "viewer", portales: ["erp"], estado: "activa", createdAt: new Date(3) },
    ],
    reglaAprobacion: [
      { id: REGLA, tenantId: TENANT_DE_PRUEBA, accion: "emitir_dte", montoMinimo: 1_000_000n, aprobadorRol: "gerente", aprobadorGrupoId: null, activa: true },
    ],
  };
  const base = contextoDePrueba({ semilla });
  const como = (id: string, nombre: string, rol: "owner" | "gerente" | "viewer") => ({
    ...base.ctx,
    actor: { tipo: "user" as const, id },
    usuario: { ...USUARIO_DE_PRUEBA, id, nombre },
    rol,
    autorizar: contextoDePrueba({ rol }).ctx.autorizar,
  });
  return {
    tabla: base.tabla,
    ana: como(USUARIO_DE_PRUEBA.id, "Ana", "owner"),
    beto: como(U2, "Beto", "gerente"),
    ceci: como(U3, "Ceci", "viewer"),
  };
}

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
