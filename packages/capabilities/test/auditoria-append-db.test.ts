import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { agregarAAuditoria, enTransaccion } from "@opai/db";
import { registrarObservadorConsultas } from "../../db/src/metricas";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Mod from "../src";
import { sembrarLecturas, type FixtureLecturas } from "./lecturas-sensibles-fixture";
import { esperarLockAuditoria } from "./auditoria-esperar-lock";

describe.skipIf(!urlPropietario)("append de una sentencia con snapshot tras el lock", () => {
  let e: Entorno, mod: typeof Mod, f: FixtureLecturas;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    f = await sembrarLecturas(e);
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  const contexto = () =>
    mod.crearContexto({
      tenantId: f.tenantId,
      actor: { tipo: "user", id: f.userId },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });

  it("excepciones no insertan; abrir el resultado sí audita, pendientes no revela correos", async () => {
    const antes = await e.admin.auditEvent.count({ where: { tenantId: f.tenantId } });
    for (const [id, input] of [
      ["core.buscar", { q: "Lectura" }],
      ["core.notificaciones.list", {}],
      ["core.inicio.pendientes", {}],
    ] as const) {
      const r = await mod.executeCapability(contexto(), id, input);
      expect(r.ok, JSON.stringify(r)).toBe(true);
      if (id === "core.inicio.pendientes") expect(JSON.stringify(r)).not.toMatch(/@|NO COPIAR/);
    }
    expect(await e.admin.auditEvent.count({ where: { tenantId: f.tenantId } })).toBe(antes);
    expect(
      await mod.executeCapability(contexto(), "core.personas.get", { id: f.personaId }),
    ).toMatchObject({ ok: true });
    expect(await e.admin.auditEvent.findFirst({ where: { tenantId: f.tenantId } })).toMatchObject({
      capability: "core.personas.get",
      payload: { ids: [f.personaId] },
    });
  });

  it("mezcla lecturas y escrituras concurrentes sin huecos ni hashes rotos", async () => {
    const ctx = contexto();
    const resultados = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        i % 2
          ? mod.executeCapability(ctx, "core.personas.get", { id: f.personaId })
          : mod.executeCapability(ctx, "core.cuentas.create", { nombre: `Concurrente ${i}` }),
      ),
    );
    for (const r of resultados) expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
    expect(await ctx.auditoria.verificar()).toMatchObject({ ok: true, ultimoSeq: 13 });
  });

  it("esperar una transacción que hizo append no usa su snapshot anterior al lock", async () => {
    let avisar!: () => void, liberar!: () => void;
    const dentro = new Promise<void>((r) => {
      avisar = r;
    });
    const continuar = new Promise<void>((r) => {
      liberar = r;
    });
    const hecho = {
      actorTipo: "system",
      actorId: null,
      viaUserId: null,
      capability: "prueba.append",
      entityType: null,
      entityId: null,
      payload: { n: 1 },
    };
    const primera = enTransaccion(f.tenantId, async (tx) => {
      await agregarAAuditoria(tx, f.tenantId, hecho);
      avisar();
      await continuar;
    });
    await dentro;
    let informarPid!: (pid: number) => void;
    const pidListo = new Promise<number>((r) => {
      informarPid = r;
    });
    const segunda = enTransaccion(f.tenantId, async (tx) => {
      const [fila] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
      informarPid(fila!.pid);
      return agregarAAuditoria(tx, f.tenantId, hecho);
    });
    try {
      await esperarLockAuditoria(f.tenantId, await pidListo);
    } finally {
      liberar();
    }
    await Promise.all([primera, segunda]);
    expect(await contexto().auditoria.verificar()).toMatchObject({ ok: true, ultimoSeq: 15 });
  });

  it("la función invocadora rechaza otro tenant y no concede UPDATE/DELETE", async () => {
    await expect(
      enTransaccion(f.tenantId, (tx) =>
        agregarAAuditoria(tx, randomUUID(), {
          actorTipo: "system",
          actorId: null,
          viaUserId: null,
          capability: "prueba.ajena",
          entityType: null,
          entityId: null,
          payload: null,
        }),
      ),
    ).rejects.toThrow();
    await expect(enTransaccion(f.tenantId, (tx) => tx.auditEvent.deleteMany({}))).rejects.toThrow();
    await expect(
      enTransaccion(f.tenantId, (tx) => tx.auditEvent.updateMany({ data: { capability: "otra" } })),
    ).rejects.toThrow();
  });

  it("el append SQL cuenta exactamente una consulta de negocio en ADR-045", async () => {
    let consultas = 0;
    registrarObservadorConsultas(() => {
      consultas++;
    });
    try {
      await enTransaccion(f.tenantId, (tx) =>
        agregarAAuditoria(tx, f.tenantId, {
          actorTipo: "system",
          actorId: null,
          viaUserId: null,
          capability: "prueba.contada",
          entityType: null,
          entityId: null,
          payload: null,
        }),
      );
      expect(consultas).toBe(1);
    } finally {
      registrarObservadorConsultas(null);
    }
  });
});
