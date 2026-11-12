import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as lotes from "../../db/src/auditoria-lotes";
import { trabajoVerificarAuditoria } from "../src/core/auditoria";
import { ejecutarTrabajos, type ColaTrabajos } from "../src/trabajos/runner";
import { limpiarTrabajos, registrarTrabajos } from "../src/trabajos/registro";
import type * as Capacidades from "../src";

describe.skipIf(!urlPropietario)("cancelación de auditoría desde el runner", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    limpiarTrabajos();
    registrarTrabajos([trabajoVerificarAuditoria]);
  });
  afterAll(async () => {
    limpiarTrabajos();
    await e?.cerrar();
  });
  async function contexto() {
    const { id: tenantId } = await e.admin.tenant.create({
      data: { slug: `aud-timeout-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
    });
    return mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner" });
  }
  const cola = (): ColaTrabajos => ({
    reclamar: vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "trabajo",
          tipo: trabajoVerificarAuditoria.tipo,
          payload: { dia: "2026-10-27" },
          intentos: 1,
          maxIntentos: 3,
        },
      ])
      .mockResolvedValue([]),
    completar: vi.fn(),
    fallar: vi.fn(),
    devolver: vi.fn(),
  });
  function barrera() {
    let resolver!: () => void;
    const promesa = new Promise<void>((r) => {
      resolver = r;
    });
    return { promesa, resolver };
  }

  it("no publica cabeza ni alerta después de vencer durante el recorrido", async () => {
    const ctx = await contexto();
    await mod.executeCapability(ctx, "core.cuentas.create", { nombre: "Una" });
    const dentro = barrera();
    const continuar = barrera();
    const original = lotes.loteAuditoria;
    const espia = vi.spyOn(lotes, "loteAuditoria").mockImplementation(async (...args) => {
      const filas = await original(...args);
      dentro.resolver();
      await continuar.promesa;
      return filas;
    });
    const verificar = ctx.auditoria.verificar;
    let ejecucion: ReturnType<typeof verificar> | undefined;
    ctx.auditoria.verificar = (signal) => (ejecucion = verificar(signal));
    const c = cola();
    const runner = ejecutarTrabajos(ctx, c, { timeoutMs: 200 });
    try {
      await dentro.promesa;
      expect(await runner).toMatchObject({ fallidos: 1, hechos: 0 });
      continuar.resolver();
      await expect(ejecucion).rejects.toThrow("Excedió");
      expect(
        await e.admin.auditoriaCabeza.findUnique({ where: { tenantId: ctx.tenantId } }),
      ).toBeNull();
      expect(
        await e.admin.evento.count({
          where: { tenantId: ctx.tenantId, tipo: "core.auditoria.rota" },
        }),
      ).toBe(0);
      expect(c.completar).not.toHaveBeenCalled();
    } finally {
      continuar.resolver();
      espia.mockRestore();
    }
  });

  it("revierte una alerta en curso si el runner vence antes de su commit", async () => {
    const ctx = await contexto();
    ctx.auditoria.verificar = async () => ({ ok: false, ultimoSeq: 0, primeraRota: 1 });
    const dentro = barrera();
    const continuar = barrera();
    const terminada = barrera();
    const emitir = ctx.eventos.emitir;
    ctx.eventos.emitir = async (...args) => {
      const resultado = await emitir(...args);
      dentro.resolver();
      await continuar.promesa;
      return resultado;
    };
    const transaccion = ctx.transaccion;
    ctx.transaccion = async (fn) => {
      try {
        return await transaccion(fn);
      } finally {
        terminada.resolver();
      }
    };
    const c = cola();
    const runner = ejecutarTrabajos(ctx, c, { timeoutMs: 200 });
    try {
      await dentro.promesa;
      expect(await runner).toMatchObject({ fallidos: 1, hechos: 0 });
      continuar.resolver();
      await terminada.promesa;
      expect(
        await e.admin.evento.count({
          where: { tenantId: ctx.tenantId, tipo: "core.auditoria.rota" },
        }),
      ).toBe(0);
      expect(c.completar).not.toHaveBeenCalled();
    } finally {
      continuar.resolver();
    }
  });
});
