import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { TenantDb } from "@opai/db";

import { capacidadesDelNucleo } from "../src/core/ping";
import { defineCapability } from "../src/define";
import { executeCapability } from "../src/execute";
import { manejarCapacidadHttp } from "../src/http";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import type { Contexto, EventoAuditoria } from "../src/types";

const TENANT = "0192f3a0-0000-7000-8000-000000000001";

function contextoFalso(permisos: string[] = []): Contexto & { eventos: EventoAuditoria[] } {
  const eventos: EventoAuditoria[] = [];
  return {
    tenantId: TENANT,
    actor: { tipo: "agent", id: "grokbot", viaUserId: "carlos" },
    db: {} as TenantDb,
    auditoria: {
      async registrar(evento) {
        eventos.push(evento);
      },
    },
    autorizar: (permiso) => permisos.includes(permiso),
    eventos,
  };
}

const crearNota = defineCapability({
  id: "test.nota.create",
  descripcion: "Crea una nota (prueba).",
  permiso: "test:write",
  input: z.object({ texto: z.string().min(1) }),
  output: z.object({ id: z.string(), texto: z.string() }),
  efecto: "escritura",
  dryRun: true,
  handler: vi.fn(async (_ctx, input, modo) => ({
    id: modo.dryRun ? "preview" : "n1",
    texto: input.texto,
  })),
});

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([...capacidadesDelNucleo, crearNota]);
});

describe("defineCapability", () => {
  it("rechaza ids mal formados y escrituras sin dryRun", () => {
    const base = {
      descripcion: "",
      permiso: null,
      input: z.object({}),
      output: z.object({}),
      handler: async () => ({}),
    };
    expect(() =>
      defineCapability({ ...base, id: "Mal.Id", efecto: "lectura", dryRun: false }),
    ).toThrow(/inválido/);
    expect(() =>
      defineCapability({ ...base, id: "x.y", efecto: "escritura", dryRun: false }),
    ).toThrow(/dryRun/);
  });

  it("rechaza duplicados en el registro", () => {
    expect(() => registrarCapacidades([crearNota])).toThrow(/duplicada/);
  });
});

describe("executeCapability", () => {
  it("devuelve NOT_FOUND para un id inexistente", async () => {
    const r = await executeCapability(contextoFalso(), "core.nada", {});
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("devuelve INVALID_INPUT con issues de Zod", async () => {
    const r = await executeCapability(contextoFalso(["test:write"]), "test.nota.create", {
      texto: "",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(r.ok === false && Array.isArray(r.error.issues)).toBe(true);
  });

  it("devuelve FORBIDDEN sin permiso", async () => {
    const r = await executeCapability(contextoFalso(), "test.nota.create", { texto: "hola" });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("ejecuta core.ping y no audita lecturas", async () => {
    const ctx = contextoFalso();
    const r = await executeCapability(ctx, "core.ping", { mensaje: "hola" });
    expect(r).toMatchObject({ ok: true, data: { pong: true, tenantId: TENANT, mensaje: "hola" } });
    expect(ctx.eventos).toHaveLength(0);
  });

  it("audita escrituras con actor, capacidad y clave de idempotencia", async () => {
    const ctx = contextoFalso(["test:write"]);
    const r = await executeCapability(
      ctx,
      "test.nota.create",
      { texto: "hola" },
      { idempotencyKey: "k1" },
    );
    expect(r).toMatchObject({ ok: true, data: { id: "n1", texto: "hola" }, dryRun: false });
    expect(ctx.eventos).toHaveLength(1);
    expect(ctx.eventos[0]).toMatchObject({
      capability: "test.nota.create",
      actor: { tipo: "agent", id: "grokbot", viaUserId: "carlos" },
      payload: { input: { texto: "hola" }, idempotencyKey: "k1" },
    });
  });

  it("dryRun ejecuta el handler en modo vista previa y no audita", async () => {
    const ctx = contextoFalso(["test:write"]);
    const r = await executeCapability(ctx, "test.nota.create", { texto: "hola" }, { dryRun: true });
    expect(r).toMatchObject({ ok: true, data: { id: "preview" }, dryRun: true });
    expect(ctx.eventos).toHaveLength(0);
  });
});

describe("manejarCapacidadHttp", () => {
  const fabrica = async () => contextoFalso(["test:write"]);

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

  it("mapea errores a códigos HTTP", async () => {
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
    expect([r404.status, r400.status]).toEqual([404, 400]);
  });
});
