// CAR-323 (D.5, decisión de Carlos del 12-nov-2026): con el módulo en solo lectura, lo que llega desde
// fuera (webhook de banco, correo) se sigue registrando, pero no dispara acciones (sin eventos). Una
// escritura normal del mismo módulo se rechaza, igual que siempre.
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { defineCapability } from "../src/define";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";

const capacidad = (id: string, entrante: boolean) =>
  defineCapability({
    id,
    descripcion: "Registra algo que llega desde fuera (prueba de solo lectura entrante).",
    permiso: null,
    interna: true,
    ...(entrante ? { entrante: true } : {}),
    input: z.object({}),
    output: z.object({ ok: z.boolean() }),
    efecto: "escritura",
    dryRun: true,
    async handler(ctx) {
      await ctx.transaccion(async (tx) => {
        await ctx.eventos.emitir(tx, { tipo: `${id}.recibido`, payload: {} });
      });
      return { ok: true };
    },
  });

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([capacidad("crm.banco.recibir", true), capacidad("crm.banco.crear", false)]);
});

const contexto = (soloLectura: string[]) =>
  contextoDePrueba({
    actor: { tipo: "system" },
    rol: null,
    modulosActivos: ["crm"],
    modulosSoloLectura: soloLectura,
  });

describe("solo lectura y lo entrante", () => {
  it("con el módulo activo, lo entrante registra y emite su evento", async () => {
    const { ctx, tabla } = contexto([]);
    expect(await executeCapability(ctx, "crm.banco.recibir", {})).toMatchObject({ ok: true });
    expect(tabla("evento").map((e) => e["tipo"])).toEqual(["crm.banco.recibir.recibido"]);
  });

  it("en solo lectura, lo entrante registra pero no emite eventos (sin acciones)", async () => {
    const { ctx, tabla } = contexto(["crm"]);
    expect(await executeCapability(ctx, "crm.banco.recibir", {})).toMatchObject({ ok: true });
    expect(tabla("evento")).toHaveLength(0);
  });

  it("en solo lectura, una escritura que no es entrante se rechaza", async () => {
    const { ctx } = contexto(["crm"]);
    expect(await executeCapability(ctx, "crm.banco.crear", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", message: expect.stringContaining("solo lectura") },
    });
  });
});
