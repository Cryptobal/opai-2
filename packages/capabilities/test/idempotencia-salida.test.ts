// CAR-162: la reserva de idempotencia no guarda el secreto de un solo uso (token de un enlace).
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { defineCapability, executeCapability, limpiarRegistro, registrarCapacidades } from "../src";
import { contextoDePrueba } from "../src/testing";

const TOKEN = "0123456789abcdef0123456789abcdef";
const enlace = defineCapability({
  id: "test.enlace.crear",
  descripcion: "Crea un enlace de prueba cuya URL lleva un token de un solo uso.",
  permiso: "test:write",
  input: z.object({ n: z.number().int() }),
  output: z.object({ url: z.string() }),
  salidaIdempotente: (s) => ({ url: s.url.replace(TOKEN, "[oculto]") }),
  efecto: "escritura",
  dryRun: true,
  async handler() {
    return { url: `https://x.test/p/emp/${TOKEN}` };
  },
});

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([enlace]);
});

describe("salida guardada en la idempotencia", () => {
  it("la primera respuesta lleva el token; la repetición con la misma clave no", async () => {
    const { ctx } = contextoDePrueba({ permisos: ["test:write"], modulosActivos: ["test"] });
    const op = { idempotencyKey: "k-enlace" };
    const a = await executeCapability(ctx, "test.enlace.crear", { n: 1 }, op);
    const b = await executeCapability(ctx, "test.enlace.crear", { n: 1 }, op);
    expect(a).toMatchObject({ ok: true, data: { url: `https://x.test/p/emp/${TOKEN}` } });
    expect(b).toMatchObject({ ok: true, repetida: true, data: { url: "https://x.test/p/emp/[oculto]" } });
  });

  it("la vista previa sigue devolviendo la URL de ejemplo sin reservar clave", async () => {
    const { ctx } = contextoDePrueba({ permisos: ["test:write"], modulosActivos: ["test"] });
    const r = await executeCapability(ctx, "test.enlace.crear", { n: 1 }, { dryRun: true, idempotencyKey: "k2" });
    expect(r).toMatchObject({ ok: true, dryRun: true });
  });
});
