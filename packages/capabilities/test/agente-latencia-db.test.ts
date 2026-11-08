import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Capacidades from "../src";
const { conversar, elegir } = vi.hoisted(() => ({ conversar: vi.fn(), elegir: vi.fn() }));
vi.mock("@opai/capabilities", async (original) => ({
  ...(await original<typeof Capacidades>()),
  iaElegidaDelAgente: elegir,
}));
import { executeCapability, limpiarModulos, registrarModulos } from "../src";
import { prepararEntorno, urlPropietario, type Entorno } from "../../db/test/entorno";
import { manifest } from "../../../modules/agente/manifest";
import { crearFixture, conFalloAuditoria, cap, respuesta } from "./agente-latencia-fixture";
describe.skipIf(!urlPropietario)("agente: latencia y revalidación con DB real", () => {
  let e: Entorno;
  beforeAll(async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw Error("HTTP prohibido en fixture");
      }),
    );
    vi.stubEnv("BETTER_AUTH_SECRET", randomUUID() + randomUUID());
    vi.stubEnv("DATABASE_TX_TIMEOUT_MS", "15000");
    e = await prepararEntorno();
    limpiarModulos();
    registrarModulos([manifest]);
  }, 120_000);
  beforeEach(() => {
    conversar.mockReset().mockResolvedValue(respuesta);
    elegir.mockReset().mockResolvedValue({ conversar });
  });
  afterAll(async () => {
    await e?.cerrar();
    limpiarModulos();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("proveedor >16s tiene éxito; repetición idempotente en contexto nuevo no llama IA", async () => {
    const f = await crearFixture(e);
    const key = randomUUID();
    conversar.mockImplementation(async () => {
      await new Promise<void>((r) => setTimeout(r, 16100));
      return respuesta;
    });
    const inicio = Date.now();
    const r = await executeCapability(await f.contexto(), cap, f.input, { idempotencyKey: key });
    expect(r).toMatchObject({ ok: true, data: { texto: respuesta.texto } });
    expect(Date.now() - inicio).toBeGreaterThan(16000);
    const r2 = await executeCapability(await f.contexto(), cap, f.input, { idempotencyKey: key });
    expect(r2).toEqual({ ...r, repetida: true });
    expect(conversar).toHaveBeenCalledOnce();
    expect(elegir).toHaveBeenCalledOnce();
    expect(await f.counts()).toEqual({ conversaciones: 1, auditorias: 1 });
    expect(await f.consumos()).toMatchObject([{ ok: true, cantidad: 1 }]);
    expect(fetch).not.toHaveBeenCalled();
  }, 30_000);
  it.each(["membresia", "permiso", "tenant"])(
    "revocación real de %s durante IA falla sin historial/salida firmada y retiene consumo",
    async (tipo) => {
      const f = await crearFixture(e);
      const ctx = await f.contexto();
      conversar.mockImplementation(async () => {
        if (tipo === "membresia")
          await e.admin.membership.update({
            where: { id: f.m.id },
            data: { estado: "suspendida" },
          });
        if (tipo === "tenant")
          await e.admin.tenant.update({ where: { id: f.t.id }, data: { estado: "suspendido" } });
        if (tipo === "permiso")
          await e.admin.permisoExcepcion.create({
            data: {
              tenantId: f.t.id,
              membershipId: f.m.id,
              permiso: "agente:usar",
              conceder: false,
            },
          });
        return respuesta;
      });
      const r = await executeCapability(ctx, cap, f.input, { idempotencyKey: randomUUID() });
      expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect(r).not.toHaveProperty("data");
      expect(await f.counts()).toEqual({ conversaciones: 0, auditorias: 0 });
      expect(await f.consumos()).toMatchObject([{ ok: true, cantidad: 1 }]);
      expect(conversar).toHaveBeenCalledOnce();
    },
  );
  it("revocación DB en quinta revalidación (después de guardar) revierte la transacción", async () => {
    const f = await crearFixture(e);
    const ctx = await f.contexto();
    const validar = ctx.revalidarAccesoSolicitud!;
    let validaciones = 0;
    ctx.revalidarAccesoSolicitud = async () => {
      if (++validaciones === 5)
        await e.admin.membership.update({ where: { id: f.m.id }, data: { estado: "suspendida" } });
      return validar();
    };
    const r = await executeCapability(ctx, cap, f.input, { idempotencyKey: randomUUID() });
    expect(validaciones).toBe(5);
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(r).not.toHaveProperty("data");
    expect(await f.counts()).toEqual({ conversaciones: 0, auditorias: 0 });
    expect(await f.consumos()).toMatchObject([{ ok: true, cantidad: 1 }]);
  });
  it("presupuesto real agotado bloquea IA y no guarda", async () => {
    const f = await crearFixture(e);
    const now = new Date();
    await e.admin.ajuste.create({
      data: {
        tenantId: f.t.id,
        ambito: "tenant",
        sujetoId: f.t.id,
        modulo: "agente",
        clave: "presupuestoMensualMicro",
        valor: "1",
      },
    });
    await e.admin.gastoAgenteMes.create({
      data: {
        tenantId: f.t.id,
        agenteInternoId: "agente-interno",
        periodo: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        topeMicro: 1n,
        gastadoMicro: 1n,
      },
    });
    const r = await executeCapability(await f.contexto(), cap, f.input, {
      idempotencyKey: randomUUID(),
    });
    expect(r).toMatchObject({ ok: false, error: { code: "BUDGET_EXCEEDED" } });
    expect(conversar).not.toHaveBeenCalled();
    expect(await f.counts()).toEqual({ conversaciones: 0, auditorias: 0 });
    expect(await f.consumos()).toEqual([]);
  });
  it("fallo real de auditoría revierte historial conservando consumo", async () => {
    const f = await crearFixture(e);
    await conFalloAuditoria(e, f.t.id, async () => {
      expect(await executeCapability(await f.contexto(), cap, f.input)).toMatchObject({
        ok: false,
      });
      expect(await f.counts()).toEqual({ conversaciones: 0, auditorias: 0 });
      expect(await f.consumos()).toMatchObject([{ ok: true, cantidad: 1 }]);
    });
  });
});
