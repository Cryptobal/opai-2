import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { defineCapability } from "../src/define";
import { executeCapability } from "../src/execute";
import { manejarCapacidadHttp } from "../src/http";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";

const crearNota = defineCapability({
  id: "test.nota.create",
  descripcion: "Crea una nota (prueba).",
  permiso: "test:write",
  input: z.object({ texto: z.string().min(1) }),
  output: z.object({ texto: z.string() }),
  efecto: "escritura",
  dryRun: true,
  handler: async (_ctx, input) => ({ texto: input.texto }),
});

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([...capacidadesDelNucleo, crearNota]);
});

const fabrica = async () =>
  contextoDePrueba({ permisos: ["test:write"], modulosActivos: ["test"] }).ctx;

describe("manejarCapacidadHttp", () => {
  it("GET /api/v1/core/ping responde 200", async () => {
    const req = new Request("http://x/api/v1/core/ping?input=%7B%22mensaje%22%3A%22hi%22%7D");
    const res = await manejarCapacidadHttp(req, ["core", "ping"], fabrica);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, data: { mensaje: "hi" } });
  });

  it("GET no se permite para escrituras; POST sí, con dry_run", async () => {
    const get = await manejarCapacidadHttp(
      new Request("http://x/api/v1/test/nota/create"),
      ["test", "nota", "create"],
      fabrica,
    );
    expect(get.status).toBe(405);
    const post = new Request("http://x/api/v1/test/nota/create", {
      method: "POST",
      body: JSON.stringify({ input: { texto: "hola" }, dry_run: true }),
    });
    const res = await manejarCapacidadHttp(post, ["test", "nota", "create"], fabrica);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, dryRun: true });
  });

  it("mapea errores a códigos HTTP y oculta las capacidades internas", async () => {
    const r404 = await manejarCapacidadHttp(
      new Request("http://x/api/v1/core/nada"),
      ["core", "nada"],
      fabrica,
    );
    const r400 = await manejarCapacidadHttp(
      new Request("http://x/api/v1/core/ping?input=%7B%22mensaje%22%3A1%7D"),
      ["core", "ping"],
      fabrica,
    );
    const interna = await manejarCapacidadHttp(
      new Request("http://x/api/v1/core/invitations/peek"),
      ["core", "invitations", "peek"],
      fabrica,
    );
    expect([r404.status, r400.status, interna.status]).toEqual([404, 400, 404]);
  });
});

describe("telemetría", () => {
  it("una telemetría que falla no rompe la ejecución", async () => {
    const { ctx } = contextoDePrueba();
    ctx.telemetria = { registrar: async () => Promise.reject(new Error("caída")) };
    expect(await executeCapability(ctx, "core.ping", {})).toMatchObject({ ok: true });
  });
});
