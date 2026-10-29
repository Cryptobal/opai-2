import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { defineCapability } from "../src/define";
import { reglaDeNegocio } from "../src/errores";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";

const agente = { tipo: "agent" as const, id: "grokbot", viaUserId: "carlos" };

const lecturaPersonal = defineCapability({
  id: "test.persona.leer",
  descripcion: "Consulta de prueba para auditar el acceso a datos personales.",
  permiso: "test:read",
  input: z.object({ dato: z.string() }),
  output: z.object({ dato: z.string() }),
  efecto: "lectura",
  auditarLectura: () => [],
  dryRun: false,
  async handler(_ctx, input) {
    return input;
  },
});

function ctxCon(permisos: string[] = [], extra: Parameters<typeof contextoDePrueba>[0] = {}) {
  return contextoDePrueba({ permisos, actor: agente, modulosActivos: ["test"], ...extra });
}

const crearNota = defineCapability({
  id: "test.nota.create",
  descripcion: "Crea una nota de prueba y devuelve su id y su texto.",
  permiso: "test:write",
  input: z.object({ texto: z.string().min(1) }),
  output: z.object({ id: z.string(), texto: z.string() }),
  efecto: "escritura",
  dryRun: true,
  handler: vi.fn(async (_ctx, input, modo) => {
    if (input.texto === "regla") throw reglaDeNegocio("No se puede.");
    return { id: modo.dryRun ? "preview" : "n1", texto: input.texto };
  }),
});

/** Como `crearNota`, pero con una escritura real en `ctx.db`: prueba la atomicidad con la auditoría. */
const crearNotaConEvento = defineCapability({
  id: "test.nota.create_con_evento",
  descripcion: "Crea una nota de prueba con un evento real, para probar la atomicidad con auditar.",
  permiso: "test:write",
  input: z.object({ texto: z.string().min(1) }),
  output: z.object({ id: z.string(), texto: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, modo) {
    if (modo.dryRun) return { id: "preview", texto: input.texto };
    if (input.texto === "falla") throw reglaDeNegocio("No se puede.");
    const fila = await ctx.db.evento.create({
      data: { tenantId: ctx.tenantId, tipo: "test.nota.creada", payload: {}, actorTipo: "system" },
    });
    return { id: fila.id, texto: input.texto };
  },
});

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([...capacidadesDelNucleo, crearNota, crearNotaConEvento, lecturaPersonal]);
});

describe("defineCapability", () => {
  it("rechaza ids mal formados y escrituras sin dryRun", () => {
    const base = {
      descripcion: "Capacidad de prueba para validar la declaración.",
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
  it("audita y devuelve la misma salida transformada una sola vez; salida inválida no se revela", async () => {
    let transformaciones = 0;
    const transformada = defineCapability({
      id: "test.lectura.transformada",
      descripcion: "Lectura auditada de prueba con transformación no determinista de salida.",
      permiso: "test:read",
      input: z.object({}),
      output: z.object({}).transform(() => ({ id: String(++transformaciones) })),
      efecto: "lectura",
      dryRun: false,
      auditarLectura: (s) => [s.id],
      handler: async () => ({}),
    });
    const invalida = defineCapability({
      id: "test.lectura.invalida",
      descripcion: "Lectura auditada de prueba que rechaza la validación de su salida.",
      permiso: "test:read",
      input: z.object({}),
      output: z.string().refine(() => false),
      efecto: "lectura",
      dryRun: false,
      auditarLectura: () => [],
      handler: async () => "no revelar",
    });
    registrarCapacidades([transformada, invalida]);
    const { ctx, eventos } = ctxCon(["test:read"]);
    expect(await executeCapability(ctx, transformada.id, {})).toMatchObject({
      ok: true,
      data: { id: "1" },
    });
    expect(transformaciones).toBe(1);
    expect(eventos[0]?.payload).toEqual({ ids: ["1"] });
    expect(await executeCapability(ctx, invalida.id, {})).toMatchObject({
      ok: false,
      error: { code: "INVALID_OUTPUT" },
    });
    expect(eventos).toHaveLength(1);
  });
  it("audita la lectura personal sin contenido y falla cerrada si no puede auditar", async () => {
    const { ctx, eventos } = ctxCon(["test:read"]);
    expect(await executeCapability(ctx, lecturaPersonal.id, { dato: "privado" })).toMatchObject({
      ok: true,
    });
    expect(eventos).toEqual([
      expect.objectContaining({ capability: lecturaPersonal.id, payload: { ids: [] } }),
    ]);
    expect(JSON.stringify(eventos)).not.toContain("privado");
    ctx.auditoria.registrar = async () => {
      throw new Error("auditoría caída");
    };
    expect(await executeCapability(ctx, lecturaPersonal.id, { dato: "privado" })).toMatchObject({
      ok: false,
    });
    expect(
      await executeCapability(ctxCon().ctx, lecturaPersonal.id, { dato: "privado" }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
  it("devuelve NOT_FOUND para un id inexistente", async () => {
    const r = await executeCapability(ctxCon().ctx, "core.nada", {});
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("devuelve INVALID_INPUT con issues de Zod", async () => {
    const r = await executeCapability(ctxCon(["test:write"]).ctx, "test.nota.create", {
      texto: "",
    });
    expect(r).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(r.ok === false && Array.isArray(r.error.issues)).toBe(true);
  });

  it("devuelve FORBIDDEN sin permiso y lo mide con ok: false", async () => {
    const { ctx, usos } = ctxCon();
    const r = await executeCapability(ctx, "test.nota.create", { texto: "hola" });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(usos).toMatchObject([
      {
        capability: "test.nota.create",
        ok: false,
        actorTipo: "agent",
        recurso: "capacidad.ejecucion",
      },
    ]);
  });

  it("FORBIDDEN con 'módulo inactivo' si el módulo no está activo en el tenant", async () => {
    const { ctx } = ctxCon(["test:write"], { modulosActivos: [] });
    const r = await executeCapability(ctx, "test.nota.create", { texto: "hola" });
    expect(r.ok === false && r.error.message).toMatch(/Módulo inactivo/);
  });

  it("respeta los scopes de la key; '*' no incluye plataforma", async () => {
    const sinScope = await executeCapability(
      ctxCon(["test:write"], { scopes: ["core"] }).ctx,
      "test.nota.create",
      { texto: "a" },
    );
    const todo = await executeCapability(
      ctxCon(["test:write"], { scopes: ["*"] }).ctx,
      "test.nota.create",
      { texto: "a" },
    );
    const plataforma = await executeCapability(
      ctxCon([], { scopes: ["*"] }).ctx,
      "platform.tenants.list",
      {},
    );
    expect(sinScope.ok === false && sinScope.error.message).toMatch(/scope/);
    expect(todo.ok).toBe(true);
    expect(plataforma.ok === false && plataforma.error.message).toMatch(/scope "platform"/);
  });

  it("sin tenant solo corren capacidades marcadas sinTenant", async () => {
    const { ctx } = ctxCon(["test:write"], { conTenant: false });
    expect(await executeCapability(ctx, "test.nota.create", { texto: "a" })).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(await executeCapability(ctx, "core.ping", {})).toMatchObject({ ok: true });
  });

  it("ejecuta core.ping, no audita lecturas y mide la ejecución", async () => {
    const { ctx, eventos, usos } = ctxCon();
    const r = await executeCapability(ctx, "core.ping", { mensaje: "hola" });
    expect(r).toMatchObject({
      ok: true,
      data: { pong: true, tenantId: TENANT_DE_PRUEBA, mensaje: "hola" },
    });
    expect(eventos).toHaveLength(0);
    expect(usos).toMatchObject([
      { capability: "core.ping", modulo: "core", ok: true, tenantId: TENANT_DE_PRUEBA },
    ]);
  });

  it("audita escrituras con tenant, actor, capacidad y clave de idempotencia", async () => {
    const { ctx, eventos } = ctxCon(["test:write"]);
    const r = await executeCapability(
      ctx,
      "test.nota.create",
      { texto: "hola" },
      { idempotencyKey: "k1" },
    );
    expect(r).toMatchObject({ ok: true, data: { id: "n1", texto: "hola" }, dryRun: false });
    expect(eventos).toEqual([
      expect.objectContaining({
        tenantId: TENANT_DE_PRUEBA,
        capability: "test.nota.create",
        actor: agente,
        payload: { input: { texto: "hola" }, idempotencyKey: "k1" },
      }),
    ]);
  });

  it("dryRun ejecuta el handler en modo vista previa y no audita", async () => {
    const { ctx, eventos } = ctxCon(["test:write"]);
    const r = await executeCapability(ctx, "test.nota.create", { texto: "hola" }, { dryRun: true });
    expect(r).toMatchObject({ ok: true, data: { id: "preview" }, dryRun: true });
    expect(eventos).toHaveLength(0);
  });

  it("un ErrorCapacidad del handler conserva su código", async () => {
    const r = await executeCapability(ctxCon(["test:write"]).ctx, "test.nota.create", {
      texto: "regla",
    });
    expect(r).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE", message: "No se puede." },
    });
  });

  // ADR-052 (auditoría del 26-oct-2026): el handler y el insert de auditoría comparten una
  // transacción. Un fallo de cualquiera de los dos deja la base exactamente como si no hubiera
  // pasado nada; nunca una escritura sin su auditoría ni una auditoría sin la escritura que la causó.
  it("fallo de auditoría ⇒ sin escritura (la transacción hace rollback)", async () => {
    const { ctx, tabla } = ctxCon(["test:write"]);
    ctx.auditoria.registrar = async () => {
      throw new Error("auditoría caída");
    };
    const r = await executeCapability(ctx, "test.nota.create_con_evento", { texto: "hola" });
    expect(r).toMatchObject({ ok: false, error: { code: "INTERNAL" } });
    expect(tabla("evento")).toHaveLength(0);
  });

  // Regresión del PR #109: un 55P03 (u otro error interno, nunca de negocio) no debe mostrar en la
  // UI el mensaje crudo de Prisma/Postgres (con su SQL y el código de la base); el detalle queda
  // solo en el log del servidor.
  it("un error interno (no de negocio) nunca expone su mensaje crudo", async () => {
    const espía = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { ctx } = ctxCon(["test:write"]);
    const crudo =
      'Invalid `prisma.$queryRaw()` invocation: Raw query failed. Code: `55P03`. ' +
      "Message: `canceling statement due to lock timeout`";
    ctx.auditoria.registrar = async () => {
      throw new Error(crudo);
    };
    const r = await executeCapability(ctx, "test.nota.create_con_evento", { texto: "hola" });
    expect(r).toMatchObject({ ok: false, error: { code: "INTERNAL" } });
    if (!r.ok) {
      expect(r.error.message).not.toMatch(/55P03|prisma|\$queryRaw/i);
      expect(r.error.message).toBe("No pudimos completar la operación. Intenta de nuevo.");
    }
    expect(espía).toHaveBeenCalledWith(
      expect.stringContaining("test.nota.create_con_evento"),
      expect.objectContaining({ message: crudo }),
    );
    espía.mockRestore();
  });

  it("fallo del handler ⇒ sin auditoría (nunca se llega a auditar)", async () => {
    const { ctx, tabla, eventos } = ctxCon(["test:write"]);
    const r = await executeCapability(ctx, "test.nota.create_con_evento", { texto: "falla" });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(tabla("evento")).toHaveLength(0);
    expect(eventos).toHaveLength(0);
  });

  it("escritura y auditoría exitosas quedan juntas (mismo id de entidad)", async () => {
    const { ctx, tabla, eventos } = ctxCon(["test:write"]);
    const r = await executeCapability(ctx, "test.nota.create_con_evento", { texto: "hola" });
    expect(r).toMatchObject({ ok: true, data: { texto: "hola" } });
    expect(tabla("evento")).toHaveLength(1);
    expect(eventos).toHaveLength(1);
  });
});
