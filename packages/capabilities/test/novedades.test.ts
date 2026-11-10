import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const ok = <T>(r: { ok: boolean; data?: unknown }) => {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data as T;
};

describe("core.novedades", () => {
  it("lista entradas del catálogo con conteo de no leídas", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["core", "finanzas", "comercial", "cpq"] });
    const data = ok<{ items: { id: string }[]; noLeidas: number }>(
      await executeCapability(ctx, "core.novedades.list", {}),
    );
    expect(data.items.length).toBeGreaterThanOrEqual(5);
    expect(data.noLeidas).toBe(data.items.length);
  });

  it("marca como leídas y reduce el conteo", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["core", "finanzas", "comercial", "cpq"] });
    const antes = ok<{ items: { id: string }[] }>(
      await executeCapability(ctx, "core.novedades.list", {}),
    );
    const ids = antes.items.slice(0, 2).map((i) => i.id);
    ok(await executeCapability(ctx, "core.novedades.marcar_leidas", { ids }));
    const despues = ok<{ noLeidas: number }>(
      await executeCapability(ctx, "core.novedades.list", {}),
    );
    expect(despues.noLeidas).toBe(antes.items.length - 2);
  });

  it("marcar todas fija app.user_id en la transacción del tenant", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["core", "finanzas", "comercial", "cpq"] });
    if (ctx.actor.tipo !== "user") throw new Error("se esperaba un usuario");
    const usuarioId = ctx.actor.id;
    let usuarioFijado = false;
    const base = ctx.db;
    const tx = new Proxy(base, {
      has(target, prop) {
        if (prop === "$executeRaw") return true;
        if (prop === "$extends") return false;
        return prop in target;
      },
      get(target, prop, receiver) {
        if (prop === "$executeRaw") {
          return (partes: TemplateStringsArray, ...vals: unknown[]) => {
            if (partes.join("?").includes("app.user_id") && vals[0] === usuarioId)
              usuarioFijado = true;
            return Promise.resolve(0);
          };
        }
        if (prop !== "novedadLectura") return Reflect.get(target, prop, receiver);
        const real = Reflect.get(target, prop, receiver) as {
          findMany: (a: unknown) => Promise<unknown>;
          findFirst: (a: unknown) => Promise<unknown>;
          create: (a: unknown) => Promise<unknown>;
          update: (a: unknown) => Promise<unknown>;
        };
        const exigir = () => {
          if (!usuarioFijado) throw new Error("RLS");
        };
        return {
          findMany: (a: unknown) => (exigir(), real.findMany(a)),
          findFirst: (a: unknown) => (exigir(), real.findFirst(a)),
          create: (a: unknown) => (exigir(), real.create(a)),
          update: (a: unknown) => (exigir(), real.update(a)),
        };
      },
    });
    ctx.db = tx;
    ctx.transaccion = (fn) => fn(tx);
    ctx.enLectura = (fn) => fn(tx);

    const marcadas = ok<{ marcadas: number }>(
      await executeCapability(ctx, "core.novedades.marcar_todas", {}),
    );
    expect(marcadas.marcadas).toBeGreaterThan(0);
    expect(usuarioFijado).toBe(true);
    const despues = ok<{ noLeidas: number; items: { leida: boolean }[] }>(
      await executeCapability(ctx, "core.novedades.list", {}),
    );
    expect(despues.noLeidas).toBe(0);
    expect(despues.items.every((item) => item.leida)).toBe(true);
  });
});
