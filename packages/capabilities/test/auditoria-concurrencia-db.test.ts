import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as lotes from "../../db/src/auditoria-lotes";
import type * as Capacidades from "../src";

describe.skipIf(!urlPropietario)("verificación incremental sin bloquear append", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  async function contexto() {
    const { id: tenantId } = await e.admin.tenant.create({
      data: { slug: `aud-conc-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
    });
    return mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner" });
  }
  const escribir = (ctx: Capacidades.Contexto, nombre: string) =>
    mod.executeCapability(ctx, "core.cuentas.create", { nombre });

  it("append termina mientras la foto está detenida; verifica solo hasta el max inicial", async () => {
    const ctx = await contexto();
    expect(await escribir(ctx, "Una")).toMatchObject({ ok: true });
    let entrar!: () => void;
    let liberar!: () => void;
    const dentro = new Promise<void>((r) => {
      entrar = r;
    });
    const continuar = new Promise<void>((r) => {
      liberar = r;
    });
    const original = lotes.loteAuditoria;
    const espia = vi.spyOn(lotes, "loteAuditoria").mockImplementation(async (...args) => {
      const filas = await original(...args);
      entrar();
      await continuar;
      return filas;
    });
    const verificacion = ctx.auditoria.verificar();
    try {
      await dentro;
      // Timeout independiente: con el lock antiguo esta escritura NO puede terminar.
      const resultado = await Promise.race([
        escribir(ctx, "Concurrente"),
        new Promise<never>((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Append bloqueado por verificación")),
            2000,
          );
          timer.unref();
        }),
      ]);
      expect(resultado).toMatchObject({ ok: true });
    } finally {
      liberar();
      espia.mockRestore();
    }
    expect(await verificacion).toMatchObject({ ok: true, ultimoSeq: 1 });
    expect(await ctx.auditoria.verificar()).toMatchObject({ ok: true, ultimoSeq: 2 });
  });

  it("revisa solo la cola nueva, pero detecta alteración antigua y truncado repetido", async () => {
    const ctx = await contexto();
    await escribir(ctx, "Una");
    await escribir(ctx, "Dos");
    expect(await ctx.auditoria.verificar()).toMatchObject({ ok: true, ultimoSeq: 2 });
    const espia = vi.spyOn(lotes, "loteAuditoria");
    try {
      expect(await ctx.auditoria.verificar()).toMatchObject({ ok: true, ultimoSeq: 2 });
      expect(espia).not.toHaveBeenCalled();
      await escribir(ctx, "Tres");
      expect(await ctx.auditoria.verificar()).toMatchObject({ ok: true, ultimoSeq: 3 });
      expect(espia.mock.calls.map((args) => args.slice(2))).toEqual([[3, 3]]);
      const fila = await e.admin.auditEvent.findFirstOrThrow({
        where: { tenantId: ctx.tenantId, seq: 1 },
      });
      await e.admin.auditEvent.update({ where: { id: fila.id }, data: { capability: "alterada" } });
      expect(await ctx.auditoria.verificar()).toMatchObject({ ok: false, primeraRota: 1 });
      await e.admin.auditEvent.update({
        where: { id: fila.id },
        data: { capability: fila.capability },
      });
      expect(await ctx.auditoria.verificar()).toMatchObject({ ok: true });
      await e.admin.auditEvent.deleteMany({ where: { tenantId: ctx.tenantId, seq: 3 } });
      for (let n = 0; n < 2; n++)
        expect(await ctx.auditoria.verificar()).toMatchObject({ ok: false, primeraRota: 3 });
    } finally {
      espia.mockRestore();
    }
  });

  it("el verificador ya no es una capacidad pública", async () => {
    const ctx = await contexto();
    expect(await mod.executeCapability(ctx, "core.auditoria.verificar", {})).toMatchObject({
      ok: false,
    });
  });

  it("CAS rechaza una foto obsoleta de dos verificadores simultáneos", async () => {
    const ctx = await contexto();
    await escribir(ctx, "Una");
    let liberar!: () => void;
    const barrera = new Promise<void>((r) => {
      liberar = r;
    });
    let llegadas = 0;
    const original = lotes.loteAuditoria;
    const espia = vi.spyOn(lotes, "loteAuditoria").mockImplementation(async (...args) => {
      const filas = await original(...args);
      if (++llegadas === 2) liberar();
      await barrera;
      return filas;
    });
    try {
      const resultados = await Promise.allSettled([
        ctx.auditoria.verificar(),
        ctx.auditoria.verificar(),
      ]);
      expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(resultados.filter((r) => r.status === "rejected")).toHaveLength(1);
      expect(
        await e.admin.auditoriaCabeza.findUnique({ where: { tenantId: ctx.tenantId } }),
      ).toMatchObject({ revision: 1, verificacionOk: true, ultimoSeq: 1 });
    } finally {
      liberar();
      espia.mockRestore();
    }
  });
});
